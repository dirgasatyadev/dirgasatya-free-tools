import { computed, onBeforeUnmount, ref } from 'vue'

export const faviconSizes = [
  { size: 16, label: 'Favicon browser kecil', group: 'Browser' },
  { size: 32, label: 'Favicon browser standar', group: 'Browser' },
  { size: 48, label: 'Resolusi lebih tinggi / legacy', group: 'Browser' },
  { size: 64, label: 'Ukuran browser opsional', group: 'Browser' },
  { size: 96, label: 'Ukuran browser opsional', group: 'Browser' },
  { size: 120, label: 'Apple touch icon lama', group: 'Apple' },
  { size: 152, label: 'iPad', group: 'Apple' },
  { size: 167, label: 'iPad Pro', group: 'Apple' },
  { size: 180, label: 'Apple Touch Icon modern', group: 'Apple' },
  { size: 192, label: 'PWA / Android minimum umum', group: 'PWA' },
  { size: 384, label: 'PWA opsional', group: 'PWA' },
  { size: 512, label: 'PWA utama', group: 'PWA' },
  { size: 1024, label: 'Master / high-resolution opsional', group: 'Master' },
] as const

export type FaviconFitMode = 'contain' | 'cover'
export type FaviconResultStatus = 'queued' | 'processing' | 'completed' | 'error'

export interface FaviconResult {
  size: number
  label: string
  group: string
  blob: Blob | null
  previewUrl: string
  status: FaviconResultStatus
  errorMessage: string
}

const maxPngSize = 25 * 1024 * 1024
const maxPngPixels = 40_000_000

export function validateFaviconSource(file: File) {
  if (file.type !== 'image/png' && !file.name.toLocaleLowerCase('en').endsWith('.png')) {
    return 'Sumber favicon wajib berformat PNG.'
  }
  if (file.size > maxPngSize) return 'Ukuran PNG maksimal 25 MB.'
  return null
}

export function createFaviconBaseName(fileName: string) {
  const name = fileName.replace(/\.png$/i, '')
  const safeName = Array.from(name)
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 120)
  return safeName || 'favicon'
}

export function createFaviconFileName(baseName: string, size: number) {
  const safeBaseName = createFaviconBaseName(baseName)
  if (size >= 120 && size <= 180) return `${safeBaseName}-apple-touch-${size}x${size}.png`
  if (size >= 192 && size <= 512) return `${safeBaseName}-pwa-${size}x${size}.png`
  if (size === 1024) return `${safeBaseName}-master-${size}x${size}.png`
  return `${safeBaseName}-${size}x${size}.png`
}

export function normalizeFaviconWebsiteUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withProtocol)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL website harus menggunakan http atau https.')
  }
  return url.href.replace(/\/$/, '')
}

export function normalizeFaviconAssetPath(value: string) {
  const trimmed = value.trim().replace(/\\/g, '/')
  if (!trimmed) return '/'
  const safe = trimmed.split('/').filter(Boolean).map((part) => encodeURIComponent(part)).join('/')
  return `/${safe}${safe ? '/' : ''}`
}

export function createFaviconAssetUrl(websiteUrl: string, fileName: string, assetPath = '/') {
  const normalizedUrl = normalizeFaviconWebsiteUrl(websiteUrl)
  const encodedFileName = encodeURIComponent(fileName)
  const path = `${normalizeFaviconAssetPath(assetPath)}${encodedFileName}`
  return normalizedUrl ? new URL(path, `${normalizedUrl}/`).href : path
}

export function createFaviconManifest(
  websiteUrl: string,
  appName: string,
  backgroundColor: string,
  icons: readonly { size: number; fileName: string; purpose?: 'any' | 'maskable' }[],
  assetPath = '/',
) {
  const normalizedUrl = normalizeFaviconWebsiteUrl(websiteUrl)
  const safeAppName = createFaviconBaseName(appName)
  return JSON.stringify(
    {
      name: safeAppName,
      short_name: safeAppName.slice(0, 12),
      start_url: normalizedUrl || '/',
      scope: normalizedUrl || '/',
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: backgroundColor,
      icons: icons.map((icon) => ({
        src: createFaviconAssetUrl(websiteUrl, icon.fileName, assetPath),
        sizes: `${icon.size}x${icon.size}`,
        type: 'image/png',
        purpose: icon.purpose ?? 'any',
      })),
    },
    null,
    2,
  )
}

export function createFaviconHtmlSnippet(baseName = 'favicon', assetPath = '/icons/') {
  const path = normalizeFaviconAssetPath(assetPath)
  const safeBaseName = createFaviconBaseName(baseName)
  return [
    `<link rel="icon" href="${path}favicon.ico" sizes="any">`,
    `<link rel="icon" type="image/svg+xml" href="${path}favicon.svg">`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${path}${safeBaseName}-32x32.png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${path}${safeBaseName}-apple-touch-180x180.png">`,
    '<link rel="manifest" href="/manifest.webmanifest">',
  ].join('\n')
}

export async function createPngIco(images: readonly { size: number; blob: Blob }[]) {
  if (!images.length) throw new Error('ICO membutuhkan minimal satu PNG.')
  const entries = await Promise.all(images.map(async (image) => ({ ...image, bytes: new Uint8Array(await image.blob.arrayBuffer()) })))
  const headerSize = 6 + entries.length * 16
  const totalSize = headerSize + entries.reduce((total, entry) => total + entry.bytes.length, 0)
  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  view.setUint16(0, 0, true); view.setUint16(2, 1, true); view.setUint16(4, entries.length, true)
  let offset = headerSize
  entries.forEach((entry, index) => {
    const entryOffset = 6 + index * 16
    view.setUint8(entryOffset, entry.size >= 256 ? 0 : entry.size)
    view.setUint8(entryOffset + 1, entry.size >= 256 ? 0 : entry.size)
    view.setUint8(entryOffset + 2, 0); view.setUint8(entryOffset + 3, 0)
    view.setUint16(entryOffset + 4, 1, true); view.setUint16(entryOffset + 6, 32, true)
    view.setUint32(entryOffset + 8, entry.bytes.length, true); view.setUint32(entryOffset + 12, offset, true)
    new Uint8Array(buffer, offset, entry.bytes.length).set(entry.bytes)
    offset += entry.bytes.length
  })
  return new Blob([buffer], { type: 'image/x-icon' })
}

export async function createSvgFavicon(source: Blob) {
  const bytes = new Uint8Array(await source.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const dataUrl = `data:${source.type || 'image/png'};base64,${btoa(binary)}`
  return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image href="${dataUrl}" width="512" height="512" preserveAspectRatio="xMidYMid meet"/></svg>`], { type: 'image/svg+xml' })
}

export async function createMaskableIcon(source: Blob, size: number, backgroundColor: string) {
  const bitmap = await createImageBitmap(source)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Browser tidak dapat membuat ikon maskable.')
    context.fillStyle = backgroundColor
    context.fillRect(0, 0, size, size)
    const safeSize = size * 0.8
    const rect = calculateFaviconDrawRect(bitmap.width, bitmap.height, safeSize, 'contain')
    context.drawImage(bitmap, (size - safeSize) / 2 + rect.x, (size - safeSize) / 2 + rect.y, rect.width, rect.height)
    return canvasToPngBlob(canvas)
  } finally { bitmap.close() }
}

export function calculateFaviconDrawRect(
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
  fitMode: FaviconFitMode,
) {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetSize <= 0) {
    throw new Error('Dimensi gambar tidak valid.')
  }
  const scale =
    fitMode === 'cover'
      ? Math.max(targetSize / sourceWidth, targetSize / sourceHeight)
      : Math.min(targetSize / sourceWidth, targetSize / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return {
    x: (targetSize - width) / 2,
    y: (targetSize - height) / 2,
    width,
    height,
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob?.type === 'image/png') resolve(blob)
      else reject(new Error('Browser tidak dapat membuat favicon PNG.'))
    }, 'image/png')
  })
}

export function useFaviconGenerator() {
  const sourceFile = ref<File | null>(null)
  const sourcePreviewUrl = ref('')
  const baseName = ref('favicon')
  const fitMode = ref<FaviconFitMode>('contain')
  const transparentBackground = ref(true)
  const backgroundColor = ref('#ffffff')
  const results = ref<FaviconResult[]>([])
  const isProcessing = ref(false)
  const isDragging = ref(false)
  const errorMessage = ref('')

  const completedCount = computed(
    () => results.value.filter((result) => result.status === 'completed').length,
  )
  const progressPercentage = computed(() =>
    results.value.length === 0
      ? 0
      : Math.round((completedCount.value / results.value.length) * 100),
  )
  const allCompleted = computed(
    () => results.value.length === faviconSizes.length && completedCount.value === results.value.length,
  )

  function revokeUrl(url: string) {
    if (url) URL.revokeObjectURL(url)
  }

  function clearResults() {
    for (const result of results.value) revokeUrl(result.previewUrl)
    results.value = []
  }

  async function generate() {
    const file = sourceFile.value
    if (!file || isProcessing.value) return
    isProcessing.value = true
    errorMessage.value = ''
    clearResults()
    results.value = faviconSizes.map((item) => ({
      ...item,
      blob: null,
      previewUrl: '',
      status: 'queued',
      errorMessage: '',
    }))

    let bitmap: ImageBitmap | undefined
    try {
      bitmap = await createImageBitmap(file)
      if (bitmap.width <= 0 || bitmap.height <= 0) throw new Error('Dimensi PNG tidak valid.')
      if (bitmap.width * bitmap.height > maxPngPixels) {
        throw new Error('Resolusi PNG maksimal 40 megapiksel.')
      }

      for (const result of results.value) {
        result.status = 'processing'
        try {
          const canvas = document.createElement('canvas')
          canvas.width = result.size
          canvas.height = result.size
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Browser tidak dapat memproses canvas.')
          if (!transparentBackground.value) {
            context.fillStyle = backgroundColor.value
            context.fillRect(0, 0, result.size, result.size)
          }
          context.imageSmoothingEnabled = true
          context.imageSmoothingQuality = 'high'
          const drawRect = calculateFaviconDrawRect(
            bitmap.width,
            bitmap.height,
            result.size,
            fitMode.value,
          )
          context.drawImage(bitmap, drawRect.x, drawRect.y, drawRect.width, drawRect.height)
          result.blob = await canvasToPngBlob(canvas)
          result.previewUrl = URL.createObjectURL(result.blob)
          result.status = 'completed'
        } catch (error) {
          result.status = 'error'
          result.errorMessage = error instanceof Error ? error.message : 'Ukuran ini gagal dibuat.'
        }
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Favicon tidak dapat dibuat.'
      for (const result of results.value) {
        if (result.status !== 'completed') result.status = 'error'
      }
    } finally {
      bitmap?.close()
      isProcessing.value = false
    }
  }

  async function setSourceFile(file: File) {
    if (isProcessing.value) return
    const validationError = validateFaviconSource(file)
    if (validationError) {
      errorMessage.value = validationError
      return
    }
    revokeUrl(sourcePreviewUrl.value)
    clearResults()
    sourceFile.value = file
    sourcePreviewUrl.value = URL.createObjectURL(file)
    baseName.value = createFaviconBaseName(file.name)
    errorMessage.value = ''
    await generate()
  }

  function reset() {
    if (isProcessing.value) return
    revokeUrl(sourcePreviewUrl.value)
    clearResults()
    sourceFile.value = null
    sourcePreviewUrl.value = ''
    baseName.value = 'favicon'
    errorMessage.value = ''
  }

  onBeforeUnmount(() => {
    revokeUrl(sourcePreviewUrl.value)
    clearResults()
  })

  return {
    sourceFile,
    sourcePreviewUrl,
    baseName,
    fitMode,
    transparentBackground,
    backgroundColor,
    results,
    isProcessing,
    isDragging,
    errorMessage,
    completedCount,
    progressPercentage,
    allCompleted,
    setSourceFile,
    generate,
    reset,
  }
}
