import { validateImageDimensions } from '@/composables/image/imageValidation'

export async function decodeImage(source: Blob, maxPixels: number, label = 'gambar') {
  const bitmap = await createImageBitmap(source)
  const error = validateImageDimensions(bitmap.width, bitmap.height, maxPixels, label)
  if (error) { bitmap.close(); throw new Error(error) }
  return bitmap
}

export async function withDecodedImage<T>(source: Blob, maxPixels: number, callback: (bitmap: ImageBitmap) => Promise<T> | T, label = 'gambar') {
  const bitmap = await decodeImage(source, maxPixels, label)
  try { return await callback(bitmap) } finally { bitmap.close() }
}
