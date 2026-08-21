import { describe, expect, it } from 'vitest'
import { calculateImageFitRect, imageBaseName, resolveImageTransformDimensions } from '@/composables/useImageTransform'

describe('image transform helpers', () => {
  const item = { sourceWidth: 4032, sourceHeight: 3024 }
  it('menghitung resize percentage dari dimensi sumber', () => {
    expect(resolveImageTransformDimensions(item, { resizeEnabled: true, resizeMode: 'percentage', width: 1, height: 1, percentage: 50 })).toEqual({ width: 2016, height: 1512 })
  })
  it('menghitung fit within per file tanpa upscale atau letterbox canvas', () => {
    const settings = { resizeEnabled: true, resizeMode: 'fit-within' as const, width: 1920, height: 1080, percentage: 50 }
    expect(resolveImageTransformDimensions({ sourceWidth: 4000, sourceHeight: 3000 }, settings)).toEqual({ width: 1440, height: 1080 })
    expect(resolveImageTransformDimensions({ sourceWidth: 3000, sourceHeight: 4000 }, settings)).toEqual({ width: 810, height: 1080 })
    expect(resolveImageTransformDimensions({ sourceWidth: 2000, sourceHeight: 2000 }, settings)).toEqual({ width: 1080, height: 1080 })
    expect(resolveImageTransformDimensions({ sourceWidth: 800, sourceHeight: 600 }, settings)).toEqual({ width: 800, height: 600 })
  })
  it('menggunakan canvas yang sama hanya untuk strategy exact', () => {
    const settings = { resizeEnabled: true, resizeMode: 'exact' as const, width: 1920, height: 1080, percentage: 50 }
    expect(resolveImageTransformDimensions({ sourceWidth: 4000, sourceHeight: 3000 }, settings)).toEqual({ width: 1920, height: 1080 })
    expect(resolveImageTransformDimensions({ sourceWidth: 3000, sourceHeight: 4000 }, settings)).toEqual({ width: 1920, height: 1080 })
  })
  it('mempertahankan dimensi ketika resize optional dimatikan', () => {
    expect(resolveImageTransformDimensions(item, { resizeEnabled: false, resizeMode: 'fit-within', width: 1920, height: 1080, percentage: 50 })).toEqual({ width: 4032, height: 3024 })
  })
  it('menghitung contain dan cover secara terpusat', () => {
    expect(calculateImageFitRect(400, 200, 300, 300, 'contain')).toEqual({ x: 0, y: 75, width: 300, height: 150 })
    expect(calculateImageFitRect(400, 200, 300, 300, 'cover')).toEqual({ x: -150, y: 0, width: 600, height: 300 })
  })
  it('membersihkan ekstensi format input dari nama output', () => {
    expect(imageBaseName('hero.final.AVIF')).toBe('hero.final')
  })
})
