import { describe, expect, it } from 'vitest'
import {
  calculateAspectRatio,
  calculateCssClamp,
  calculateDownloadSeconds,
  calculatePercentage,
  calculateProportionalHeight,
  calculateScreenMetrics,
  convertFileSize,
  convertPxRem,
  formatDuration,
} from '@/composables/useCalculatorTools'

describe('calculator tool helpers', () => {
  it('mengonversi px dan rem', () => {
    expect(convertPxRem(32, 16, 'px-to-rem')).toBe(2)
    expect(convertPxRem(2, 16, 'rem-to-px')).toBe(32)
  })

  it('menghitung aspect ratio dan ukuran proporsional', () => {
    expect(calculateAspectRatio(1920, 1080)).toMatchObject({ width: 16, height: 9 })
    expect(calculateProportionalHeight(1920, 1080, 1280)).toBe(720)
  })

  it('membuat CSS clamp fluid', () => {
    expect(calculateCssClamp(16, 32, 320, 1280, 16).css).toBe('clamp(1rem, 0.6667rem + 1.6667vw, 2rem)')
  })

  it('menghitung tiga jenis persentase', () => {
    expect(calculatePercentage('of', 20, 250)).toBe(50)
    expect(calculatePercentage('ratio', 50, 200)).toBe(25)
    expect(calculatePercentage('change', 120, 100)).toBe(20)
  })

  it('menghitung metrik resolusi layar', () => {
    expect(calculateScreenMetrics(1920, 1080, 24)).toMatchObject({ megapixels: 2.0736, orientation: 'Landscape' })
    expect(calculateScreenMetrics(1920, 1080, 24).ppi).toBeCloseTo(91.79, 1)
  })

  it('mengonversi ukuran file dan waktu download', () => {
    expect(convertFileSize(1, 'GB', 'MB')).toBe(1024)
    expect(calculateDownloadSeconds(100, 'MB', 100, 'Mbps')).toBeCloseTo(8.388608)
    expect(formatDuration(3661)).toBe('1 jam 1 menit 1 detik')
  })
})
