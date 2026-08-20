import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import { getAdaptiveImageTransformPixelLimit, supportsOffscreenImageProcessing } from '@/composables/imageSafety'
import { createUniqueFileName, normalizeImageBaseName } from '@/composables/image/fileNaming'
import { validateImageDimensions, validateImageFile } from '@/composables/image/imageValidation'
import { useImageBatchQueue } from '@/composables/image/useImageBatchQueue'
import { useObjectUrlPool } from '@/composables/image/useObjectUrlPool'
import { createImageTransformWorkerClient, type ImageFitMode, type ImageTransformFormat, type ImageTransformInput } from '@/composables/image/imageTransformWorker'

export type ImageTransformStatus = 'queued' | 'processing' | 'completed' | 'error'
export type ImageResizeMode = 'dimensions' | 'percentage'

export interface ImageTransformItem {
  id: string
  file: File
  sourceBlob: Blob
  inputPreviewUrl: string
  cropPreviewUrl: string
  outputPreviewUrl: string
  outputBlob: Blob | null
  outputFileName: string
  originalWidth: number
  originalHeight: number
  sourceWidth: number
  sourceHeight: number
  outputWidth: number
  outputHeight: number
  cropped: boolean
  status: ImageTransformStatus
  errorMessage: string
}

export interface ImageTransformSettings {
  resizeEnabled: boolean
  resizeMode: ImageResizeMode
  width: number
  height: number
  percentage: number
  fit: ImageFitMode
  format: ImageTransformFormat
  quality: number
  stripMetadata: boolean
}

export const imageTransformFormats: { value: ImageTransformFormat; label: string; extension: string }[] = [
  { value: 'png', label: 'PNG', extension: 'png' },
  { value: 'jpeg', label: 'JPEG', extension: 'jpg' },
  { value: 'webp', label: 'WebP', extension: 'webp' },
  { value: 'avif', label: 'AVIF', extension: 'avif' },
]
export const imageTransformPresets = [
  { label: 'Full HD', width: 1920, height: 1080 },
  { label: 'Square', width: 1080, height: 1080 },
  { label: 'Portrait', width: 1080, height: 1350 },
  { label: 'Social', width: 1200, height: 630 },
]
export const maxImageTransformFiles = 100
const maxFileBytes = 25 * 1024 * 1024
const acceptedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'] as const
const acceptedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'avif'] as const

export function imageFormatExtension(format: ImageTransformFormat) {
  return imageTransformFormats.find((option) => option.value === format)?.extension ?? format
}

export function imageBaseName(fileName: string) {
  return normalizeImageBaseName(fileName.replace(/\.(?:png|jpe?g|webp|avif)$/i, ''), 'converted')
}

export function resolveImageTransformDimensions(item: Pick<ImageTransformItem, 'sourceWidth' | 'sourceHeight'>, settings: Pick<ImageTransformSettings, 'resizeEnabled' | 'resizeMode' | 'width' | 'height' | 'percentage'>) {
  if (!settings.resizeEnabled) return { width: item.sourceWidth, height: item.sourceHeight }
  if (settings.resizeMode === 'percentage') {
    const percentage = Number(settings.percentage)
    if (!Number.isFinite(percentage) || percentage < 1 || percentage > 500) throw new Error('Persentase resize harus antara 1 dan 500.')
    return { width: Math.max(1, Math.round(item.sourceWidth * percentage / 100)), height: Math.max(1, Math.round(item.sourceHeight * percentage / 100)) }
  }
  if (!Number.isSafeInteger(settings.width) || !Number.isSafeInteger(settings.height) || settings.width < 1 || settings.height < 1) throw new Error('Width dan height harus berupa pixel integer positif.')
  return { width: settings.width, height: settings.height }
}

export function calculateImageFitRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, fit: ImageFitMode) {
  if (fit === 'stretch') return { x: 0, y: 0, width: targetWidth, height: targetHeight }
  const scale = fit === 'contain' ? Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight) : Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height }
}

async function readDimensions(source: Blob, maxPixels: number) {
  const bitmap = await createImageBitmap(source)
  try {
    const error = validateImageDimensions(bitmap.width, bitmap.height, maxPixels)
    if (error) throw new Error(error)
    return { width: bitmap.width, height: bitmap.height }
  } finally { bitmap.close() }
}

async function transformOnMainThread(input: ImageTransformInput, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Pemrosesan gambar dibatalkan.', 'AbortError')
  const bitmap = await createImageBitmap(input.source)
  try {
    const sourceError = validateImageDimensions(bitmap.width, bitmap.height, input.maxPixels, 'sumber')
    const outputError = validateImageDimensions(input.width, input.height, input.maxPixels, 'output')
    if (sourceError || outputError) throw new Error(sourceError ?? outputError ?? 'Dimensi tidak valid.')
    const canvas = document.createElement('canvas')
    canvas.width = input.width
    canvas.height = input.height
    const context = canvas.getContext('2d', { willReadFrequently: input.format === 'avif', alpha: input.format !== 'jpeg' })
    if (!context) throw new Error('Browser tidak dapat membuat canvas output.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    if (input.format === 'jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, input.width, input.height) }
    const rect = calculateImageFitRect(bitmap.width, bitmap.height, input.width, input.height, input.fit)
    context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height)
    if (signal?.aborted) throw new DOMException('Pemrosesan gambar dibatalkan.', 'AbortError')
    if (input.format === 'avif') {
      const { default: encode } = await import('@jsquash/avif/encode.js')
      const buffer = await encode(context.getImageData(0, 0, input.width, input.height), { quality: input.quality, speed: 6 })
      return new Blob([buffer], { type: 'image/avif' })
    }
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Browser gagal membuat gambar output.')), `image/${input.format}`, input.quality / 100))
  } finally { bitmap.close() }
}

export function useImageTransform(settings: Ref<ImageTransformSettings>) {
  const items = ref<ImageTransformItem[]>([])
  const isProcessing = ref(false)
  const isDragging = ref(false)
  const errorMessage = ref('')
  const urls = useObjectUrlPool()
  const maxPixels = getAdaptiveImageTransformPixelLimit()
  const queue = useImageBatchQueue(items)
  let sequence = 0
  let controller: AbortController | null = null

  const allCompleted = computed(() => items.value.length > 0 && items.value.every((item) => item.status === 'completed'))

  function clearOutput(item: ImageTransformItem) {
    urls.revoke(item.outputPreviewUrl)
    item.outputPreviewUrl = ''
    item.outputBlob = null
    item.outputFileName = ''
    item.outputWidth = 0
    item.outputHeight = 0
  }

  async function addFiles(files: File[]) {
    if (isProcessing.value) return
    const slots = Math.max(0, maxImageTransformFiles - items.value.length)
    const incoming = files.slice(0, slots)
    const errors: string[] = []
    for (const file of incoming) {
      const validation = validateImageFile(file, { mimeTypes: acceptedMimeTypes, extensions: acceptedExtensions, maxBytes: maxFileBytes, maxPixels })
      if (validation) { errors.push(`${file.name}: ${validation}`); continue }
      try {
        const dimensions = await readDimensions(file, maxPixels)
        const preview = urls.create(file)
        items.value.push({
          id: `${Date.now()}-${sequence++}`,
          file,
          sourceBlob: file,
          inputPreviewUrl: preview,
          cropPreviewUrl: '',
          outputPreviewUrl: '',
          outputBlob: null,
          outputFileName: '',
          originalWidth: dimensions.width,
          originalHeight: dimensions.height,
          sourceWidth: dimensions.width,
          sourceHeight: dimensions.height,
          outputWidth: 0,
          outputHeight: 0,
          cropped: false,
          status: 'queued',
          errorMessage: '',
        })
      } catch (error) { errors.push(`${file.name}: ${error instanceof Error ? error.message : 'gambar tidak dapat dibaca.'}`) }
    }
    if (files.length > slots) errors.push(`Maksimal ${maxImageTransformFiles} file per batch.`)
    errorMessage.value = errors.join(' ')
  }

  function invalidateOutputs() {
    if (isProcessing.value) return
    for (const item of items.value) { clearOutput(item); item.status = 'queued'; item.errorMessage = '' }
  }

  function removeItem(id: string) {
    if (isProcessing.value) return
    const index = items.value.findIndex((item) => item.id === id)
    const [item] = index >= 0 ? items.value.splice(index, 1) : []
    if (!item) return
    urls.revoke(item.inputPreviewUrl)
    urls.revoke(item.cropPreviewUrl)
    urls.revoke(item.outputPreviewUrl)
  }

  function applyCrop(id: string, blob: Blob, width: number, height: number) {
    const item = items.value.find((candidate) => candidate.id === id)
    if (!item || isProcessing.value) return
    const error = validateImageDimensions(width, height, maxPixels, 'crop')
    if (error) throw new Error(error)
    urls.revoke(item.cropPreviewUrl)
    item.cropPreviewUrl = urls.create(blob)
    item.sourceBlob = blob
    item.sourceWidth = width
    item.sourceHeight = height
    item.cropped = true
    clearOutput(item)
    item.status = 'queued'
  }

  function resetCrop(id: string) {
    const item = items.value.find((candidate) => candidate.id === id)
    if (!item || isProcessing.value || !item.cropped) return
    urls.revoke(item.cropPreviewUrl)
    item.cropPreviewUrl = ''
    item.sourceBlob = item.file
    item.sourceWidth = item.originalWidth
    item.sourceHeight = item.originalHeight
    item.cropped = false
    clearOutput(item)
    item.status = 'queued'
  }

  async function processAll() {
    if (isProcessing.value || !queue.hasProcessableItems.value) return
    isProcessing.value = true
    errorMessage.value = ''
    const activeController = new AbortController()
    controller = activeController
    const workerClient = supportsOffscreenImageProcessing() ? createImageTransformWorkerClient() : undefined
    const usedNames = new Set<string>()
    for (const existing of items.value) if (existing.outputFileName) usedNames.add(existing.outputFileName.toLocaleLowerCase('en'))
    try {
      for (const item of items.value.filter((candidate) => candidate.status === 'queued' || candidate.status === 'error')) {
        if (activeController.signal.aborted) break
        clearOutput(item)
        item.status = 'processing'
        item.errorMessage = ''
        try {
          const dimensions = resolveImageTransformDimensions(item, settings.value)
          const dimensionError = validateImageDimensions(dimensions.width, dimensions.height, maxPixels, 'output')
          if (dimensionError) throw new Error(dimensionError)
          const format = settings.value.format
          const input: ImageTransformInput = { source: item.sourceBlob, width: dimensions.width, height: dimensions.height, fit: settings.value.fit, format, quality: settings.value.quality, maxPixels }
          const sameFormat = item.file.type === `image/${format}` || (format === 'jpeg' && item.file.type === 'image/jpg')
          const canPreserveOriginal = !settings.value.stripMetadata && !item.cropped && !settings.value.resizeEnabled && sameFormat
          const output = canPreserveOriginal ? item.file : workerClient ? await workerClient.transform(input, activeController.signal) : await transformOnMainThread(input, activeController.signal)
          item.outputBlob = output
          item.outputPreviewUrl = urls.create(output)
          item.outputWidth = dimensions.width
          item.outputHeight = dimensions.height
          item.outputFileName = createUniqueFileName(imageBaseName(item.file.name), imageFormatExtension(format), usedNames)
          item.status = 'completed'
        } catch (error) {
          item.status = error instanceof DOMException && error.name === 'AbortError' ? 'queued' : 'error'
          item.errorMessage = error instanceof Error ? error.message : 'Gambar gagal diproses.'
        }
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    } finally {
      workerClient?.terminate()
      controller = null
      isProcessing.value = false
    }
  }

  function cancelProcessing() { controller?.abort() }
  function reset() {
    if (isProcessing.value) return
    urls.clear()
    items.value = []
    errorMessage.value = ''
  }

  onBeforeUnmount(() => { controller?.abort(); urls.clear() })
  return { items, isProcessing, isDragging, errorMessage, maxPixels, allCompleted, ...queue, addFiles, invalidateOutputs, removeItem, applyCrop, resetCrop, processAll, cancelProcessing, reset }
}
