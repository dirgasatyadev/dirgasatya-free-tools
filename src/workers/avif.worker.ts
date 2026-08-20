interface AvifRequest { id?: number; source: Blob; quality: number; maxPixels: number }

self.onmessage = async (event: MessageEvent<AvifRequest>) => {
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(event.data.source)
    const pixels = bitmap.width * bitmap.height
    if (pixels > event.data.maxPixels) throw new Error(`Resolusi PNG melebihi budget memory ${Math.round(event.data.maxPixels / 1_000_000)} MP.`)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Worker tidak dapat membaca pixel PNG.')
    context.drawImage(bitmap, 0, 0)
    const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height)
    bitmap.close()
    bitmap = undefined
    const { default: encode } = await import('@jsquash/avif/encode.js')
    const buffer = await encode(imageData, { quality: event.data.quality, speed: 6 })
    ;(self as unknown as { postMessage: (message: unknown, transfer: Transferable[]) => void })
      .postMessage({ id: event.data.id, buffer }, [buffer])
  } catch (error) {
    self.postMessage({ id: event.data.id, error: error instanceof Error ? error.message : 'AVIF worker gagal.' })
  } finally {
    bitmap?.close()
  }
}
