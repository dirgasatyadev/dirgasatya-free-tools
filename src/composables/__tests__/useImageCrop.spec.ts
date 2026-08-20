import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyCanvasCropShape, getCropShapeAspectRatio } from '@/composables/useImageCrop'

describe('image crop helpers', () => {
  afterEach(() => vi.restoreAllMocks())
  it('mengunci crop lingkaran ke rasio 1:1', () => {
    expect(getCropShapeAspectRatio('circle')).toBe(1)
  })

  it('membiarkan crop kotak menggunakan rasio bebas', () => {
    expect(getCropShapeAspectRatio('rectangle')).toBeNaN()
  })

  it('mengembalikan canvas yang sama untuk crop kotak', () => {
    const canvas = document.createElement('canvas')
    expect(applyCanvasCropShape(canvas, 'rectangle')).toBe(canvas)
  })

  it('membuat clipping ellipse transparan untuk crop lingkaran', () => {
    const context = { beginPath: vi.fn<(...args: unknown[]) => void>(), ellipse: vi.fn<(...args: unknown[]) => void>(), clip: vi.fn<(...args: unknown[]) => void>(), drawImage: vi.fn<(...args: unknown[]) => void>() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const source = document.createElement('canvas'); source.width = 320; source.height = 180
    const result = applyCanvasCropShape(source, 'circle')
    expect(result).not.toBe(source)
    expect([result.width, result.height]).toEqual([320, 180])
    expect(context.ellipse).toHaveBeenCalledWith(160, 90, 160, 90, 0, 0, Math.PI * 2)
    expect(context.clip).toHaveBeenCalledOnce()
    expect(context.drawImage).toHaveBeenCalledWith(source, 0, 0)
  })
})
