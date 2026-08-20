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

export interface XmlAttributeNode { name: string; value: string }
export type XmlAstNode =
  | { type: 'element'; name: string; attributes: XmlAttributeNode[]; children: XmlAstNode[] }
  | { type: 'text' | 'cdata' | 'comment'; value: string }
  | { type: 'processing-instruction'; target: string; data: string }
  | { type: 'doctype'; name: string; publicId: string; systemId: string }
export interface XmlAstDocument {
  type: 'document'
  declaration: { version: string; encoding?: string; standalone?: string } | null
  children: XmlAstNode[]
}

function domNodeToAst(node: Node): XmlAstNode | null {
  if (node.nodeType === 1) {
    const element = node as Element
    return {
      type: 'element',
      name: element.tagName,
      attributes: Array.from(element.attributes, (attribute) => ({ name: attribute.name, value: attribute.value })),
      children: Array.from(element.childNodes).map(domNodeToAst).filter((child): child is XmlAstNode => child !== null),
    }
  }
  if (node.nodeType === 3) return { type: 'text', value: node.nodeValue ?? '' }
  if (node.nodeType === 4) return { type: 'cdata', value: node.nodeValue ?? '' }
  if (node.nodeType === 8) return { type: 'comment', value: node.nodeValue ?? '' }
  if (node.nodeType === 7) {
    const instruction = node as ProcessingInstruction
    return { type: 'processing-instruction', target: instruction.target, data: instruction.data }
  }
  if (node.nodeType === 10) {
    const doctype = node as DocumentType
    return { type: 'doctype', name: doctype.name, publicId: doctype.publicId, systemId: doctype.systemId }
  }
  return null
}

export function xmlToJson(value: string, indent = 2) {
  const document = new DOMParser().parseFromString(value, 'application/xml')
  const parserError = document.querySelector('parsererror')
  if (parserError || !document.documentElement) throw new Error('XML tidak valid.')
  const declarationMatch = value.match(/^\s*<\?xml\s+version=["']([^"']+)["'](?:\s+encoding=["']([^"']+)["'])?(?:\s+standalone=["']([^"']+)["'])?\s*\?>/i)
  const ast: XmlAstDocument = {
    type: 'document',
    declaration: declarationMatch ? {
      version: declarationMatch[1]!,
      ...(declarationMatch[2] ? { encoding: declarationMatch[2] } : {}),
      ...(declarationMatch[3] ? { standalone: declarationMatch[3] } : {}),
    } : null,
    children: Array.from(document.childNodes).map(domNodeToAst).filter((child): child is XmlAstNode => child !== null),
  }
  return JSON.stringify(ast, null, indent)
}

function escapeXml(value: unknown) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function validateXmlName(name: unknown, kind: 'elemen' | 'atribut' | 'target') {
  if (typeof name !== 'string' || !/^[\p{L}_:][\p{L}\p{N}_.:-]*$/u.test(name) || name.endsWith(':') || name.includes('::')) {
    throw new Error(`Nama ${kind} XML tidak valid: ${String(name)}`)
  }
  return name
}

function astNodeToXml(node: XmlAstNode): string {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') throw new Error('Node AST XML tidak valid.')
  if (node.type === 'text') return escapeXml(node.value)
  if (node.type === 'cdata') {
    if (node.value.includes(']]>')) throw new Error('CDATA tidak boleh mengandung ]]> secara langsung.')
    return `<![CDATA[${node.value}]]>`
  }
  if (node.type === 'comment') {
    if (node.value.includes('--') || node.value.endsWith('-')) throw new Error('Isi komentar XML tidak valid.')
    return `<!--${node.value}-->`
  }
  if (node.type === 'processing-instruction') {
    const target = validateXmlName(node.target, 'target')
    if (target.toLocaleLowerCase('en') === 'xml' || node.data.includes('?>')) throw new Error('Processing instruction XML tidak valid.')
    return `<?${target}${node.data ? ` ${node.data}` : ''}?>`
  }
  if (node.type === 'doctype') {
    const name = validateXmlName(node.name, 'elemen')
    if (node.publicId) return `<!DOCTYPE ${name} PUBLIC "${escapeXml(node.publicId)}" "${escapeXml(node.systemId)}">`
    if (node.systemId) return `<!DOCTYPE ${name} SYSTEM "${escapeXml(node.systemId)}">`
    return `<!DOCTYPE ${name}>`
  }
  if (node.type !== 'element') throw new Error(`Tipe node AST XML tidak didukung: ${(node as { type: string }).type}`)
  const name = validateXmlName(node.name, 'elemen')
  if (!Array.isArray(node.attributes) || !Array.isArray(node.children)) throw new Error(`Node elemen ${name} harus memiliki attributes dan children berupa array.`)
  const seenAttributes = new Set<string>()
  const attributes = node.attributes.map((attribute) => {
    const attributeName = validateXmlName(attribute.name, 'atribut')
    if (seenAttributes.has(attributeName)) throw new Error(`Atribut XML duplikat: ${attributeName}`)
    seenAttributes.add(attributeName)
    return ` ${attributeName}="${escapeXml(attribute.value)}"`
  }).join('')
  if (!node.children.length) return `<${name}${attributes}/>`
  return `<${name}${attributes}>${node.children.map(astNodeToXml).join('')}</${name}>`
}

export function jsonToXml(value: string) {
  const parsed = JSON.parse(value) as XmlAstDocument
  if (!parsed || parsed.type !== 'document' || !Array.isArray(parsed.children)) throw new Error('Root JSON harus berupa AST XML bertipe document.')
  const rootElements = parsed.children.filter((node) => node.type === 'element')
  if (rootElements.length !== 1) throw new Error('Dokumen XML harus memiliki tepat satu root element.')
  const declaration = parsed.declaration
    ? `<?xml version="${escapeXml(parsed.declaration.version)}"${parsed.declaration.encoding ? ` encoding="${escapeXml(parsed.declaration.encoding)}"` : ''}${parsed.declaration.standalone ? ` standalone="${escapeXml(parsed.declaration.standalone)}"` : ''}?>`
    : ''
  return `${declaration}${parsed.children.map(astNodeToXml).join('')}`
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
