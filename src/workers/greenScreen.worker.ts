import { applyChromaKey, detectGreenScreenKeyColor, type RgbColor } from '@/composables/useGreenScreenRemover'

interface GreenScreenRequest {
  source: Blob
  tolerance: number
  softness: number
  keyColor: RgbColor
  autoDetect: boolean
  maxPixels: number
}

self.onmessage = async (event: MessageEvent<GreenScreenRequest>) => {
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(event.data.source)
    const pixels = bitmap.width * bitmap.height
    if (pixels > event.data.maxPixels) throw new Error(`Resolusi gambar melebihi batas adaptif ${Math.round(event.data.maxPixels / 1_000_000)} MP.`)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Worker tidak dapat membaca pixel gambar.')
    context.drawImage(bitmap, 0, 0)
    const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height)
    const keyColor = event.data.autoDetect
      ? detectGreenScreenKeyColor(imageData.data, bitmap.width, bitmap.height) ?? event.data.keyColor
      : event.data.keyColor
    applyChromaKey(imageData, event.data.tolerance, event.data.softness, keyColor)
    context.putImageData(imageData, 0, 0)
    const outputBlob = await canvas.convertToBlob({ type: 'image/png' })
    self.postMessage({ outputBlob, keyColor })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Green screen worker gagal.' })
  } finally {
    bitmap?.close()
  }
}
