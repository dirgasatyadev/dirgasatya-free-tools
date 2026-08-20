import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export type CaseResultKey = 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case' | 'CONSTANT_CASE'

export function splitWords(value: string) {
  return value
    .normalize('NFKC')
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word.toLocaleLowerCase('id'))
}

export function convertTextCases(value: string): Record<CaseResultKey, string> {
  const words = splitWords(value)
  const capitalize = (word: string) => word ? word[0]!.toLocaleUpperCase('id') + word.slice(1) : ''
  return {
    camelCase: words.map((word, index) => index === 0 ? word : capitalize(word)).join(''),
    PascalCase: words.map(capitalize).join(''),
    snake_case: words.join('_'),
    'kebab-case': words.join('-'),
    CONSTANT_CASE: words.join('_').toLocaleUpperCase('id'),
  }
}

export function generateSlug(value: string, separator = '-', maxLength = 80) {
  if (!['-', '_'].includes(separator)) throw new Error('Separator slug tidak didukung.')
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' dan ')
    .toLocaleLowerCase('id')
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '')
  return slug.slice(0, Math.max(1, maxLength)).replace(new RegExp(`\\${separator}+$`), '')
}

export function yamlToJson(value: string, indent = 2) {
  const parsed: unknown = parseYaml(value)
  return JSON.stringify(parsed, null, indent)
}

export function jsonToYaml(value: string) {
  return stringifyYaml(JSON.parse(value), { indent: 2, lineWidth: 0 })
}

function elementToValue(element: Element): unknown {
  const result: Record<string, unknown> = {}
  for (const attribute of Array.from(element.attributes)) result[`@${attribute.name}`] = attribute.value
  const children = Array.from(element.children)
  const text = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim()

  for (const child of children) {
    const value = elementToValue(child)
    const existing = result[child.tagName]
    if (existing === undefined) result[child.tagName] = value
    else if (Array.isArray(existing)) existing.push(value)
    else result[child.tagName] = [existing, value]
  }
  if (!children.length && !element.attributes.length) return text
  if (text) result['#text'] = text
  return result
}

export function xmlToJson(value: string, indent = 2) {
  const document = new DOMParser().parseFromString(value, 'application/xml')
  const parserError = document.querySelector('parsererror')
  if (parserError || !document.documentElement) throw new Error('XML tidak valid.')
  return JSON.stringify({ [document.documentElement.tagName]: elementToValue(document.documentElement) }, null, indent)
}

function escapeXml(value: unknown) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function valueToXml(name: string, value: unknown, level: number): string {
  if (!/^[A-Za-z_][\w.:-]*$/.test(name)) throw new Error(`Nama elemen XML tidak valid: ${name}`)
  const padding = '  '.repeat(level)
  if (Array.isArray(value)) return value.map((item) => valueToXml(name, item, level)).join('\n')
  if (value === null || value === undefined) return `${padding}<${name}/>`
  if (typeof value !== 'object') return `${padding}<${name}>${escapeXml(value)}</${name}>`

  const object = value as Record<string, unknown>
  const attributes = Object.entries(object)
    .filter(([key]) => key.startsWith('@'))
    .map(([key, item]) => ` ${key.slice(1)}="${escapeXml(item)}"`)
    .join('')
  const text = object['#text'] === undefined ? '' : escapeXml(object['#text'])
  const children = Object.entries(object).filter(([key]) => !key.startsWith('@') && key !== '#text')
  if (!children.length && !text) return `${padding}<${name}${attributes}/>`
  if (!children.length) return `${padding}<${name}${attributes}>${text}</${name}>`
  const childXml = children.map(([key, item]) => valueToXml(key, item, level + 1)).join('\n')
  return `${padding}<${name}${attributes}>${text ? `\n${'  '.repeat(level + 1)}${text}` : ''}\n${childXml}\n${padding}</${name}>`
}

export function jsonToXml(value: string) {
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Root JSON harus berupa object dengan satu elemen root.')
  const entries = Object.entries(parsed as Record<string, unknown>)
  if (entries.length !== 1) throw new Error('Root JSON harus memiliki tepat satu elemen root.')
  return `<?xml version="1.0" encoding="UTF-8"?>\n${valueToXml(entries[0]![0], entries[0]![1], 0)}`
}

export type DiffRowType = 'unchanged' | 'added' | 'deleted' | 'changed'
export interface DiffRow { type: DiffRowType; left: string; right: string; leftNumber?: number; rightNumber?: number }
type DiffOperation = { type: 'same' | 'add' | 'delete'; value: string; leftNumber?: number; rightNumber?: number }

export function diffLines(before: string, after: string): DiffRow[] {
  const left = before.split('\n')
  const right = after.split('\n')
  if (left.length > 1_000 || right.length > 1_000) throw new Error('Diff dibatasi maksimal 1.000 baris per sisi.')
  const columns = right.length + 1
  const table = new Uint32Array((left.length + 1) * columns)
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i * columns + j] = left[i] === right[j]
        ? table[(i + 1) * columns + j + 1]! + 1
        : Math.max(table[(i + 1) * columns + j]!, table[i * columns + j + 1]!)
    }
  }

  const operations: DiffOperation[] = []
  let i = 0
  let j = 0
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      operations.push({ type: 'same', value: left[i]!, leftNumber: i + 1, rightNumber: j + 1 }); i += 1; j += 1
    } else if (j < right.length && (i === left.length || table[i * columns + j + 1]! >= table[(i + 1) * columns + j]!)) {
      operations.push({ type: 'add', value: right[j]!, rightNumber: j + 1 }); j += 1
    } else {
      operations.push({ type: 'delete', value: left[i]!, leftNumber: i + 1 }); i += 1
    }
  }

  const rows: DiffRow[] = []
  for (let index = 0; index < operations.length;) {
    const operation = operations[index]!
    if (operation.type === 'same') {
      rows.push({ type: 'unchanged', left: operation.value, right: operation.value, leftNumber: operation.leftNumber, rightNumber: operation.rightNumber })
      index += 1
      continue
    }
    const block: DiffOperation[] = []
    while (index < operations.length && operations[index]!.type !== 'same') block.push(operations[index++]!)
    const deleted = block.filter((item) => item.type === 'delete')
    const added = block.filter((item) => item.type === 'add')
    const count = Math.max(deleted.length, added.length)
    for (let offset = 0; offset < count; offset += 1) {
      const deletedLine = deleted[offset]
      const addedLine = added[offset]
      rows.push({
        type: deletedLine && addedLine ? 'changed' : deletedLine ? 'deleted' : 'added',
        left: deletedLine?.value ?? '', right: addedLine?.value ?? '',
        leftNumber: deletedLine?.leftNumber, rightNumber: addedLine?.rightNumber,
      })
    }
  }
  return rows
}
