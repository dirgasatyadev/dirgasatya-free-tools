import { describe, expect, it } from 'vitest'
import { getCropShapeAspectRatio } from '@/composables/useImageCrop'

describe('image crop helpers', () => {
  it('mengunci crop lingkaran ke rasio 1:1', () => {
    expect(getCropShapeAspectRatio('circle')).toBe(1)
  })

  it('membiarkan crop kotak menggunakan rasio bebas', () => {
    expect(getCropShapeAspectRatio('rectangle')).toBeNaN()
  })
})
