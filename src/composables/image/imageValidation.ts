export interface ImageFileRules {
  mimeTypes: readonly string[]
  extensions: readonly string[]
  maxBytes: number
  maxPixels: number
}

export function validateImageFile(file: Pick<File, 'name' | 'type' | 'size'>, rules: ImageFileRules) {
  const extension = file.name.toLocaleLowerCase('en').split('.').pop() ?? ''
  if (!rules.mimeTypes.includes(file.type) && !rules.extensions.includes(extension)) return `Format gambar ${file.type || extension || 'tidak dikenal'} tidak didukung.`
  if (file.size > rules.maxBytes) return `Ukuran file melebihi ${Math.round(rules.maxBytes / (1024 * 1024))} MB.`
  return null
}

export function validateImageDimensions(width: number, height: number, maxPixels: number, label = 'gambar') {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) return `Dimensi ${label} tidak valid.`
  if (width * height > maxPixels) return `Resolusi ${label} melebihi ${Math.round(maxPixels / 1_000_000)} megapiksel.`
  return null
}
