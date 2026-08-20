import { describe, expect, it } from 'vitest'
import {
  createUniqueWebpFileName,
  createWebpBaseName,
  defaultWebpQuality,
  normalizeWebpBaseName,
  normalizeWebpFileName,
} from '@/composables/usePngToWebp'

describe('PNG to WebP helpers', () => {
  it('menggunakan kualitas WebP default yang seimbang', () => {
    expect(defaultWebpQuality).toBe(82)
  })

  it('membuat dan menormalkan nama file WebP', () => {
    expect(createWebpBaseName('gambar.png')).toBe('gambar')
    expect(normalizeWebpBaseName('hasil.webp')).toBe('hasil')
    expect(normalizeWebpFileName('folder/hasil:*?')).toBe('folder-hasil---.webp')
  })

  it('mencegah nama ganda pada download massal', () => {
    const usedNames = new Set<string>()
    expect(createUniqueWebpFileName('hasil', usedNames)).toBe('hasil.webp')
    expect(createUniqueWebpFileName('HASIL.webp', usedNames)).toBe('HASIL-2.webp')
  })
})
