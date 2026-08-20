import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const maxFileSize = 25 * 1024 * 1024
const maxPixels = 40_000_000
export const maxPngFiles = 100
export const defaultAvifQuality = 38

export type PngConversionStatus = 'queued' | 'processing' | 'completed' | 'error'

export interface PngConversionItem {
  id: string
  file: File
  inputPreviewUrl: string
  outputPreviewUrl: string
  outputBlob: Blob | null
  outputBaseName: string
  isCropped: boolean
  status: PngConversionStatus
  errorMessage: string
}

interface PreparedPngFiles {
  acceptedFiles: File[]
  errors: string[]
}

export function validatePngFile(file: File) {
  const hasPngType = file.type === 'image/png'
  const hasPngExtension = file.name.toLocaleLowerCase('en').endsWith('.png')

  if (!hasPngType && !hasPngExtension) return 'Pilih file dengan format PNG.'
  if (file.size > maxFileSize) return 'Ukuran file maksimal 25 MB.'
  return null
}

export function preparePngFiles(files: File[], currentCount: number): PreparedPngFiles {
  const acceptedFiles: File[] = []
  const errors: string[] = []
  let skippedByLimit = 0
  const availableSlots = Math.max(0, maxPngFiles - currentCount)

  for (const file of files) {
    const validationError = validatePngFile(file)
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
    errors.push(`Maksimal ${maxPngFiles} file. ${skippedByLimit} file tidak ditambahkan.`)
  }

  return { acceptedFiles, errors }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function createAvifBaseName(fileName: string) {
  return fileName.replace(/\.png$/i, '') || 'converted'
}

export function createAvifFileName(fileName: string) {
  return `${createAvifBaseName(fileName)}.avif`
}

export function normalizeAvifBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.avif$/i, '')
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

export function normalizeAvifFileName(fileName: string) {
  return `${normalizeAvifBaseName(fileName)}.avif`
}

export function createUniqueAvifFileName(fileName: string, usedFileNames: Set<string>) {
  const normalizedFileName = normalizeAvifFileName(fileName)
  const normalizedKey = normalizedFileName.toLocaleLowerCase('en')
  if (!usedFileNames.has(normalizedKey)) {
    usedFileNames.add(normalizedKey)
    return normalizedFileName
  }

  const baseName = normalizedFileName.replace(/\.avif$/i, '')
  let suffix = 2
  let uniqueFileName = `${baseName}-${suffix}.avif`
  while (usedFileNames.has(uniqueFileName.toLocaleLowerCase('en'))) {
    suffix += 1
    uniqueFileName = `${baseName}-${suffix}.avif`
  }

  usedFileNames.add(uniqueFileName.toLocaleLowerCase('en'))
  return uniqueFileName
}

export function calculateSavedPercentage(inputSize: number, outputSize: number) {
  if (inputSize === 0) return null
  return Math.round((1 - outputSize / inputSize) * 100)
}

export function validateImageDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'Area crop tidak valid.'
  }
  if (width * height > maxPixels) return 'Resolusi gambar maksimal 40 megapiksel.'
  return null
}

export function usePngToAvif() {
  const items = ref<PngConversionItem[]>([])
  const quality = ref(defaultAvifQuality)
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

  function clearItemOutput(item: PngConversionItem) {
    revokeUrl(item.outputPreviewUrl)
    item.outputPreviewUrl = ''
    item.outputBlob = null
  }

  async function addFiles(files: File[]) {
    if (isConverting.value || files.length === 0) return

    const { acceptedFiles, errors } = preparePngFiles(files, items.value.length)
    errorMessage.value = errors.join(' ')

    const newItems = acceptedFiles.map<PngConversionItem>((file) => ({
      id: `${Date.now()}-${itemSequence++}`,
      file,
      inputPreviewUrl: URL.createObjectURL(file),
      outputPreviewUrl: '',
      outputBlob: null,
      outputBaseName: createAvifBaseName(file.name),
      isCropped: false,
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
    const itemIndex = items.value.findIndex((item) => item.id === id)
    if (itemIndex === -1) return

    const [item] = items.value.splice(itemIndex, 1)
    if (!item) return
    revokeUrl(item.inputPreviewUrl)
    revokeUrl(item.outputPreviewUrl)
  }

  async function convertItem(
    item: PngConversionItem,
    encode: (data: ImageData, options: { quality: number; speed: number }) => Promise<ArrayBuffer>,
    selectedQuality: number,
  ) {
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
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Browser tidak dapat membaca gambar ini.')

      context.drawImage(bitmap, 0, 0)
      const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height)
      const encoded = await encode(imageData, { quality: selectedQuality, speed: 6 })

      item.outputBlob = new Blob([encoded], { type: 'image/avif' })
      item.outputPreviewUrl = URL.createObjectURL(item.outputBlob)
      item.isCropped = false
      item.status = 'completed'
    } catch (error) {
      item.status = 'error'
      item.errorMessage =
        error instanceof Error ? error.message : 'Konversi gagal. Silakan coba file PNG lain.'
    } finally {
      bitmap?.close()
    }
  }

  async function applyCrop(itemId: string, canvas: HTMLCanvasElement) {
    if (isConverting.value) return false

    const item = items.value.find((candidate) => candidate.id === itemId)
    if (!item) return false

    const dimensionError = validateImageDimensions(canvas.width, canvas.height)
    if (dimensionError) {
      item.errorMessage = dimensionError
      return false
    }

    const previousStatus = item.status
    item.status = 'processing'
    item.errorMessage = ''
    isConverting.value = true

    try {
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Browser tidak dapat membaca hasil crop.')

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const { default: encode } = await import('@jsquash/avif/encode.js')
      const encoded = await encode(imageData, { quality: quality.value, speed: 6 })
      const outputBlob = new Blob([encoded], { type: 'image/avif' })

      clearItemOutput(item)
      item.outputBlob = outputBlob
      item.outputPreviewUrl = URL.createObjectURL(outputBlob)
      item.isCropped = true
      item.status = 'completed'
      return true
    } catch (error) {
      item.status = previousStatus
      item.errorMessage =
        error instanceof Error ? error.message : 'Hasil crop tidak dapat dikonversi ke AVIF.'
      return false
    } finally {
      isConverting.value = false
    }
  }

  async function convertAll() {
    if (isConverting.value || !hasProcessableItems.value) return

    errorMessage.value = ''
    isConverting.value = true
    const selectedQuality = quality.value

    try {
      const { default: encode } = await import('@jsquash/avif/encode.js')
      const queue = items.value.filter(
        (item) => item.status === 'queued' || item.status === 'error',
      )

      for (const item of queue) {
        await convertItem(item, encode, selectedQuality)
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Encoder AVIF tidak dapat dimuat oleh browser.'
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
    applyCrop,
    reset,
  }
}
