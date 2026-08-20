import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import {
  maxPngFiles,
  preparePngFiles,
  validateImageDimensions,
} from '@/composables/usePngToAvif'

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
  const withoutExtension = fileName.replace(/\.webp$/i, '')
  const withoutControlCharacters = Array.from(withoutExtension)
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
  const safeBaseName = withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 180)

  return safeBaseName || 'converted'
}

export function normalizeWebpFileName(fileName: string) {
  return `${normalizeWebpBaseName(fileName)}.webp`
}

export function createUniqueWebpFileName(fileName: string, usedFileNames: Set<string>) {
  const normalizedFileName = normalizeWebpFileName(fileName)
  const normalizedKey = normalizedFileName.toLocaleLowerCase('en')
  if (!usedFileNames.has(normalizedKey)) {
    usedFileNames.add(normalizedKey)
    return normalizedFileName
  }

  const baseName = normalizedFileName.replace(/\.webp$/i, '')
  let suffix = 2
  let uniqueFileName = `${baseName}-${suffix}.webp`
  while (usedFileNames.has(uniqueFileName.toLocaleLowerCase('en'))) {
    suffix += 1
    uniqueFileName = `${baseName}-${suffix}.webp`
  }
  usedFileNames.add(uniqueFileName.toLocaleLowerCase('en'))
  return uniqueFileName
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

  const completedCount = computed(
    () => items.value.filter((item) => item.status === 'completed').length,
  )
  const failedCount = computed(() => items.value.filter((item) => item.status === 'error').length)
  const processedCount = computed(() => completedCount.value + failedCount.value)
  const progressPercentage = computed(() =>
    items.value.length === 0 ? 0 : Math.round((processedCount.value / items.value.length) * 100),
  )
  const hasProcessableItems = computed(() =>
    items.value.some((item) => item.status === 'queued' || item.status === 'error'),
  )

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

  async function convertItem(item: PngToWebpItem, selectedQuality: number) {
    clearItemOutput(item)
    item.status = 'processing'
    item.errorMessage = ''
    let bitmap: ImageBitmap | undefined

    try {
      bitmap = await createImageBitmap(item.file)
      const dimensionError = validateImageDimensions(bitmap.width, bitmap.height)
      if (dimensionError) throw new Error(dimensionError)

      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Browser tidak dapat membaca gambar ini.')
      context.drawImage(bitmap, 0, 0)

      item.outputBlob = await canvasToWebpBlob(canvas, selectedQuality)
      item.outputPreviewUrl = URL.createObjectURL(item.outputBlob)
      item.status = 'completed'
    } catch (error) {
      item.status = 'error'
      item.errorMessage =
        error instanceof Error ? error.message : 'Konversi gagal. Silakan coba file PNG lain.'
    } finally {
      bitmap?.close()
    }
  }

  async function convertAll() {
    if (isConverting.value || !hasProcessableItems.value) return
    errorMessage.value = ''
    isConverting.value = true
    const selectedQuality = quality.value
    const queue = items.value.filter(
      (item) => item.status === 'queued' || item.status === 'error',
    )

    try {
      for (const item of queue) {
        await convertItem(item, selectedQuality)
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    } finally {
      isConverting.value = false
    }
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
    for (const item of items.value) {
      revokeUrl(item.inputPreviewUrl)
      revokeUrl(item.outputPreviewUrl)
    }
  })

  return {
    items,
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
    reset,
  }
}
