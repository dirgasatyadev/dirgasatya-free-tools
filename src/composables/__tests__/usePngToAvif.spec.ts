import { describe, expect, it } from 'vitest'
import {
  calculateSavedPercentage,
  createAvifBaseName,
  createUniqueAvifFileName,
  createAvifFileName,
  defaultAvifQuality,
  formatFileSize,
  maxPngFiles,
  normalizeAvifFileName,
  normalizeAvifBaseName,
  preparePngFiles,
  validatePngFile,
  validateImageDimensions,
} from '@/composables/usePngToAvif'

const createFile = (name: string, type: string, size = 4) =>
  new File([new Uint8Array(size)], name, { type })

describe('PNG to AVIF helpers', () => {
  it('menerima file PNG berdasarkan MIME type', () => {
    expect(validatePngFile(createFile('gambar.png', 'image/png'))).toBeNull()
  })

  it('menerima file berekstensi PNG ketika MIME type tidak tersedia', () => {
    expect(validatePngFile(createFile('gambar.PNG', ''))).toBeNull()
  })

  it('menolak format selain PNG', () => {
    expect(validatePngFile(createFile('gambar.jpg', 'image/jpeg'))).toContain('PNG')
  })

  it('menolak file lebih besar dari 25 MB', () => {
    const oversizedFile = createFile('besar.png', 'image/png', 25 * 1024 * 1024 + 1)
    expect(validatePngFile(oversizedFile)).toContain('25 MB')
  })

  it('membatasi antrean hingga 100 file', () => {
    const files = Array.from({ length: 102 }, (_, index) =>
      createFile(`gambar-${index}.png`, 'image/png'),
    )
    const result = preparePngFiles(files, 0)

    expect(result.acceptedFiles).toHaveLength(maxPngFiles)
    expect(result.errors).toContain('Maksimal 100 file. 2 file tidak ditambahkan.')
  })

  it('memperhitungkan file yang sudah berada dalam antrean', () => {
    const files = Array.from({ length: 5 }, (_, index) =>
      createFile(`tambahan-${index}.png`, 'image/png'),
    )
    const result = preparePngFiles(files, 98)

    expect(result.acceptedFiles).toHaveLength(2)
    expect(result.errors).toContain('Maksimal 100 file. 3 file tidak ditambahkan.')
  })

  it('menggunakan kualitas AVIF default 38 persen', () => {
    expect(defaultAvifQuality).toBe(38)
  })

  it('membuat nama hasil AVIF tanpa menggandakan ekstensi', () => {
    expect(createAvifBaseName('foto.liburan.png')).toBe('foto.liburan')
    expect(createAvifFileName('foto.liburan.png')).toBe('foto.liburan.avif')
    expect(createAvifFileName('foto')).toBe('foto.avif')
  })

  it('menormalkan nama file hasil yang diberikan pengguna', () => {
    expect(normalizeAvifBaseName('hasil terbaru.avif')).toBe('hasil terbaru')
    expect(normalizeAvifFileName('hasil terbaru')).toBe('hasil terbaru.avif')
    expect(normalizeAvifFileName('hasil.avif')).toBe('hasil.avif')
    expect(normalizeAvifFileName('folder/hasil:*?.avif')).toBe('folder-hasil---.avif')
    expect(normalizeAvifFileName('   ')).toBe('converted.avif')
  })

  it('membuat nama unik untuk file dengan nama yang sama di dalam ZIP', () => {
    const usedNames = new Set<string>()

    expect(createUniqueAvifFileName('hasil.avif', usedNames)).toBe('hasil.avif')
    expect(createUniqueAvifFileName('HASIL.avif', usedNames)).toBe('HASIL-2.avif')
    expect(createUniqueAvifFileName('hasil.avif', usedNames)).toBe('hasil-3.avif')
  })

  it('memformat ukuran file untuk ditampilkan', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('menghitung perubahan ukuran hasil', () => {
    expect(calculateSavedPercentage(1000, 380)).toBe(62)
    expect(calculateSavedPercentage(1000, 1200)).toBe(-20)
    expect(calculateSavedPercentage(0, 0)).toBeNull()
  })

  it('memvalidasi dimensi hasil crop sebelum encoding', () => {
    expect(validateImageDimensions(1920, 1080)).toBeNull()
    expect(validateImageDimensions(0, 1080)).toContain('crop')
    expect(validateImageDimensions(10_000, 4_001)).toContain('40 megapiksel')
  })
})
