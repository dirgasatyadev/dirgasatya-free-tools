import { JSONPath } from 'jsonpath-plus'

export type JsonNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
export interface JsonExplorerNode {
  path: string
  parentPath: string | null
  key: string
  depth: number
  type: JsonNodeType
  value: unknown
  childCount: number
  expandable: boolean
}
export interface JsonPathMatch { path: string; value: unknown; type: JsonNodeType }
export const maxJsonExplorerNodes = 50_000
export const maxJsonPathResults = 1_000

export function jsonValueType(value: unknown): JsonNodeType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  throw new Error('JSON mengandung nilai yang tidak didukung.')
}

function childPath(parent: string, key: string, isArray: boolean) {
  if (isArray) return `${parent}[${key}]`
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`
}

export function flattenJsonTree(value: unknown, limit = maxJsonExplorerNodes) {
  const nodes: JsonExplorerNode[] = []
  const stack: { current: unknown; key: string; path: string; parentPath: string | null; depth: number }[] = [
    { current: value, key: '$', path: '$', parentPath: null, depth: 0 },
  ]
  while (stack.length > 0) {
    if (nodes.length >= limit) throw new Error(`JSON memiliki lebih dari ${limit.toLocaleString('id-ID')} node.`)
    const { current, key, path, parentPath, depth } = stack.pop()!
    const type = jsonValueType(current)
    const entries: [string, unknown][] = type === 'array'
      ? (current as unknown[]).map((item, index) => [String(index), item])
      : type === 'object'
        ? Object.entries(current as Record<string, unknown>)
        : []
    nodes.push({ path, parentPath, key, depth, type, value: current, childCount: entries.length, expandable: entries.length > 0 })
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [childKey, child] = entries[index]!
      stack.push({ current: child, key: childKey, path: childPath(path, childKey, type === 'array'), parentPath: path, depth: depth + 1 })
    }
  }
  return nodes
}

export function parseJsonExplorerInput(source: string) {
  if (!source.trim()) throw new Error('Masukkan JSON terlebih dahulu.')
  if (new TextEncoder().encode(source).length > 5 * 1024 * 1024) throw new Error('Input JSON maksimal 5 MB untuk tree explorer.')
  try { return JSON.parse(source) as unknown }
  catch (error) { throw new Error(`JSON tidak valid: ${error instanceof Error ? error.message : 'syntax error'}`) }
}

export function searchJsonNodes(nodes: JsonExplorerNode[], query: string) {
  const normalized = query.trim().toLocaleLowerCase('en')
  if (!normalized) return []
  return nodes.filter((node) => {
    const primitive = node.expandable ? '' : String(node.value)
    return node.key.toLocaleLowerCase('en').includes(normalized) || primitive.toLocaleLowerCase('en').includes(normalized) || node.path.toLocaleLowerCase('en').includes(normalized)
  })
}

export function evaluateJsonPath(json: unknown, expression: string): JsonPathMatch[] {
  if (!expression.trim()) throw new Error('Masukkan ekspresi JSONPath.')
  let matchCount = 0
  const results = JSONPath({
    path: expression.trim(),
    json: json as object | string | number | boolean | unknown[] | null,
    resultType: 'all',
    wrap: true,
    eval: 'safe',
    callback: () => {
      matchCount += 1
      if (matchCount > maxJsonPathResults)
        throw new Error(`Hasil melebihi ${maxJsonPathResults.toLocaleString('id-ID')} item. Persempit query JSONPath.`)
    },
  }) as unknown as { path: string; value: unknown }[]
  if (results.length > maxJsonPathResults) throw new Error(`Hasil melebihi ${maxJsonPathResults.toLocaleString('id-ID')} item. Persempit query JSONPath.`)
  return results.map((result) => ({ path: String(result.path), value: result.value, type: jsonValueType(result.value) }))
}

export function jsonPreview(value: unknown, maxLength = 100) {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value.length > maxLength ? `${value.slice(0, maxLength)}…` : value)
  if (typeof value === 'object') return Array.isArray(value) ? `Array(${value.length})` : `Object(${Object.keys(value as object).length})`
  return String(value)
}
