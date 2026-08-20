import imageCompression from 'browser-image-compression'
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useImageBatchQueue } from '@/composables/image/useImageBatchQueue'
import { createUniqueFileName, normalizeImageBaseName } from '@/composables/image/fileNaming'
import { getAdaptiveCompressorPixelLimit } from '@/composables/imageSafety'

export const maxCompressImageFiles = 100
export const defaultCompressQuality = 75
export const defaultCompressTargetSizeMb = 1
export const maxCompressImagePixels = 40_000_000
const maxCompressImageFileSize = 25 * 1024 * 1024

export type CompressImageStatus = 'queued' | 'processing' | 'completed' | 'error'
export type CompressionMode = 'quality' | 'target-size'

export interface CompressImageItem {
  id: string
  file: File
  inputPreviewUrl: string
  outputPreviewUrl: string
  outputBlob: Blob | null
  outputBaseName: string
  outputMimeType: 'image/png' | 'image/webp' | 'image/jpeg'
  outputExtension: 'png' | 'webp' | 'jpg'
  cropShape: 'rectangle' | 'circle' | null
  status: CompressImageStatus
  errorMessage: string
}

const supportedTypes = new Set(['image/png', 'image/webp', 'image/jpeg'])

export function getImageMimeType(file: Pick<File, 'name' | 'type'>) {
  if (supportedTypes.has(file.type)) return file.type as CompressImageItem['outputMimeType']
  const extension = file.name.toLocaleLowerCase('en').split('.').pop()
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  return null
}

export function validateCompressImageFile(file: File) {
  if (!getImageMimeType(file)) return 'Format yang didukung hanya PNG, WebP, JPG, dan JPEG.'
  if (file.size > maxCompressImageFileSize) return 'Ukuran file maksimal 25 MB.'
  return null
}

export function prepareCompressImageFiles(files: File[], currentCount: number) {
  const acceptedFiles: File[] = []
  const errors: string[] = []
  const availableSlots = Math.max(0, maxCompressImageFiles - currentCount)
  let skippedByLimit = 0

  for (const file of files) {
    const validationError = validateCompressImageFile(file)
    if (validationError) {
      errors.push(`${file.name}: ${validationError}`)
      continue
    }
    if (acceptedFiles.length >= availableSlots) {
      skippedByLimit += 1
      continue
    }
    acceptedFiles.push(file)
  }

  if (skippedByLimit > 0) {
    errors.push(`Maksimal ${maxCompressImageFiles} file. ${skippedByLimit} file tidak ditambahkan.`)
  }
  return { acceptedFiles, errors }
}

export function createCompressedBaseName(fileName: string) {
  return fileName.replace(/\.(?:png|webp|jpe?g)$/i, '') || 'compressed'
}

export function normalizeCompressedBaseName(fileName: string) {
  return normalizeImageBaseName(fileName.replace(/\.(?:png|webp|jpe?g)$/i, ''), 'compressed')
}

export function normalizeCompressedFileName(baseName: string, extension: string) {
  return `${normalizeCompressedBaseName(baseName)}.${extension}`
}

export function createUniqueCompressedFileName(
  baseName: string,
  extension: string,
  usedFileNames: Set<string>,
) {
  return createUniqueFileName(normalizeCompressedBaseName(baseName), extension, usedFileNames)
}

export function validateCompressImageDimensions(width: number, height: number, maxPixels = maxCompressImagePixels) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'Dimensi gambar tidak valid.'
  }
  if (width * height > maxPixels) return `Resolusi gambar maksimal ${Math.round(maxPixels / 1_000_000)} megapiksel pada perangkat ini.`
  return null
}

function extensionForMimeType(mimeType: CompressImageItem['outputMimeType']) {
  if (mimeType === 'image/jpeg') return 'jpg' as const
  if (mimeType === 'image/webp') return 'webp' as const
  return 'png' as const
}

function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  mimeType: CompressImageItem['outputMimeType'],
  quality: number,
) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Browser tidak dapat membuat hasil crop.'))
          return
        }
        resolve(new File([blob], fileName, { type: mimeType, lastModified: Date.now() }))
      },
      mimeType,
      quality / 100,
    )
  })
}

export function buildCompressionOptions(
  sourceSize: number,
  outputMimeType: CompressImageItem['outputMimeType'],
  selectedQuality: number,
  mode: CompressionMode,
  selectedTargetSizeMb: number,
  signal?: AbortSignal,
) {
  const sourceSizeMb = Math.max(0.01, sourceSize / (1024 * 1024))
  const targetSizeMb = mode === 'target-size'
    ? Math.min(sourceSizeMb, Math.max(0.01, selectedTargetSizeMb))
    : Math.max(0.01, sourceSizeMb * 0.999)

  return {
    maxSizeMB: targetSizeMb,
    initialQuality: mode === 'quality' ? selectedQuality / 100 : 0.92,
    alwaysKeepResolution: mode === 'quality',
    fileType: outputMimeType,
    maxIteration: mode === 'quality' ? 1 : 10,
    useWebWorker: true,
    preserveExif: false,
    signal,
  }
}

export function useImageCompressor() {
  const items = ref<CompressImageItem[]>([])
  const quality = ref(defaultCompressQuality)
  const compressionMode = ref<CompressionMode>('quality')
  const targetSizeMb = ref(defaultCompressTargetSizeMb)
  const isProcessing = ref(false)
  const isDragging = ref(false)
  const errorMessage = ref('')
  let itemSequence = 0
  let processingController: AbortController | null = null
  const adaptiveMaxPixels = getAdaptiveCompressorPixelLimit()

  const { completedCount, failedCount, processedCount, progressPercentage, hasProcessableItems } = useImageBatchQueue(items)

  function revokeUrl(url: string) {
    if (url) URL.revokeObjectURL(url)
  }

  function clearOutput(item: CompressImageItem) {
    revokeUrl(item.outputPreviewUrl)
    item.outputPreviewUrl = ''
    item.outputBlob = null
  }

  async function compressFile(
    source: File,
    outputMimeType: CompressImageItem['outputMimeType'],
    selectedQuality: number,
    mode: CompressionMode,
    selectedTargetSizeMb: number,
    signal?: AbortSignal,
  ) {
    return imageCompression(source, buildCompressionOptions(
      source.size,
      outputMimeType,
      selectedQuality,
      mode,
      selectedTargetSizeMb,
      signal,
    ))
  }

  async function processItem(
    item: CompressImageItem,
    selectedQuality: number,
    mode: CompressionMode,
    selectedTargetSizeMb: number,
    signal: AbortSignal,
  ) {
    clearOutput(item)
    item.status = 'processing'
    item.errorMessage = ''
    let bitmap: ImageBitmap | undefined

    try {
      bitmap = await createImageBitmap(item.file)
      const dimensionError = validateCompressImageDimensions(bitmap.width, bitmap.height, adaptiveMaxPixels)
      if (dimensionError) throw new Error(dimensionError)
      const output = await compressFile(
        item.file,
        item.outputMimeType,
        selectedQuality,
        mode,
        selectedTargetSizeMb,
        signal,
      )
      item.outputBlob = output
      item.outputPreviewUrl = URL.createObjectURL(output)
      item.cropShape = null
      item.status = 'completed'
    } catch (error) {
      item.status = signal.aborted ? 'queued' : 'error'
      item.errorMessage = error instanceof Error ? error.message : 'Gambar tidak dapat dikompres.'
    } finally {
      bitmap?.close()
    }
  }

  async function processAll() {
    if (isProcessing.value || !hasProcessableItems.value) return
    isProcessing.value = true
    errorMessage.value = ''
    const selectedQuality = quality.value
    const selectedMode = compressionMode.value
    const selectedTargetSizeMb = targetSizeMb.value
    const controller = new AbortController()
    processingController = controller
    const queue = items.value.filter(
      (item) => item.status === 'queued' || item.status === 'error',
    )
    try {
      for (const item of queue) {
        if (controller.signal.aborted) break
        await processItem(item, selectedQuality, selectedMode, selectedTargetSizeMb, controller.signal)
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    } finally {
      processingController = null
      isProcessing.value = false
    }
  }

  async function addFiles(files: File[]) {
    if (isProcessing.value || files.length === 0) return
    const { acceptedFiles, errors } = prepareCompressImageFiles(files, items.value.length)
    errorMessage.value = errors.join(' ')
    const newItems = acceptedFiles.map<CompressImageItem>((file) => {
      const outputMimeType = getImageMimeType(file) ?? 'image/png'
      return {
        id: `${Date.now()}-${itemSequence++}`,
        file,
        inputPreviewUrl: URL.createObjectURL(file),
        outputPreviewUrl: '',
        outputBlob: null,
        outputBaseName: createCompressedBaseName(file.name),
        outputMimeType,
        outputExtension: extensionForMimeType(outputMimeType),
        cropShape: null,
        status: 'queued',
        errorMessage: '',
      }
    })
    items.value.push(...newItems)
    if (newItems.length > 0) {
      await nextTick()
      void processAll()
    }
  }

  async function applyCrop(
    itemId: string,
    canvas: HTMLCanvasElement,
    shape: 'rectangle' | 'circle',
  ) {
    if (isProcessing.value) return false
    const item = items.value.find((candidate) => candidate.id === itemId)
    if (!item) return false
    const dimensionError = validateCompressImageDimensions(canvas.width, canvas.height, adaptiveMaxPixels)
    if (dimensionError) {
      item.errorMessage = dimensionError
      return false
    }

    const previousStatus = item.status
    item.status = 'processing'
    item.errorMessage = ''
    isProcessing.value = true
    const controller = new AbortController()
    processingController = controller
    try {
      const outputMimeType = shape === 'circle' ? 'image/png' : (getImageMimeType(item.file) ?? 'image/png')
      const extension = extensionForMimeType(outputMimeType)
      const sourceFile = await canvasToFile(
        canvas,
        `${normalizeCompressedBaseName(item.outputBaseName)}.${extension}`,
        outputMimeType,
        quality.value,
      )
      const output = await compressFile(
        sourceFile,
        outputMimeType,
        quality.value,
        compressionMode.value,
        targetSizeMb.value,
        controller.signal,
      )
      clearOutput(item)
      item.outputBlob = output
      item.outputPreviewUrl = URL.createObjectURL(output)
      item.outputMimeType = outputMimeType
      item.outputExtension = extension
      item.cropShape = shape
      item.status = 'completed'
      return true
    } catch (error) {
      item.status = previousStatus
      item.errorMessage = error instanceof Error ? error.message : 'Hasil crop tidak dapat dikompres.'
      return false
    } finally {
      processingController = null
      isProcessing.value = false
    }
  }

  function cancelProcessing() {
    processingController?.abort()
  }

  function removeItem(id: string) {
    if (isProcessing.value) return
    const index = items.value.findIndex((item) => item.id === id)
    if (index === -1) return
    const [item] = items.value.splice(index, 1)
    if (!item) return
    revokeUrl(item.inputPreviewUrl)
    revokeUrl(item.outputPreviewUrl)
  }

  function reset() {
    if (isProcessing.value) return
    for (const item of items.value) {
      revokeUrl(item.inputPreviewUrl)
      revokeUrl(item.outputPreviewUrl)
    }
    items.value = []
    errorMessage.value = ''
  }

  onBeforeUnmount(() => {
    processingController?.abort()
    for (const item of items.value) {
      revokeUrl(item.inputPreviewUrl)
      revokeUrl(item.outputPreviewUrl)
    }
  })

  return {
    items,
    adaptiveMaxPixels,
    quality,
    compressionMode,
    targetSizeMb,
    isProcessing,
    isDragging,
    errorMessage,
    completedCount,
    failedCount,
    processedCount,
    progressPercentage,
    hasProcessableItems,
    addFiles,
    processAll,
    cancelProcessing,
    applyCrop,
    removeItem,
    reset,
  }
}
