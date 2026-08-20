export type FileSizeUnit = 'bit' | 'B' | 'KB' | 'MB' | 'GB' | 'TB'
export type BandwidthUnit = 'Kbps' | 'Mbps' | 'Gbps'

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} harus lebih dari 0.`)
  return value
}

export function roundNumber(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function convertPxRem(value: number, rootFontSize: number, direction: 'px-to-rem' | 'rem-to-px') {
  positive(rootFontSize, 'Root font size')
  if (!Number.isFinite(value)) throw new Error('Nilai harus berupa angka.')
  return direction === 'px-to-rem' ? value / rootFontSize : value * rootFontSize
}

function gcd(first: number, second: number): number {
  return second === 0 ? first : gcd(second, first % second)
}

export function validatePixelDimension(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} harus berupa bilangan bulat aman minimal 1 pixel.`)
  }
  return value
}

export function calculateAspectRatio(width: number, height: number) {
  const integerWidth = validatePixelDimension(width, 'Lebar')
  const integerHeight = validatePixelDimension(height, 'Tinggi')
  const divisor = gcd(integerWidth, integerHeight)
  return {
    width: integerWidth / divisor,
    height: integerHeight / divisor,
    decimal: width / height,
  }
}

export function calculateProportionalHeight(width: number, height: number, targetWidth: number) {
  validatePixelDimension(targetWidth, 'Lebar target')
  return (positive(height, 'Tinggi') / positive(width, 'Lebar')) * targetWidth
}

export function calculateProportionalWidth(width: number, height: number, targetHeight: number) {
  validatePixelDimension(targetHeight, 'Tinggi target')
  return (positive(width, 'Lebar') / positive(height, 'Tinggi')) * targetHeight
}

export function validateCustomRatio(width: number, height: number) {
  return { width: positive(width, 'Rasio lebar'), height: positive(height, 'Rasio tinggi'), decimal: width / height }
}

export function calculateCssClamp(minSize: number, maxSize: number, minViewport: number, maxViewport: number, rootFontSize = 16) {
  positive(minSize, 'Ukuran minimum')
  positive(maxSize, 'Ukuran maksimum')
  positive(minViewport, 'Viewport minimum')
  positive(maxViewport, 'Viewport maksimum')
  positive(rootFontSize, 'Root font size')
  if (maxSize <= minSize) throw new Error('Ukuran maksimum harus lebih besar dari ukuran minimum.')
  if (maxViewport <= minViewport) throw new Error('Viewport maksimum harus lebih besar dari viewport minimum.')
  const slope = ((maxSize - minSize) / (maxViewport - minViewport)) * 100
  const intercept = minSize - (slope * minViewport) / 100
  return {
    slope,
    intercept,
    css: `clamp(${roundNumber(minSize / rootFontSize, 4)}rem, ${roundNumber(intercept / rootFontSize, 4)}rem + ${roundNumber(slope, 4)}vw, ${roundNumber(maxSize / rootFontSize, 4)}rem)`,
  }
}

export function calculatePercentage(mode: 'of' | 'ratio' | 'change', first: number, second: number) {
  if (!Number.isFinite(first) || !Number.isFinite(second)) throw new Error('Kedua nilai harus berupa angka.')
  if ((mode === 'ratio' || mode === 'change') && second === 0) throw new Error('Nilai pembagi tidak boleh 0.')
  if (mode === 'of') return (first / 100) * second
  if (mode === 'ratio') return (first / second) * 100
  return ((first - second) / Math.abs(second)) * 100
}

export function calculateScreenMetrics(width: number, height: number, diagonal?: number) {
  positive(width, 'Lebar')
  positive(height, 'Tinggi')
  const ratio = calculateAspectRatio(width, height)
  const totalPixels = width * height
  const ppi = diagonal && diagonal > 0 ? Math.sqrt(width ** 2 + height ** 2) / diagonal : null
  return {
    ratio,
    totalPixels,
    megapixels: totalPixels / 1_000_000,
    orientation: width === height ? 'Persegi' : width > height ? 'Landscape' : 'Portrait',
    ppi,
  }
}

const binaryFileFactors: Record<FileSizeUnit, number> = { bit: 1 / 8, B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
const decimalFileFactors: Record<FileSizeUnit, number> = { bit: 1 / 8, B: 1, KB: 1000, MB: 1000 ** 2, GB: 1000 ** 3, TB: 1000 ** 4 }

export function convertFileSize(value: number, from: FileSizeUnit, to: FileSizeUnit, system: 'binary' | 'decimal' = 'binary') {
  if (!Number.isFinite(value) || value < 0) throw new Error('Ukuran file tidak boleh negatif.')
  const factors = system === 'binary' ? binaryFileFactors : decimalFileFactors
  return (value * factors[from]) / factors[to]
}

const bandwidthFactors: Record<BandwidthUnit, number> = { Kbps: 1_000, Mbps: 1_000_000, Gbps: 1_000_000_000 }

export function calculateDownloadSeconds(fileValue: number, fileUnit: Exclude<FileSizeUnit, 'bit'>, speedValue: number, speedUnit: BandwidthUnit, overheadPercent = 0) {
  positive(fileValue, 'Ukuran file')
  positive(speedValue, 'Kecepatan')
  if (!Number.isFinite(overheadPercent) || overheadPercent < 0 || overheadPercent > 100) throw new Error('Overhead harus antara 0 dan 100%.')
  const bits = fileValue * binaryFileFactors[fileUnit] * 8
  return (bits / (speedValue * bandwidthFactors[speedUnit])) * (1 + overheadPercent / 100)
}

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—'
  if (totalSeconds < 1) return `${Math.round(totalSeconds * 1000)} milidetik`
  const seconds = Math.round(totalSeconds)
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  const remainingSeconds = seconds % 60
  return [days && `${days} hari`, hours && `${hours} jam`, minutes && `${minutes} menit`, remainingSeconds && `${remainingSeconds} detik`].filter(Boolean).join(' ') || '0 detik'
}
