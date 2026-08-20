import type { JwtAlgorithm } from '@/composables/useCryptoTools'

export function formatJson(value: string, indent: 2 | 4 | '\t' = 2) {
  if (!value.trim()) throw new Error('JSON tidak boleh kosong.')
  try {
    return JSON.stringify(JSON.parse(value), null, indent)
  } catch (error) {
    throw new Error(error instanceof SyntaxError ? `JSON tidak valid: ${error.message}` : 'JSON tidak valid.')
  }
}

export function minifyJson(value: string) {
  if (!value.trim()) throw new Error('JSON tidak boleh kosong.')
  try {
    return JSON.stringify(JSON.parse(value))
  } catch (error) {
    throw new Error(error instanceof SyntaxError ? `JSON tidak valid: ${error.message}` : 'JSON tidak valid.')
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const normalized = value.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!normalized) return new Uint8Array()
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    throw new Error('Base64 tidak valid.')
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function encodeBase64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value))
}

export function decodeBase64(value: string) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(value))
  } catch (error) {
    if (error instanceof Error && error.message === 'Base64 tidak valid.') throw error
    throw new Error('Base64 bukan teks UTF-8 yang valid.')
  }
}

export type UrlEncodingMode = 'component' | 'full'

export function encodeUrl(value: string, mode: UrlEncodingMode) {
  return mode === 'component' ? encodeURIComponent(value) : encodeURI(value)
}

export function decodeUrl(value: string, mode: UrlEncodingMode) {
  try {
    return mode === 'component' ? decodeURIComponent(value) : decodeURI(value)
  } catch {
    throw new Error('URL encoded tidak valid.')
  }
}

export function generateUuidV4() {
  return crypto.randomUUID()
}

export function generateUuidBatch(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('Jumlah UUID harus antara 1 dan 100.')
  }
  return Array.from({ length: count }, generateUuidV4)
}

function decodeBase64UrlJson(value: string, label: string) {
  try {
    const text = new TextDecoder().decode(base64ToBytes(value))
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed as Record<string, unknown>
  } catch {
    throw new Error(`${label} JWT tidak valid.`)
  }
}

export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  signingInput: string
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.')
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error('JWT harus terdiri dari tiga bagian.')
  }
  const [headerPart = '', payloadPart = '', signature = ''] = parts
  return {
    header: decodeBase64UrlJson(headerPart, 'Header'),
    payload: decodeBase64UrlJson(payloadPart, 'Payload'),
    signature,
    signingInput: `${headerPart}.${payloadPart}`,
  }
}

const jwtVerificationAlgorithms: Record<JwtAlgorithm, 'SHA-256' | 'SHA-384' | 'SHA-512'> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

export async function verifyJwt(token: string, secret: string) {
  if (!secret) throw new Error('Secret JWT wajib diisi untuk verifikasi.')
  const decoded = decodeJwt(token)
  const algorithm = decoded.header.alg
  if (algorithm !== 'HS256' && algorithm !== 'HS384' && algorithm !== 'HS512') {
    throw new Error('Verifier hanya mendukung JWT HMAC HS256, HS384, dan HS512.')
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: jwtVerificationAlgorithms[algorithm] },
    false,
    ['verify'],
  )
  return crypto.subtle.verify(
    'HMAC',
    key,
    base64ToBytes(decoded.signature),
    new TextEncoder().encode(decoded.signingInput),
  )
}

export function getJwtTimeStatus(payload: Record<string, unknown>, nowSeconds = Date.now() / 1000) {
  const expiration = typeof payload.exp === 'number' ? payload.exp : null
  const notBefore = typeof payload.nbf === 'number' ? payload.nbf : null
  return {
    expiration,
    notBefore,
    isExpired: expiration !== null && nowSeconds >= expiration,
    isNotActive: notBefore !== null && nowSeconds < notBefore,
  }
}

export interface RegexMatchResult {
  value: string
  index: number
  groups: string[]
}

export function testRegex(pattern: string, flags: string, text: string, maxMatches = 500) {
  if (pattern.length > 2_000) throw new Error('Pola regex maksimal 2.000 karakter.')
  if (text.length > 200_000) throw new Error('Teks uji maksimal 200.000 karakter.')
  let regex: RegExp
  try {
    regex = new RegExp(pattern, flags)
  } catch (error) {
    throw new Error(error instanceof SyntaxError ? error.message : 'Pola regex tidak valid.')
  }
  const matches: RegexMatchResult[] = []
  if (!regex.global) {
    const match = regex.exec(text)
    if (match) {
      matches.push({ value: match[0], index: match.index, groups: match.slice(1).map((value) => value ?? '') })
    }
    return matches
  }
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) && matches.length < maxMatches) {
    matches.push({ value: match[0], index: match.index, groups: match.slice(1).map((value) => value ?? '') })
    if (match[0] === '') regex.lastIndex += 1
  }
  return matches
}

export function replaceRegex(pattern: string, flags: string, text: string, replacement: string) {
  if (pattern.length > 2_000 || text.length > 200_000) throw new Error('Input regex terlalu panjang.')
  try {
    return text.replace(new RegExp(pattern, flags), replacement)
  } catch (error) {
    throw new Error(error instanceof SyntaxError ? error.message : 'Pola regex tidak valid.')
  }
}

export function parseUnixTimestamp(value: string, unit: 'auto' | 'seconds' | 'milliseconds' = 'auto') {
  const numeric = Number(value.trim())
  if (!Number.isFinite(numeric)) throw new Error('Timestamp harus berupa angka.')
  const milliseconds = unit === 'milliseconds' || (unit === 'auto' && Math.abs(numeric) >= 1e11)
    ? numeric
    : numeric * 1_000
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) throw new Error('Timestamp berada di luar rentang tanggal.')
  return date
}

export function dateToUnix(dateValue: string) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) throw new Error('Tanggal tidak valid.')
  return { seconds: Math.floor(date.getTime() / 1_000), milliseconds: date.getTime(), date }
}

export function analyzeText(value: string) {
  const words = value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
  const sentences = value.trim() ? value.split(/[.!?]+(?:\s|$)/u).filter((item) => item.trim()).length : 0
  const paragraphs = value.trim() ? value.split(/\n\s*\n/u).filter((item) => item.trim()).length : 0
  const readingMinutes = words.length === 0 ? 0 : Math.max(1, Math.ceil(words.length / 200))
  return {
    words: words.length,
    characters: value.length,
    charactersWithoutSpaces: value.replace(/\s/gu, '').length,
    sentences,
    paragraphs,
    lines: value ? value.split(/\r?\n/u).length : 0,
    readingMinutes,
  }
}

export type CsvDelimiter = ',' | ';' | '\t' | '|'
export interface CsvOptions {
  delimiter?: CsvDelimiter
  includeBom?: boolean
  includeHeader?: boolean
  hasHeader?: boolean
  strict?: boolean
  inferTypes?: boolean
}

function csvCell(value: unknown, delimiter: CsvDelimiter) {
  const stringValue = value === null || value === undefined
    ? ''
    : typeof value === 'object' ? JSON.stringify(value) : String(value)
  return stringValue.includes(delimiter) || /["\r\n]/u.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
}

function parseJsonRows(value: string, jsonLines = false) {
  let parsed: unknown
  try {
    parsed = jsonLines
      ? value.replace(/^\uFEFF/u, '').split(/\r?\n/u).filter((line) => line.trim()).map((line) => JSON.parse(line))
      : JSON.parse(value.replace(/^\uFEFF/u, ''))
  } catch {
    throw new Error(jsonLines ? 'JSON Lines tidak valid.' : 'JSON tidak valid.')
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed]
  if (rows.length === 0) return []
  if (rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error(`${jsonLines ? 'JSON Lines' : 'JSON'} harus berisi object.`)
  }
  return rows as Record<string, unknown>[]
}

export function jsonToCsv(value: string, options: CsvOptions = {}) {
  const objects = parseJsonRows(value)
  if (!objects.length) return ''
  const delimiter = options.delimiter ?? ','
  const headers = Array.from(new Set(objects.flatMap((row) => Object.keys(row))))
  const rows = [
    ...(options.includeHeader === false ? [] : [headers.map((cell) => csvCell(cell, delimiter)).join(delimiter)]),
    ...objects.map((row) => headers.map((key) => csvCell(row[key], delimiter)).join(delimiter)),
  ]
  return `${options.includeBom ? '\uFEFF' : ''}${rows.join('\n')}`
}

export function detectCsvDelimiter(value: string): CsvDelimiter {
  const candidates: CsvDelimiter[] = [',', ';', '\t', '|']
  const counts = new Map(candidates.map((delimiter) => [delimiter, 0]))
  let quoted = false
  for (const character of value.replace(/^\uFEFF/u, '')) {
    if (character === '"') quoted = !quoted
    else if (!quoted && character === '\n') break
    else if (!quoted && counts.has(character as CsvDelimiter)) counts.set(character as CsvDelimiter, counts.get(character as CsvDelimiter)! + 1)
  }
  return candidates.reduce((best, candidate) => counts.get(candidate)! > counts.get(best)! ? candidate : best, ',')
}

export function parseCsv(value: string, delimiter: CsvDelimiter = ',', strict = true) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const normalizedValue = value.replace(/^\uFEFF/u, '')
  let justClosedQuote = false
  for (let index = 0; index < normalizedValue.length; index += 1) {
    const character = normalizedValue[index]
    if (quoted) {
      if (character === '"' && normalizedValue[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') { quoted = false; justClosedQuote = true }
      else cell += character
    } else if (character === '"') {
      if (strict && cell.length > 0) throw new Error(`CSV tidak valid: tanda kutip harus berada di awal cell (karakter ${index + 1}).`)
      quoted = true
    } else if (character === delimiter) {
      row.push(cell)
      cell = ''
      justClosedQuote = false
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/u, ''))
      rows.push(row)
      row = []
      cell = ''
      justClosedQuote = false
    } else if (character === '\r' && normalizedValue[index + 1] === '\n') continue
    else {
      if (strict && justClosedQuote && !/\s/u.test(character!)) throw new Error(`CSV tidak valid: karakter setelah penutup kutip pada posisi ${index + 1}.`)
      cell += character
    }
  }
  if (quoted) throw new Error('CSV tidak valid: tanda kutip belum ditutup.')
  if (cell || row.length) {
    row.push(cell.replace(/\r$/u, ''))
    rows.push(row)
  }
  return rows
}

export async function* parseCsvStream(source: Blob, delimiter: CsvDelimiter = ',', strict = true): AsyncGenerator<string[]> {
  const reader = source.stream().getReader()
  const decoder = new TextDecoder()
  let row: string[] = []
  let cell = ''
  let quoted = false
  let justClosedQuote = false
  let position = 0
  let isFirstCharacter = true

  const consume = function* (chunk: string) {
    for (let index = 0; index < chunk.length; index += 1) {
      const character = chunk[index]!
      position += 1
      if (isFirstCharacter) {
        isFirstCharacter = false
        if (character === '\uFEFF') continue
      }
      if (quoted) {
        if (character === '"') {
          quoted = false
          justClosedQuote = true
        } else cell += character
      } else if (character === '"') {
        if (justClosedQuote) {
          cell += '"'
          quoted = true
          justClosedQuote = false
        } else {
          if (strict && cell.length > 0) throw new Error(`CSV tidak valid: tanda kutip harus berada di awal cell (karakter ${position}).`)
          quoted = true
        }
      } else if (character === delimiter) {
        row.push(cell)
        cell = ''
        justClosedQuote = false
      } else if (character === '\n') {
        row.push(cell.replace(/\r$/u, ''))
        yield row
        row = []
        cell = ''
        justClosedQuote = false
      } else {
        if (strict && justClosedQuote && !/\s/u.test(character)) throw new Error(`CSV tidak valid: karakter setelah penutup kutip pada posisi ${position}.`)
        cell += character
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    const chunk = decoder.decode(value, { stream: !done })
    for (const parsedRow of consume(chunk)) yield parsedRow
    if (done) break
  }
  if (quoted) throw new Error('CSV tidak valid: tanda kutip belum ditutup.')
  if (cell || row.length) {
    row.push(cell.replace(/\r$/u, ''))
    yield row
  }
}

function inferCsvCell(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return ''
  if (/^(?:true|false)$/i.test(trimmed)) return trimmed.toLocaleLowerCase('en') === 'true'
  if (/^null$/i.test(trimmed)) return null
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(trimmed) && !/^[-+]?0\d/u.test(trimmed)) {
    const number = Number(trimmed)
    if (Number.isFinite(number)) return number
  }
  return value
}

export function csvToObjects(value: string, options: CsvOptions = {}) {
  const delimiter = options.delimiter ?? detectCsvDelimiter(value)
  const rows = parseCsv(value, delimiter, options.strict !== false)
  const hasHeader = options.hasHeader !== false
  const firstRow = rows[0]
  const headers = hasHeader ? firstRow : firstRow?.map((_, index) => `column_${index + 1}`)
  const dataRows = hasHeader ? rows.slice(1) : rows
  if (!headers?.length || headers.every((header) => !header.trim())) throw new Error('Header CSV wajib diisi.')
  const normalizedHeaders = headers.map((header) => header.trim())
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) throw new Error('Header CSV tidak boleh duplikat.')
  return dataRows.filter((row) => row.some((cell) => cell !== '')).map((row, rowIndex) => {
    if (options.strict !== false && row.length !== normalizedHeaders.length) throw new Error(`CSV row ${rowIndex + (hasHeader ? 2 : 1)} memiliki ${row.length} kolom; seharusnya ${normalizedHeaders.length}.`)
    return Object.fromEntries(normalizedHeaders.map((header, index) => [header, options.inferTypes ? inferCsvCell(row[index] ?? '') : row[index] ?? '']))
  })
}

export async function csvBlobToJson(source: Blob, options: CsvOptions = {}, jsonLines = false) {
  const delimiter = options.delimiter ?? detectCsvDelimiter(await source.slice(0, 64 * 1024).text())
  const rows = parseCsvStream(source, delimiter, options.strict !== false)
  const first = await rows.next()
  if (first.done) return jsonLines ? '' : '[]'
  const hasHeader = options.hasHeader !== false
  const headers = (hasHeader ? first.value : first.value.map((_, index) => `column_${index + 1}`)).map((header) => header.trim())
  if (!headers.length || headers.every((header) => !header)) throw new Error('Header CSV wajib diisi.')
  if (new Set(headers).size !== headers.length) throw new Error('Header CSV tidak boleh duplikat.')
  const output: string[] = []
  let rowNumber = hasHeader ? 2 : 1

  const appendRow = (row: string[]) => {
    if (!row.some((cellValue) => cellValue !== '')) return
    if (options.strict !== false && row.length !== headers.length) throw new Error(`CSV row ${rowNumber} memiliki ${row.length} kolom; seharusnya ${headers.length}.`)
    const record = Object.fromEntries(headers.map((header, index) => [header, options.inferTypes ? inferCsvCell(row[index] ?? '') : row[index] ?? '']))
    output.push(JSON.stringify(record))
  }
  if (!hasHeader) {
    appendRow(first.value)
    rowNumber += 1
  }
  for await (const row of rows) {
    appendRow(row)
    rowNumber += 1
  }
  return jsonLines ? output.join('\n') : `[\n${output.map((line) => `  ${line}`).join(',\n')}\n]`
}

export function csvToJson(value: string, options: CsvOptions = {}) {
  return JSON.stringify(csvToObjects(value, options), null, 2)
}

export function jsonLinesToCsv(value: string, options: CsvOptions = {}) {
  const rows = parseJsonRows(value, true)
  return jsonToCsv(JSON.stringify(rows), options)
}

export function csvToJsonLines(value: string, options: CsvOptions = {}) {
  return csvToObjects(value, options).map((row) => JSON.stringify(row)).join('\n')
}

export interface MetaTagConfig {
  title: string
  description: string
  url: string
  imageUrl: string
  siteName: string
  author: string
  keywords: string
  robots: string
  twitterCard: 'summary' | 'summary_large_image'
}

export function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function generateMetaTags(config: MetaTagConfig) {
  const line = (attribute: 'name' | 'property', key: string, content: string) =>
    content.trim() ? `<meta ${attribute}="${key}" content="${escapeHtmlAttribute(content.trim())}">` : ''
  return [
    config.title.trim() ? `<title>${escapeHtmlAttribute(config.title.trim())}</title>` : '',
    line('name', 'description', config.description),
    line('name', 'author', config.author),
    line('name', 'keywords', config.keywords),
    line('name', 'robots', config.robots),
    line('property', 'og:type', 'website'),
    line('property', 'og:title', config.title),
    line('property', 'og:description', config.description),
    line('property', 'og:url', config.url),
    line('property', 'og:image', config.imageUrl),
    line('property', 'og:site_name', config.siteName),
    line('name', 'twitter:card', config.twitterCard),
    line('name', 'twitter:title', config.title),
    line('name', 'twitter:description', config.description),
    line('name', 'twitter:image', config.imageUrl),
  ].filter(Boolean).join('\n')
}
