export type ImageTransformFormat = 'png' | 'jpeg' | 'webp' | 'avif'
export type ImageFitMode = 'contain' | 'cover' | 'stretch'

export interface ImageTransformRequest {
  id: number
  source: Blob
  width: number
  height: number
  fit: ImageFitMode
  format: ImageTransformFormat
  quality: number
  maxPixels: number
}

function mimeType(format: ImageTransformFormat) {
  return format === 'jpeg' ? 'image/jpeg' : `image/${format}`
}

function drawRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, fit: ImageFitMode) {
  if (fit === 'stretch') return { x: 0, y: 0, width: targetWidth, height: targetHeight }
  const scale = fit === 'contain'
    ? Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
    : Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height }
}

self.onmessage = async (event: MessageEvent<ImageTransformRequest>) => {
  let bitmap: ImageBitmap | undefined
  try {
    const request = event.data
    bitmap = await createImageBitmap(request.source)
    if (bitmap.width * bitmap.height > request.maxPixels) throw new Error(`Resolusi sumber melebihi budget ${Math.round(request.maxPixels / 1_000_000)} MP.`)
    if (!Number.isSafeInteger(request.width) || !Number.isSafeInteger(request.height) || request.width < 1 || request.height < 1 || request.width * request.height > request.maxPixels) {
      throw new Error(`Resolusi output tidak valid atau melebihi budget ${Math.round(request.maxPixels / 1_000_000)} MP.`)
    }
    const canvas = new OffscreenCanvas(request.width, request.height)
    const context = canvas.getContext('2d', { willReadFrequently: request.format === 'avif', alpha: request.format !== 'jpeg' })
    if (!context) throw new Error('Worker tidak dapat membuat canvas output.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    if (request.format === 'jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, request.width, request.height)
    }
    const rect = drawRect(bitmap.width, bitmap.height, request.width, request.height, request.fit)
    context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height)
    bitmap.close()
    bitmap = undefined

    let outputBlob: Blob
    if (request.format === 'avif') {
      const imageData = context.getImageData(0, 0, request.width, request.height)
      const { default: encode } = await import('@jsquash/avif/encode.js')
      const buffer = await encode(imageData, { quality: request.quality, speed: 6 })
      outputBlob = new Blob([buffer], { type: 'image/avif' })
    } else {
      outputBlob = await canvas.convertToBlob({ type: mimeType(request.format), quality: request.quality / 100 })
    }
    self.postMessage({ id: request.id, outputBlob })
  } catch (error) {
    self.postMessage({ id: event.data.id, error: error instanceof Error ? error.message : 'Transformasi gambar gagal.' })
  } finally {
    bitmap?.close()
  }
}
