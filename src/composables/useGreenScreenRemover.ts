import { nextTick, onBeforeUnmount, ref } from 'vue'
import { getAdaptiveGreenScreenPixelLimit, supportsOffscreenImageProcessing } from '@/composables/imageSafety'
import { processGreenScreenInWorker } from '@/composables/image/imageWorker'
import { useImageBatchQueue } from '@/composables/image/useImageBatchQueue'
import { createUniqueFileName, normalizeImageBaseName } from '@/composables/image/fileNaming'

const maxFileSize = 25 * 1024 * 1024
export const maxGreenScreenPixels = 40_000_000
export const maxGreenScreenFiles = 100
export const defaultGreenTolerance = 55
export const defaultEdgeSoftness = 100

export type GreenScreenStatus = 'queued' | 'processing' | 'completed' | 'error'
export type GreenScreenProcessingMode = 'automatic' | 'settings' | 'editor' | null

export interface RgbColor {
  red: number
  green: number
  blue: number
}

export interface GreenScreenItem {
  id: string
  file: File
  inputPreviewUrl: string
  outputPreviewUrl: string
  outputBlob: Blob | null
  outputBaseName: string
  editSourceBlob: Blob | null
  editSourcePreviewUrl: string
  keyColor: RgbColor
  isEdited: boolean
  status: GreenScreenStatus
  errorMessage: string
}

interface PreparedImageFiles {
  acceptedFiles: File[]
  errors: string[]
}

const supportedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif'])

export function validateGreenScreenFile(file: File) {
  const supportedExtension = /\.(png|jpe?g|webp|avif)$/i.test(file.name)
  if (!supportedImageTypes.has(file.type) && !supportedExtension) {
    return 'Pilih gambar PNG, JPG, JPEG, WebP, atau AVIF.'
  }
  if (file.size > maxFileSize) return 'Ukuran file maksimal 25 MB.'
  return null
}

export function prepareGreenScreenFiles(
  files: File[],
  currentCount: number,
): PreparedImageFiles {
  const acceptedFiles: File[] = []
  const errors: string[] = []
  let skippedByLimit = 0
  const availableSlots = Math.max(0, maxGreenScreenFiles - currentCount)

  for (const file of files) {
    const validationError = validateGreenScreenFile(file)
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
    errors.push(
      `Maksimal ${maxGreenScreenFiles} file. ${skippedByLimit} file tidak ditambahkan.`,
    )
  }

  return { acceptedFiles, errors }
}

export function createTransparentPngBaseName(fileName: string) {
  const baseName = fileName.replace(/\.(png|jpe?g|webp|avif)$/i, '')
  return baseName ? `${baseName}-transparent` : 'green-screen-removed'
}

export function normalizePngBaseName(fileName: string) {
  return normalizeImageBaseName(fileName.replace(/\.png$/i, ''), 'green-screen-removed')
}

export function normalizePngFileName(fileName: string) {
  return `${normalizePngBaseName(fileName)}.png`
}

export function createUniquePngFileName(fileName: string, usedFileNames: Set<string>) {
  return createUniqueFileName(normalizePngBaseName(fileName), 'png', usedFileNames)
}

export function getClampedSampleArea(
  imageWidth: number,
  imageHeight: number,
  centerX: number,
  centerY: number,
  sampleSize = 20,
) {
  const width = Math.min(sampleSize, imageWidth)
  const height = Math.min(sampleSize, imageHeight)
  return {
    x: Math.min(Math.max(0, Math.floor(centerX - width / 2)), Math.max(0, imageWidth - width)),
    y: Math.min(Math.max(0, Math.floor(centerY - height / 2)), Math.max(0, imageHeight - height)),
    width,
    height,
  }
}

export function calculateChromaOpacity(
  red: number,
  green: number,
  blue: number,
  tolerance: number,
  softness: number,
  keyColor: RgbColor = { red: 0, green: 255, blue: 0 },
) {
  const rgbDistance = Math.hypot(
    red - keyColor.red,
    green - keyColor.green,
    blue - keyColor.blue,
  )
  const pixelTotal = Math.max(1, red + green + blue)
  const keyTotal = Math.max(1, keyColor.red + keyColor.green + keyColor.blue)
  const chromaDistance = Math.hypot(
    (red / pixelTotal - keyColor.red / keyTotal) * 255,
    (green / pixelTotal - keyColor.green / keyTotal) * 255,
    (blue / pixelTotal - keyColor.blue / keyTotal) * 255,
  )
  const pixelBrightness = (red + green + blue) / 3
  const keyBrightness = (keyColor.red + keyColor.green + keyColor.blue) / 3
  const hueAwareDistance = chromaDistance * 1.2 + Math.abs(pixelBrightness - keyBrightness) * 0.12
  const distance = Math.min(rgbDistance, hueAwareDistance)
  const targetRadius = 8 + tolerance * 1.05
  const feather = Math.max(1, 1 + softness)
  const innerRadius = Math.max(0, targetRadius - feather * 0.45)
  const outerRadius = targetRadius + feather * 0.55
  let distanceOpacity = 1
  if (distance <= innerRadius) distanceOpacity = 0
  else if (distance < outerRadius) {
    const progress = (distance - innerRadius) / feather
    distanceOpacity = progress * progress * (3 - 2 * progress)
  }

  const pixelChannels = [red, green, blue]
  const keyChannels = [keyColor.red, keyColor.green, keyColor.blue]
  const dominantChannel = keyChannels.indexOf(Math.max(...keyChannels))
  const otherKeyChannels = keyChannels.filter((_, index) => index !== dominantChannel)
  const keyDominance = (keyChannels[dominantChannel] ?? 0) - Math.max(...otherKeyChannels)
  if (keyDominance < 12) return distanceOpacity

  const pixelMaximum = Math.max(...pixelChannels)
  const pixelMinimum = Math.min(...pixelChannels)
  const keyMaximum = Math.max(...keyChannels)
  const keyMinimum = Math.min(...keyChannels)
  const pixelSaturation = pixelMaximum === 0 ? 0 : (pixelMaximum - pixelMinimum) / pixelMaximum
  const keySaturation = keyMaximum === 0 ? 0 : (keyMaximum - keyMinimum) / keyMaximum
  let saturationConfidence = 1
  if (keySaturation >= 0.45) {
    const saturationFloor = Math.max(0.38, keySaturation * 0.42)
    if (pixelSaturation <= saturationFloor) return 1
    saturationConfidence = Math.min(1, (pixelSaturation - saturationFloor) / 0.16)
  }

  const otherPixelChannels = pixelChannels.filter((_, index) => index !== dominantChannel)
  const pixelDominance =
    (pixelChannels[dominantChannel] ?? 0) - Math.max(...otherPixelChannels)
  if (pixelDominance <= 0) return 1
  const dominanceConfidence = Math.min(1, pixelDominance / 18)
  return 1 - (1 - distanceOpacity) * dominanceConfidence * saturationConfidence
}

export function detectGreenScreenKeyColor(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
): RgbColor | null {
  if (imageWidth <= 0 || imageHeight <= 0 || pixels.length < imageWidth * imageHeight * 4) {
    return null
  }

  const borderSize = Math.max(1, Math.min(48, Math.round(Math.min(imageWidth, imageHeight) * 0.08)))
  const step = Math.max(1, Math.floor(Math.max(imageWidth, imageHeight) / 1_200))
  let weightedRed = 0
  let weightedGreen = 0
  let weightedBlue = 0
  let totalWeight = 0
  let candidateCount = 0
  let sampledPixelCount = 0

  function samplePixel(x: number, y: number) {
    sampledPixelCount += 1
    const index = (y * imageWidth + x) * 4
    const red = pixels[index] ?? 0
    const green = pixels[index + 1] ?? 0
    const blue = pixels[index + 2] ?? 0
    const alpha = pixels[index + 3] ?? 0
    const dominance = green - Math.max(red, blue)
    const maximum = Math.max(red, green, blue)
    const minimum = Math.min(red, green, blue)
    const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum
    if (
      alpha === 0 ||
      green < 40 ||
      dominance < 12 ||
      saturation < 0.42 ||
      green <= red * 1.08 ||
      green <= blue * 1.08
    ) {
      return
    }

    const weight = Math.max(1, dominance)
    weightedRed += red * weight
    weightedGreen += green * weight
    weightedBlue += blue * weight
    totalWeight += weight
    candidateCount += 1
  }

  for (let x = 0; x < imageWidth; x += step) {
    for (let y = 0; y < borderSize; y += step) {
      samplePixel(x, y)
      samplePixel(x, imageHeight - 1 - y)
    }
  }
  for (let y = borderSize; y < imageHeight - borderSize; y += step) {
    for (let x = 0; x < borderSize; x += step) {
      samplePixel(x, y)
      samplePixel(imageWidth - 1 - x, y)
    }
  }

  if (
    candidateCount < 8 ||
    candidateCount / Math.max(1, sampledPixelCount) < 0.15 ||
    totalWeight === 0
  )
    return null
  return {
    red: Math.round(weightedRed / totalWeight),
    green: Math.round(weightedGreen / totalWeight),
    blue: Math.round(weightedBlue / totalWeight),
  }
}

export function applyChromaKey(
  imageData: ImageData,
  selectedTolerance: number,
  selectedSoftness: number,
  keyColor: RgbColor,
) {
  const pixels = imageData.data
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0
    const green = pixels[index + 1] ?? 0
    const blue = pixels[index + 2] ?? 0
    const originalAlpha = pixels[index + 3] ?? 255
    const opacity = calculateChromaOpacity(
      red,
      green,
      blue,
      selectedTolerance,
      selectedSoftness,
      keyColor,
    )

    pixels[index + 3] = Math.round(originalAlpha * opacity)
    if (opacity < 1 && keyColor.green >= keyColor.red && keyColor.green >= keyColor.blue) {
      const neutralGreen = Math.max(red, blue)
      pixels[index + 1] = Math.round(green * opacity + neutralGreen * (1 - opacity))
    }
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Browser tidak dapat membuat hasil PNG transparan.'))
    }, 'image/png')
  })
}

export function useGreenScreenRemover() {
  const items = ref<GreenScreenItem[]>([])
  const tolerance = ref(defaultGreenTolerance)
  const softness = ref(defaultEdgeSoftness)
  const isProcessing = ref(false)
  const processingMode = ref<GreenScreenProcessingMode>(null)
  const isDragging = ref(false)
  const errorMessage = ref('')
  let itemSequence = 0
  let processingController: AbortController | null = null
  const adaptiveMaxPixels = getAdaptiveGreenScreenPixelLimit()

  const { completedCount, failedCount, processedCount, progressPercentage, hasProcessableItems } = useImageBatchQueue(items)

  function revokeUrl(url: string) {
    if (url) URL.revokeObjectURL(url)
  }

  function clearItemOutput(item: GreenScreenItem) {
    revokeUrl(item.outputPreviewUrl)
    item.outputPreviewUrl = ''
    item.outputBlob = null
  }

  async function addFiles(files: File[]) {
    if (isProcessing.value || files.length === 0) return

    const { acceptedFiles, errors } = prepareGreenScreenFiles(files, items.value.length)
    errorMessage.value = errors.join(' ')
    const newItems = acceptedFiles.map<GreenScreenItem>((file) => ({
      id: `${Date.now()}-${itemSequence++}`,
      file,
      inputPreviewUrl: URL.createObjectURL(file),
      outputPreviewUrl: '',
      outputBlob: null,
      outputBaseName: createTransparentPngBaseName(file.name),
      editSourceBlob: null,
      editSourcePreviewUrl: '',
      keyColor: { red: 0, green: 255, blue: 0 },
      isEdited: false,
      status: 'queued',
      errorMessage: '',
    }))
    items.value.push(...newItems)

    if (newItems.length > 0) {
      await nextTick()
      void processAll()
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
    revokeUrl(item.editSourcePreviewUrl)
  }

  async function processItem(
    item: GreenScreenItem,
    selectedTolerance: number,
    selectedSoftness: number,
    signal?: AbortSignal,
  ) {
    item.status = 'processing'
    item.errorMessage = ''

    try {
      const source = item.editSourceBlob ?? item.file
      let outputBlob: Blob
      if (supportsOffscreenImageProcessing()) {
        const result = await processGreenScreenInWorker({ source, tolerance: selectedTolerance, softness: selectedSoftness, keyColor: item.keyColor, autoDetect: !item.isEdited, maxPixels: adaptiveMaxPixels }, signal)
        outputBlob = result.outputBlob
        if (!item.isEdited) item.keyColor = result.keyColor
      } else {
        const bitmap = await createImageBitmap(source)
        try {
          if (bitmap.width * bitmap.height > adaptiveMaxPixels) throw new Error(`Resolusi gambar melebihi batas adaptif ${Math.round(adaptiveMaxPixels / 1_000_000)} MP.`)
          if (signal?.aborted) throw new DOMException('Pemrosesan green screen dibatalkan.', 'AbortError')
          const canvas = document.createElement('canvas')
          canvas.width = bitmap.width
          canvas.height = bitmap.height
          const context = canvas.getContext('2d', { willReadFrequently: true })
          if (!context) throw new Error('Browser tidak dapat membaca gambar ini.')
          context.drawImage(bitmap, 0, 0)
          const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height)
          if (!item.isEdited) item.keyColor = detectGreenScreenKeyColor(imageData.data, bitmap.width, bitmap.height) ?? item.keyColor
          applyChromaKey(imageData, selectedTolerance, selectedSoftness, item.keyColor)
          context.putImageData(imageData, 0, 0)
          outputBlob = await canvasToPngBlob(canvas)
          if (signal?.aborted) throw new DOMException('Pemrosesan green screen dibatalkan.', 'AbortError')
        } finally { bitmap.close() }
      }

      clearItemOutput(item)
      item.outputBlob = outputBlob
      item.outputPreviewUrl = URL.createObjectURL(outputBlob)
      item.status = 'completed'
    } catch (error) {
      item.status = error instanceof DOMException && error.name === 'AbortError' ? 'queued' : 'error'
      item.errorMessage =
        error instanceof Error ? error.message : 'Green screen tidak dapat dihapus.'
    }
  }

  async function applyEditor(itemId: string, sourceCanvas: HTMLCanvasElement, keyColor: RgbColor) {
    if (isProcessing.value) return false
    const item = items.value.find((candidate) => candidate.id === itemId)
    if (!item) return false
    if (sourceCanvas.width <= 0 || sourceCanvas.height <= 0) {
      item.errorMessage = 'Area edit tidak valid.'
      return false
    }
    if (sourceCanvas.width * sourceCanvas.height > adaptiveMaxPixels) {
      item.errorMessage = `Resolusi gambar melebihi batas adaptif ${Math.round(adaptiveMaxPixels / 1_000_000)} MP.`
      return false
    }

    const previousStatus = item.status
    item.status = 'processing'
    item.errorMessage = ''
    processingMode.value = 'editor'
    isProcessing.value = true
    const controller = new AbortController()
    processingController = controller

    try {
      const sourceBlob = await canvasToPngBlob(sourceCanvas)
      let outputBlob: Blob
      if (supportsOffscreenImageProcessing()) {
        outputBlob = (await processGreenScreenInWorker({ source: sourceBlob, tolerance: tolerance.value, softness: softness.value, keyColor, autoDetect: false, maxPixels: adaptiveMaxPixels }, controller.signal)).outputBlob
      } else {
        const context = sourceCanvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Browser tidak dapat membaca hasil edit.')
        const imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
        applyChromaKey(imageData, tolerance.value, softness.value, keyColor)
        context.putImageData(imageData, 0, 0)
        outputBlob = await canvasToPngBlob(sourceCanvas)
      }

      revokeUrl(item.editSourcePreviewUrl)
      clearItemOutput(item)
      item.editSourceBlob = sourceBlob
      item.editSourcePreviewUrl = URL.createObjectURL(sourceBlob)
      item.outputBlob = outputBlob
      item.outputPreviewUrl = URL.createObjectURL(outputBlob)
      item.keyColor = { ...keyColor }
      item.isEdited = true
      item.status = 'completed'
      return true
    } catch (error) {
      item.status = previousStatus
      item.errorMessage =
        error instanceof Error ? error.message : 'Hasil edit tidak dapat diproses.'
      return false
    } finally {
      isProcessing.value = false
      processingMode.value = null
      processingController = null
    }
  }

  async function processAll(force = false) {
    if (isProcessing.value || items.value.length === 0) return

    errorMessage.value = ''
    processingMode.value = force ? 'settings' : 'automatic'
    isProcessing.value = true
    const controller = new AbortController()
    processingController = controller
    const selectedTolerance = tolerance.value
    const selectedSoftness = softness.value
    const queue = force
      ? [...items.value]
      : items.value.filter((item) => item.status === 'queued' || item.status === 'error')

    if (force) {
      for (const item of queue) item.status = 'queued'
    }

    try {
      for (const item of queue) {
        if (controller.signal.aborted) break
        await processItem(item, selectedTolerance, selectedSoftness, controller.signal)
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    } finally {
      isProcessing.value = false
      processingMode.value = null
      processingController = null
    }
  }

  function cancelProcessing() {
    processingController?.abort()
  }

  function reset() {
    if (isProcessing.value) return
    for (const item of items.value) {
      revokeUrl(item.inputPreviewUrl)
      revokeUrl(item.outputPreviewUrl)
      revokeUrl(item.editSourcePreviewUrl)
    }
    items.value = []
    errorMessage.value = ''
  }

  onBeforeUnmount(() => {
    processingController?.abort()
    for (const item of items.value) {
      revokeUrl(item.inputPreviewUrl)
      revokeUrl(item.outputPreviewUrl)
      revokeUrl(item.editSourcePreviewUrl)
    }
  })

  return {
    items,
    adaptiveMaxPixels,
    tolerance,
    softness,
    isProcessing,
    processingMode,
    isDragging,
    errorMessage,
    completedCount,
    failedCount,
    processedCount,
    progressPercentage,
    hasProcessableItems,
    addFiles,
    removeItem,
    processAll,
    cancelProcessing,
    applyEditor,
    reset,
  }
}
