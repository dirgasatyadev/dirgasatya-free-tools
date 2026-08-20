import { describe, expect, it } from 'vitest'
import {
  calculateChromaOpacity,
  defaultEdgeSoftness,
  createTransparentPngBaseName,
  createUniquePngFileName,
  detectGreenScreenKeyColor,
  getClampedSampleArea,
  maxGreenScreenFiles,
  normalizePngFileName,
  prepareGreenScreenFiles,
  validateGreenScreenFile,
} from '@/composables/useGreenScreenRemover'

const createFile = (name: string, type: string, size = 4) =>
  new File([new Uint8Array(size)], name, { type })

describe('Green Screen Remover helpers', () => {
  it('menggunakan kelembutan tepi default 100 persen', () => {
    expect(defaultEdgeSoftness).toBe(100)
  })

  it('menerima format gambar yang didukung', () => {
    expect(validateGreenScreenFile(createFile('foto.png', 'image/png'))).toBeNull()
    expect(validateGreenScreenFile(createFile('foto.jpg', 'image/jpeg'))).toBeNull()
    expect(validateGreenScreenFile(createFile('foto.webp', 'image/webp'))).toBeNull()
    expect(validateGreenScreenFile(createFile('foto.avif', 'image/avif'))).toBeNull()
  })

  it('menolak format bukan gambar dan file terlalu besar', () => {
    expect(validateGreenScreenFile(createFile('video.mp4', 'video/mp4'))).toContain('PNG')
    expect(
      validateGreenScreenFile(createFile('besar.png', 'image/png', 25 * 1024 * 1024 + 1)),
    ).toContain('25 MB')
  })

  it('membatasi antrean hingga 100 gambar', () => {
    const files = Array.from({ length: 4 }, (_, index) =>
      createFile(`foto-${index}.png`, 'image/png'),
    )
    const result = prepareGreenScreenFiles(files, 98)
    expect(result.acceptedFiles).toHaveLength(2)
    expect(result.errors).toContain(`Maksimal ${maxGreenScreenFiles} file. 2 file tidak ditambahkan.`)
  })

  it('menghapus hijau dominan dan mempertahankan warna non-hijau', () => {
    expect(calculateChromaOpacity(20, 240, 30, 55, 24)).toBeLessThan(0.1)
    expect(
      calculateChromaOpacity(8, 105, 18, 55, 24, { red: 18, green: 164, blue: 54 }),
    ).toBeLessThan(0.1)
    expect(calculateChromaOpacity(220, 30, 40, 55, 24)).toBe(1)
    expect(calculateChromaOpacity(120, 125, 120, 55, 24)).toBe(1)
    expect(calculateChromaOpacity(160, 160, 25, 55, 24)).toBe(1)
    expect(
      calculateChromaOpacity(55, 79, 52, 55, 24, { red: 18, green: 164, blue: 54 }),
    ).toBe(1)
  })

  it('dapat menggunakan warna pilihan eyedropper sebagai chroma key', () => {
    const blueKey = { red: 20, green: 40, blue: 220 }
    expect(calculateChromaOpacity(22, 42, 218, 40, 20, blueKey)).toBe(0)
    expect(calculateChromaOpacity(220, 40, 20, 40, 20, blueKey)).toBe(1)
  })

  it('membuat transisi alpha lebih lebar ketika kelembutan tepi dinaikkan', () => {
    const sharpOpacity = calculateChromaOpacity(30, 200, 40, 55, 10)
    const softOpacity = calculateChromaOpacity(30, 200, 40, 55, 95)

    expect(softOpacity).toBeGreaterThan(0)
    expect(softOpacity).toBeLessThan(1)
    expect(softOpacity).toBeLessThan(sharpOpacity)
  })

  it('mendeteksi warna green screen dari tepi gambar secara otomatis', () => {
    const width = 10
    const height = 10
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1
        pixels[index] = isBorder ? 18 : 210
        pixels[index + 1] = isBorder ? 164 : 40
        pixels[index + 2] = isBorder ? 54 : 35
        pixels[index + 3] = 255
      }
    }

    expect(detectGreenScreenKeyColor(pixels, width, height)).toEqual({
      red: 18,
      green: 164,
      blue: 54,
    })
  })

  it('tidak menganggap sedikit objek hijau di tepi sebagai green screen', () => {
    const width = 20
    const height = 20
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let index = 0; index < pixels.length; index += 4) {
      pixels[index] = 120
      pixels[index + 1] = 120
      pixels[index + 2] = 120
      pixels[index + 3] = 255
    }
    for (let x = 0; x < 8; x += 1) {
      const index = x * 4
      pixels[index] = 10
      pixels[index + 1] = 180
      pixels[index + 2] = 30
    }

    expect(detectGreenScreenKeyColor(pixels, width, height)).toBeNull()
  })

  it('tidak mendeteksi hijau kusam sebagai warna chroma otomatis', () => {
    const width = 10
    const height = 10
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let index = 0; index < pixels.length; index += 4) {
      pixels[index] = 55
      pixels[index + 1] = 79
      pixels[index + 2] = 52
      pixels[index + 3] = 255
    }

    expect(detectGreenScreenKeyColor(pixels, width, height)).toBeNull()
  })

  it('menjaga area eyedropper 20 piksel tetap di dalam gambar', () => {
    expect(getClampedSampleArea(100, 80, 50, 40)).toEqual({
      x: 40,
      y: 30,
      width: 20,
      height: 20,
    })
    expect(getClampedSampleArea(100, 80, 2, 79)).toEqual({
      x: 0,
      y: 60,
      width: 20,
      height: 20,
    })
  })

  it('membuat dan menormalkan nama PNG hasil', () => {
    expect(createTransparentPngBaseName('model.jpeg')).toBe('model-transparent')
    expect(normalizePngFileName('hasil.png')).toBe('hasil.png')
    expect(normalizePngFileName('folder/hasil:*?')).toBe('folder-hasil---.png')
  })

  it('mencegah nama ganda di hasil download semua', () => {
    const usedNames = new Set<string>()
    expect(createUniquePngFileName('hasil', usedNames)).toBe('hasil.png')
    expect(createUniquePngFileName('HASIL.png', usedNames)).toBe('HASIL-2.png')
  })
})
