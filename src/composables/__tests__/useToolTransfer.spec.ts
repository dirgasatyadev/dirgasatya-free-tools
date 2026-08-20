import { describe, expect, it } from 'vitest'
import {
  acceptsTransferMimeType,
  getCompatibleTransferTargets,
} from '@/composables/useToolTransfer'

describe('tool transfer helpers', () => {
  it('mendukung MIME spesifik dan wildcard', () => {
    expect(acceptsTransferMimeType(['image/avif'], 'image/avif')).toBe(true)
    expect(acceptsTransferMimeType(['image/*'], 'image/png')).toBe(true)
    expect(acceptsTransferMimeType(['image/png'], 'image/avif')).toBe(false)
  })

  it('menentukan tujuan dari format hasil secara dinamis', () => {
    const targets = getCompatibleTransferTargets('png-to-avif', [
      { blob: new Blob(['avif'], { type: 'image/avif' }), fileName: 'hasil.avif' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual(['green-screen-remover', 'image-resizer-cropper', 'universal-image-converter'])
  })

  it('menghubungkan hasil WebP ke Green Screen Remover', () => {
    const targets = getCompatibleTransferTargets('png-to-webp', [
      { blob: new Blob(['webp'], { type: 'image/webp' }), fileName: 'hasil.webp' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual([
      'green-screen-remover',
      'compress-image',
      'image-resizer-cropper',
      'universal-image-converter',
    ])
  })

  it('menawarkan kedua konverter untuk hasil PNG yang kompatibel', () => {
    const targets = getCompatibleTransferTargets('green-screen-remover', [
      { blob: new Blob(['png'], { type: 'image/png' }), fileName: 'hasil.png' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual([
      'png-to-avif',
      'png-to-webp',
      'compress-image',
      'favicon-generator',
      'image-resizer-cropper',
      'universal-image-converter',
    ])
  })

  it('menghubungkan hasil Compress Image ke tool yang menerima seluruh format hasil', () => {
    const targets = getCompatibleTransferTargets('compress-image', [
      { blob: new Blob(['png'], { type: 'image/png' }), fileName: 'satu.png' },
      { blob: new Blob(['jpg'], { type: 'image/jpeg' }), fileName: 'dua.jpg' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual(['green-screen-remover', 'image-resizer-cropper', 'universal-image-converter'])
  })
})
