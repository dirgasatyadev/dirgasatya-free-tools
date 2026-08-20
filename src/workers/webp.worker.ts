/// <reference lib="webworker" />

interface WebpWorkerInput {
  source: Blob
  quality: number
  maxPixels: number
}

self.onmessage = async (event: MessageEvent<WebpWorkerInput>) => {
  let bitmap: ImageBitmap | undefined
  try {
    const { source, quality, maxPixels } = event.data
    if (!Number.isFinite(quality) || quality < 1 || quality > 100) throw new Error('Kualitas WebP harus antara 1% dan 100%.')
    bitmap = await createImageBitmap(source)
    if (bitmap.width * bitmap.height > maxPixels) throw new Error(`Resolusi PNG melebihi budget memory ${Math.round(maxPixels / 1_000_000)} MP.`)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Worker tidak dapat membaca gambar ini.')
    context.drawImage(bitmap, 0, 0)
    const outputBlob = await canvas.convertToBlob({ type: 'image/webp', quality: quality / 100 })
    if (outputBlob.type !== 'image/webp') throw new Error('Browser ini tidak mendukung encoder WebP.')
    self.postMessage({ outputBlob })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Konversi WebP gagal.' })
  } finally {
    bitmap?.close()
  }
}

export {}
