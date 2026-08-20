import imageCompression from 'browser-image-compression'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

export const maxCompressImageFiles = 100
export const defaultCompressQuality = 75
export const maxCompressImagePixels = 40_000_000
const maxCompressImageFileSize = 25 * 1024 * 1024

export type CompressImageStatus = 'queued' | 'processing' | 'completed' | 'error'

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
  const withoutExtension = fileName.replace(/\.(?:png|webp|jpe?g)$/i, '')
  const withoutControlCharacters = Array.from(withoutExtension)
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
  const safeBaseName = withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 180)
  return safeBaseName || 'compressed'
}

export function normalizeCompressedFileName(baseName: string, extension: string) {
  return `${normalizeCompressedBaseName(baseName)}.${extension}`
}

export function createUniqueCompressedFileName(
  baseName: string,
  extension: string,
  usedFileNames: Set<string>,
) {
  const normalizedBaseName = normalizeCompressedBaseName(baseName)
  let fileName = `${normalizedBaseName}.${extension}`
  let suffix = 2
  while (usedFileNames.has(fileName.toLocaleLowerCase('en'))) {
    fileName = `${normalizedBaseName}-${suffix}.${extension}`
    suffix += 1
  }
  usedFileNames.add(fileName.toLocaleLowerCase('en'))
  return fileName
}

export function validateCompressImageDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'Dimensi gambar tidak valid.'
  }
  if (width * height > maxCompressImagePixels) return 'Resolusi gambar maksimal 40 megapiksel.'
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

export function useImageCompressor() {
  const items = ref<CompressImageItem[]>([])
  const quality = ref(defaultCompressQuality)
  const isProcessing = ref(false)
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

  function clearOutput(item: CompressImageItem) {
    revokeUrl(item.outputPreviewUrl)
    item.outputPreviewUrl = ''
    item.outputBlob = null
  }

  async function compressFile(
    source: File,
    outputMimeType: CompressImageItem['outputMimeType'],
    selectedQuality: number,
  ) {
    const targetSizeMb = Math.max(0.01, (source.size / (1024 * 1024)) * (selectedQuality / 100))
    return imageCompression(source, {
      maxSizeMB: targetSizeMb,
      initialQuality: selectedQuality / 100,
      alwaysKeepResolution: true,
      fileType: outputMimeType,
      maxIteration: 10,
      useWebWorker: false,
      preserveExif: false,
    })
  }

  async function processItem(item: CompressImageItem, selectedQuality: number) {
    clearOutput(item)
    item.status = 'processing'
    item.errorMessage = ''
    let bitmap: ImageBitmap | undefined

    try {
      bitmap = await createImageBitmap(item.file)
      const dimensionError = validateCompressImageDimensions(bitmap.width, bitmap.height)
      if (dimensionError) throw new Error(dimensionError)
      const output = await compressFile(item.file, item.outputMimeType, selectedQuality)
      item.outputBlob = output
      item.outputPreviewUrl = URL.createObjectURL(output)
      item.cropShape = null
      item.status = 'completed'
    } catch (error) {
      item.status = 'error'
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
    const queue = items.value.filter(
      (item) => item.status === 'queued' || item.status === 'error',
    )
    try {
      for (const item of queue) {
        await processItem(item, selectedQuality)
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    } finally {
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
    const dimensionError = validateCompressImageDimensions(canvas.width, canvas.height)
    if (dimensionError) {
      item.errorMessage = dimensionError
      return false
    }

    const previousStatus = item.status
    item.status = 'processing'
    item.errorMessage = ''
    isProcessing.value = true
    try {
      const outputMimeType = shape === 'circle' ? 'image/png' : (getImageMimeType(item.file) ?? 'image/png')
      const extension = extensionForMimeType(outputMimeType)
      const sourceFile = await canvasToFile(
        canvas,
        `${normalizeCompressedBaseName(item.outputBaseName)}.${extension}`,
        outputMimeType,
        quality.value,
      )
      const output = await compressFile(sourceFile, outputMimeType, quality.value)
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
      isProcessing.value = false
    }
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
    for (const item of items.value) {
      revokeUrl(item.inputPreviewUrl)
      revokeUrl(item.outputPreviewUrl)
    }
  })

  return {
    items,
    quality,
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
    applyCrop,
    removeItem,
    reset,
  }
}
