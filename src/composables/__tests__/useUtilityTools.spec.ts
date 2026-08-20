import { describe, expect, it } from 'vitest'
import { generateJwt } from '@/composables/useCryptoTools'
import {
  analyzeText,
  csvToJson,
  dateToUnix,
  decodeBase64,
  decodeJwt,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  formatJson,
  generateMetaTags,
  generateUuidBatch,
  getJwtTimeStatus,
  jsonToCsv,
  minifyJson,
  parseUnixTimestamp,
  replaceRegex,
  testRegex,
  verifyJwt,
} from '@/composables/useUtilityTools'

describe('utility tools', () => {
  it('format dan minify JSON', () => {
    expect(formatJson('{"a":1}', 2)).toBe('{\n  "a": 1\n}')
    expect(minifyJson('{\n "a": 1\n}')).toBe('{"a":1}')
    expect(() => formatJson('{x}', 2)).toThrow('JSON tidak valid')
  })

  it('encode dan decode Base64 Unicode', () => {
    const encoded = encodeBase64('Halo 🌏')
    expect(decodeBase64(encoded)).toBe('Halo 🌏')
    expect(() => decodeBase64('%%%')).toThrow('Base64 tidak valid')
  })

  it('encode dan decode URL', () => {
    expect(encodeUrl('a b&c', 'component')).toBe('a%20b%26c')
    expect(decodeUrl('a%20b%26c', 'component')).toBe('a b&c')
    expect(encodeUrl('https://example.com/a b', 'full')).toContain('https://')
  })

  it('membuat batch UUID v4 unik', () => {
    const values = generateUuidBatch(5)
    expect(new Set(values).size).toBe(5)
    expect(values.every((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))).toBe(true)
    expect(() => generateUuidBatch(101)).toThrow('antara 1 dan 100')
  })

  it('decode dan verifikasi JWT HMAC', async () => {
    const token = await generateJwt('{}', '{"sub":"1","exp":4102444800}', 'secret-value', 'HS256')
    expect(decodeJwt(token).payload.sub).toBe('1')
    await expect(verifyJwt(token, 'secret-value')).resolves.toBe(true)
    await expect(verifyJwt(token, 'wrong')).resolves.toBe(false)
    expect(getJwtTimeStatus({ exp: 100 }, 101).isExpired).toBe(true)
  })

  it('menguji regex, group, dan replacement', () => {
    const matches = testRegex('(dearga)\\s+(tools)', 'gi', 'Dearga Tools dearga tools')
    expect(matches).toHaveLength(2)
    expect(matches[0]?.groups).toEqual(['Dearga', 'Tools'])
    expect(replaceRegex('tools', 'gi', 'Tools tools', 'apps')).toBe('apps apps')
  })

  it('konversi timestamp detik, milidetik, dan tanggal', () => {
    expect(parseUnixTimestamp('0', 'seconds').toISOString()).toBe('1970-01-01T00:00:00.000Z')
    expect(parseUnixTimestamp('1000', 'milliseconds').getTime()).toBe(1000)
    expect(dateToUnix('1970-01-01T00:00:01.000Z').seconds).toBe(1)
  })

  it('menghitung statistik teks Unicode', () => {
    expect(analyzeText('Halo dunia!\n\nParagraf kedua.')).toMatchObject({
      words: 4,
      sentences: 2,
      paragraphs: 2,
      lines: 3,
    })
  })

  it('konversi JSON dan CSV dengan quoted cell', () => {
    const csv = jsonToCsv('[{"name":"Dearga, Tools","note":"a\\nb"}]')
    expect(csv).toContain('"Dearga, Tools"')
    expect(csv).toContain('"a\nb"')
    expect(JSON.parse(csvToJson(csv))).toEqual([{ name: 'Dearga, Tools', note: 'a\nb' }])
  })

  it('membuat meta tag yang aman', () => {
    const tags = generateMetaTags({
      title: 'Dearga <Tools>', description: 'A & B', url: 'https://example.com',
      imageUrl: 'https://example.com/og.png', siteName: 'Dearga', author: '', keywords: '',
      robots: 'index, follow', twitterCard: 'summary_large_image',
    })
    expect(tags).toContain('<title>Dearga &lt;Tools&gt;</title>')
    expect(tags).toContain('property="og:image"')
    expect(tags).not.toContain('<Tools>')
  })
})
