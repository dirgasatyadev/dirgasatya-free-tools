export function getDeviceMemoryGb() {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { deviceMemory?: number }).deviceMemory
}

export function getAdaptiveGreenScreenPixelLimit(deviceMemoryGb = getDeviceMemoryGb()) {
  if (!deviceMemoryGb) return 24_000_000
  if (deviceMemoryGb <= 2) return 8_000_000
  if (deviceMemoryGb <= 4) return 16_000_000
  if (deviceMemoryGb <= 8) return 24_000_000
  return 40_000_000
}

export function getAdaptiveAvifPixelLimit(deviceMemoryGb = getDeviceMemoryGb()) {
  if (!deviceMemoryGb) return 16_000_000
  if (deviceMemoryGb <= 2) return 8_000_000
  if (deviceMemoryGb <= 4) return 12_000_000
  if (deviceMemoryGb <= 8) return 20_000_000
  if (deviceMemoryGb <= 16) return 32_000_000
  return 40_000_000
}

export function getAdaptiveWebpPixelLimit(deviceMemoryGb = getDeviceMemoryGb()) {
  if (!deviceMemoryGb) return 24_000_000
  if (deviceMemoryGb <= 2) return 8_000_000
  if (deviceMemoryGb <= 4) return 16_000_000
  if (deviceMemoryGb <= 8) return 24_000_000
  return 40_000_000
}

export function getAdaptiveCompressorPixelLimit(deviceMemoryGb = getDeviceMemoryGb()) {
  if (!deviceMemoryGb) return 20_000_000
  if (deviceMemoryGb <= 2) return 8_000_000
  if (deviceMemoryGb <= 4) return 14_000_000
  if (deviceMemoryGb <= 8) return 24_000_000
  return 40_000_000
}

export function estimateImageWorkingSet(width: number, height: number, bytesPerPixel = 24) {
  return Math.max(0, width) * Math.max(0, height) * bytesPerPixel
}

export function formatMegapixelLimit(pixels: number) {
  return `${Math.round(pixels / 1_000_000)} MP`
}

export function supportsOffscreenImageProcessing() {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof OffscreenCanvas.prototype.convertToBlob === 'function' && typeof createImageBitmap === 'function'
}
