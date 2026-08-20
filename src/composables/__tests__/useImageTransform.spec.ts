import { describe, expect, it } from 'vitest'
import { calculateImageFitRect, imageBaseName, resolveImageTransformDimensions } from '@/composables/useImageTransform'

describe('image transform helpers', () => {
  const item = { sourceWidth: 4032, sourceHeight: 3024 }
  it('menghitung resize percentage dari dimensi sumber', () => {
    expect(resolveImageTransformDimensions(item, { resizeEnabled: true, resizeMode: 'percentage', width: 1, height: 1, percentage: 50 })).toEqual({ width: 2016, height: 1512 })
  })
  it('mempertahankan dimensi ketika resize optional dimatikan', () => {
    expect(resolveImageTransformDimensions(item, { resizeEnabled: false, resizeMode: 'dimensions', width: 1920, height: 1080, percentage: 50 })).toEqual({ width: 4032, height: 3024 })
  })
  it('menghitung contain dan cover secara terpusat', () => {
    expect(calculateImageFitRect(400, 200, 300, 300, 'contain')).toEqual({ x: 0, y: 75, width: 300, height: 150 })
    expect(calculateImageFitRect(400, 200, 300, 300, 'cover')).toEqual({ x: -150, y: 0, width: 600, height: 300 })
  })
  it('membersihkan ekstensi format input dari nama output', () => {
    expect(imageBaseName('hero.final.AVIF')).toBe('hero.final')
  })
})
