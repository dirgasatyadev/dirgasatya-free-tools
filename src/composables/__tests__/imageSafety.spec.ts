import { describe, expect, it } from 'vitest'
import { estimateImageWorkingSet, getAdaptiveAvifPixelLimit, getAdaptiveGreenScreenPixelLimit } from '@/composables/imageSafety'

describe('image safety budgets', () => {
  it('menurunkan batas pixel pada perangkat low-memory', () => {
    expect(getAdaptiveGreenScreenPixelLimit(2)).toBe(8_000_000)
    expect(getAdaptiveAvifPixelLimit(4)).toBe(12_000_000)
  })

  it('menghitung estimasi working set AVIF', () => {
    expect(estimateImageWorkingSet(4_000, 3_000)).toBe(288_000_000)
  })
})
