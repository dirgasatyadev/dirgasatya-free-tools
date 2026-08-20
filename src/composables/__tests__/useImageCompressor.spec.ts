import { describe, expect, it } from 'vitest'
import {
  buildCompressionOptions,
  createCompressedBaseName,
  createUniqueCompressedFileName,
  defaultCompressQuality,
  getImageMimeType,
  normalizeCompressedBaseName,
  normalizeCompressedFileName,
  validateCompressImageDimensions,
  validateCompressImageFile,
} from '@/composables/useImageCompressor'

describe('Compress Image helpers', () => {
  it('menggunakan kualitas default 75%', () => {
    expect(defaultCompressQuality).toBe(75)
  })

  it('memisahkan mode kualitas dari target ukuran dan selalu memakai worker', () => {
    const qualityOptions = buildCompressionOptions(4 * 1024 * 1024, 'image/jpeg', 70, 'quality', 1)
    expect(qualityOptions).toMatchObject({ initialQuality: 0.7, alwaysKeepResolution: true, maxIteration: 1, useWebWorker: true })
    const targetOptions = buildCompressionOptions(4 * 1024 * 1024, 'image/jpeg', 70, 'target-size', 1)
    expect(targetOptions).toMatchObject({ maxSizeMB: 1, initialQuality: 0.92, alwaysKeepResolution: false, maxIteration: 10, useWebWorker: true })
  })

  it('mengenali PNG, WebP, JPG, dan JPEG dari MIME atau ekstensi', () => {
    expect(getImageMimeType({ name: 'a.png', type: 'image/png' })).toBe('image/png')
    expect(getImageMimeType({ name: 'a.webp', type: '' })).toBe('image/webp')
    expect(getImageMimeType({ name: 'a.JPG', type: '' })).toBe('image/jpeg')
    expect(getImageMimeType({ name: 'a.jpeg', type: 'image/jpeg' })).toBe('image/jpeg')
    expect(getImageMimeType({ name: 'a.gif', type: 'image/gif' })).toBeNull()
  })

  it('memvalidasi format, ukuran, dan resolusi gambar', () => {
    expect(validateCompressImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull()
    expect(validateCompressImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toContain(
      'Format yang didukung',
    )
    expect(validateCompressImageDimensions(8_000, 5_001)).toContain('40 megapiksel')
  })

  it('menormalkan nama dan mencegah nama download ganda', () => {
    expect(createCompressedBaseName('foto.jpeg')).toBe('foto')
    expect(normalizeCompressedBaseName('folder/foto:*?.jpg')).toBe('folder-foto---')
    expect(normalizeCompressedFileName('foto.png', 'webp')).toBe('foto.webp')
    const usedNames = new Set<string>()
    expect(createUniqueCompressedFileName('foto', 'jpg', usedNames)).toBe('foto.jpg')
    expect(createUniqueCompressedFileName('FOTO.jpg', 'jpg', usedNames)).toBe('FOTO-2.jpg')
  })
})
