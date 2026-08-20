import { describe, expect, it } from 'vitest'
import {
  calculateFaviconDrawRect,
  createFaviconAssetUrl,
  createFaviconBaseName,
  createFaviconFileName,
  createFaviconHtmlSnippet,
  createFaviconManifest,
  createPngIco,
  faviconSizes,
  validateFaviconSource,
} from '@/composables/useFaviconGenerator'

describe('Favicon Generator helpers', () => {
  it('menyediakan seluruh 13 ukuran favicon PNG', () => {
    expect(faviconSizes.map((item) => item.size)).toEqual([
      16, 32, 48, 64, 96, 120, 152, 167, 180, 192, 384, 512, 1024,
    ])
  })

  it('hanya menerima sumber PNG', () => {
    expect(validateFaviconSource(new File(['png'], 'logo.png', { type: 'image/png' }))).toBeNull()
    expect(validateFaviconSource(new File(['jpg'], 'logo.jpg', { type: 'image/jpeg' }))).toBe(
      'Sumber favicon wajib berformat PNG.',
    )
  })

  it('membuat nama file sesuai kelompok ukuran', () => {
    expect(createFaviconBaseName('brand icon.png')).toBe('brand icon')
    expect(createFaviconFileName('brand', 32)).toBe('brand-32x32.png')
    expect(createFaviconFileName('brand', 180)).toBe('brand-apple-touch-180x180.png')
    expect(createFaviconFileName('brand', 512)).toBe('brand-pwa-512x512.png')
    expect(createFaviconFileName('brand', 1024)).toBe('brand-master-1024x1024.png')
  })

  it('menghitung posisi contain dan cover dari tengah', () => {
    expect(calculateFaviconDrawRect(400, 200, 100, 'contain')).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    })
    expect(calculateFaviconDrawRect(400, 200, 100, 'cover')).toEqual({
      x: -50,
      y: 0,
      width: 200,
      height: 100,
    })
  })

  it('membuat URL aset relatif atau absolut untuk manifest', () => {
    expect(createFaviconAssetUrl('', 'brand-192x192.png')).toBe('/brand-192x192.png')
    expect(createFaviconAssetUrl('example.com', 'brand icon.png', '/icons/')).toBe(
      'https://example.com/icons/brand%20icon.png',
    )
  })

  it('membuat manifest web app hanya dari ukuran yang dipilih', () => {
    const manifest = JSON.parse(
      createFaviconManifest('https://example.com/assets', 'Brand App', '#ffffff', [
        { size: 192, fileName: 'brand-pwa-192x192.png' },
        { size: 512, fileName: 'brand-pwa-512x512.png' },
      ], '/icons/'),
    ) as {
      name: string
      start_url: string
      icons: { src: string; sizes: string; type: string }[]
    }

    expect(manifest.name).toBe('Brand App')
    expect(manifest.start_url).toBe('https://example.com/assets')
    expect(manifest.icons).toHaveLength(2)
    expect(manifest.icons[1]).toEqual(
      expect.objectContaining({
        src: 'https://example.com/icons/brand-pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      }),
    )
  })

  it('membuat snippet dan ICO multi-size berbasis PNG', async () => {
    expect(createFaviconHtmlSnippet('brand', '/icons/')).toContain('/icons/favicon.ico')
    expect(createFaviconHtmlSnippet('brand', '/icons/')).toContain('brand-32x32.png')
    const ico = await createPngIco([
      { size: 16, blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }) },
      { size: 32, blob: new Blob([new Uint8Array([4, 5])], { type: 'image/png' }) },
    ])
    const header = new DataView(await ico.arrayBuffer())
    expect(header.getUint16(2, true)).toBe(1)
    expect(header.getUint16(4, true)).toBe(2)
  })
})
