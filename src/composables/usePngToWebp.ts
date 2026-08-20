import { nextTick, onBeforeUnmount, ref } from 'vue'
import {
  maxPngFiles,
  preparePngFiles,
} from '@/composables/usePngToAvif'
import { createUniqueFileName, normalizeImageBaseName } from '@/composables/image/fileNaming'
import { validateImageDimensions } from '@/composables/image/imageValidation'
import { encodeWebpInWorker } from '@/composables/image/imageWorker'
import { useImageBatchQueue } from '@/composables/image/useImageBatchQueue'
import { getAdaptiveWebpPixelLimit, supportsOffscreenImageProcessing } from '@/composables/imageSafety'

export const defaultWebpQuality = 82
export { maxPngFiles as maxPngToWebpFiles }

export type PngToWebpStatus = 'queued' | 'processing' | 'completed' | 'error'

export interface PngToWebpItem {
  id: string
  file: File
  inputPreviewUrl: string
  outputPreviewUrl: string
  outputBlob: Blob | null
  outputBaseName: string
  status: PngToWebpStatus
  errorMessage: string
}

export function createWebpBaseName(fileName: string) {
  return fileName.replace(/\.png$/i, '') || 'converted'
}

export function normalizeWebpBaseName(fileName: string) {
  return normalizeImageBaseName(fileName.replace(/\.webp$/i, ''), 'converted')
}

export function normalizeWebpFileName(fileName: string) {
  return `${normalizeWebpBaseName(fileName)}.webp`
}

export function createUniqueWebpFileName(fileName: string, usedFileNames: Set<string>) {
  return createUniqueFileName(normalizeWebpBaseName(fileName), 'webp', usedFileNames)
}

export function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number) {
  if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
    return Promise.reject(new Error('Kualitas WebP harus antara 1% dan 100%.'))
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Browser tidak dapat membuat file WebP.'))
          return
        }
        if (blob.type !== 'image/webp') {
          reject(new Error('Browser ini tidak mendukung encoder WebP.'))
          return
        }
        resolve(blob)
      },
      'image/webp',
      quality / 100,
    )
  })
}

export function usePngToWebp() {
  const items = ref<PngToWebpItem[]>([])
  const quality = ref(defaultWebpQuality)
  const isConverting = ref(false)
  const isDragging = ref(false)
  const errorMessage = ref('')
  let itemSequence = 0
  let conversionController: AbortController | null = null
  const adaptiveMaxPixels = getAdaptiveWebpPixelLimit()

  const { completedCount, failedCount, processedCount, progressPercentage, hasProcessableItems } = useImageBatchQueue(items)

  function revokeUrl(url: string) {
    if (url) URL.revokeObjectURL(url)
  }

  function clearItemOutput(item: PngToWebpItem) {
    revokeUrl(item.outputPreviewUrl)
    item.outputPreviewUrl = ''
    item.outputBlob = null
  }

  async function addFiles(files: File[]) {
    if (isConverting.value || files.length === 0) return
    const { acceptedFiles, errors } = preparePngFiles(files, items.value.length)
    errorMessage.value = errors.join(' ')
    const newItems = acceptedFiles.map<PngToWebpItem>((file) => ({
      id: `${Date.now()}-${itemSequence++}`,
      file,
      inputPreviewUrl: URL.createObjectURL(file),
      outputPreviewUrl: '',
      outputBlob: null,
      outputBaseName: createWebpBaseName(file.name),
      status: 'queued',
      errorMessage: '',
    }))
    items.value.push(...newItems)

    if (newItems.length > 0) {
      await nextTick()
      void convertAll()
    }
  }

  function removeItem(id: string) {
    if (isConverting.value) return
    const index = items.value.findIndex((item) => item.id === id)
    if (index === -1) return
    const [item] = items.value.splice(index, 1)
    if (!item) return
    revokeUrl(item.inputPreviewUrl)
    revokeUrl(item.outputPreviewUrl)
  }

  async function encodeSource(source: Blob, selectedQuality: number, signal?: AbortSignal) {
    if (supportsOffscreenImageProcessing()) return encodeWebpInWorker({ source, quality: selectedQuality, maxPixels: adaptiveMaxPixels }, signal)
    const bitmap = await createImageBitmap(source)
    try {
      const dimensionError = validateImageDimensions(bitmap.width, bitmap.height, adaptiveMaxPixels, 'PNG')
      if (dimensionError) throw new Error(dimensionError)
      if (signal?.aborted) throw new DOMException('Konversi WebP dibatalkan.', 'AbortError')
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Browser tidak dapat membaca gambar ini.')
      context.drawImage(bitmap, 0, 0)
      const blob = await canvasToWebpBlob(canvas, selectedQuality)
      if (signal?.aborted) throw new DOMException('Konversi WebP dibatalkan.', 'AbortError')
      return blob
    } finally { bitmap.close() }
  }

  async function convertItem(item: PngToWebpItem, selectedQuality: number, signal?: AbortSignal) {
    clearItemOutput(item)
    item.status = 'processing'
    item.errorMessage = ''
    try {
      item.outputBlob = await encodeSource(item.file, selectedQuality, signal)
      item.outputPreviewUrl = URL.createObjectURL(item.outputBlob)
      item.status = 'completed'
    } catch (error) {
      item.status = error instanceof DOMException && error.name === 'AbortError' ? 'queued' : 'error'
      item.errorMessage =
        error instanceof Error ? error.message : 'Konversi gagal. Silakan coba file PNG lain.'
    }
  }

  async function convertAll() {
    if (isConverting.value || !hasProcessableItems.value) return
    errorMessage.value = ''
    isConverting.value = true
    const controller = new AbortController()
    conversionController = controller
    const selectedQuality = quality.value
    const queue = items.value.filter(
      (item) => item.status === 'queued' || item.status === 'error',
    )

    try {
      for (const item of queue) {
        if (controller.signal.aborted) break
        await convertItem(item, selectedQuality, controller.signal)
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    } finally {
      conversionController = null
      isConverting.value = false
    }
  }

  function cancelConversion() {
    conversionController?.abort()
  }

  function reset() {
    if (isConverting.value) return
    for (const item of items.value) {
      revokeUrl(item.inputPreviewUrl)
      revokeUrl(item.outputPreviewUrl)
    }
    items.value = []
    errorMessage.value = ''
  }

  onBeforeUnmount(() => {
    conversionController?.abort()
    for (const item of items.value) {
      revokeUrl(item.inputPreviewUrl)
      revokeUrl(item.outputPreviewUrl)
    }
  })

  return {
    items,
    adaptiveMaxPixels,
    quality,
    isConverting,
    isDragging,
    errorMessage,
    completedCount,
    failedCount,
    processedCount,
    progressPercentage,
    hasProcessableItems,
    addFiles,
    removeItem,
    convertAll,
    cancelConversion,
    reset,
  }
}
