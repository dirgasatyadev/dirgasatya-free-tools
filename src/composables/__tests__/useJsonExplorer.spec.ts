import { describe, expect, it } from 'vitest'
import { evaluateJsonPath, flattenJsonTree, parseJsonExplorerInput, searchJsonNodes } from '@/composables/useJsonExplorer'

describe('JSON Explorer helpers', () => {
  const json = { store: { books: [{ title: 'Clean Code', price: 29.99 }, { title: 'Refactoring', price: 34.5 }] } }
  it('membuat path tree yang stabil', () => {
    const nodes = flattenJsonTree(json)
    expect(nodes.map((node) => node.path)).toContain('$.store.books[0].title')
  })
  it('mencari key, value, dan path', () => {
    expect(searchJsonNodes(flattenJsonTree(json), 'clean code')[0]?.path).toBe('$.store.books[0].title')
  })
  it('menjalankan JSONPath dalam mode safe', () => {
    expect(evaluateJsonPath(json, '$.store.books[*].title').map((result) => result.value)).toEqual(['Clean Code', 'Refactoring'])
  })
  it('mendukung filter JSONPath untuk field boolean', () => {
    const users = { users: [{ email: 'a@example.com', active: true }, { email: 'b@example.com', active: true }, { email: 'c@example.com', active: false }] }
    expect(evaluateJsonPath(users, '$.users[?(@.active)].email').map((result) => result.value)).toEqual(['a@example.com', 'b@example.com'])
  })
  it('menghentikan JSONPath saat hasil melewati resource limit', () => {
    const values = Array.from({ length: 1_001 }, (_, index) => index)
    expect(() => evaluateJsonPath(values, '$[*]')).toThrow('Hasil melebihi 1.000 item')
  })
  it('menolak input invalid dan tree terlalu besar', () => {
    expect(() => parseJsonExplorerInput('{')).toThrow('JSON tidak valid')
    expect(() => flattenJsonTree({ a: 1, b: 2 }, 2)).toThrow('lebih dari 2 node')
  })
  it('memproses JSON sangat dalam tanpa recursive call stack', () => {
    let deeplyNested: Record<string, unknown> = { value: true }
    for (let depth = 0; depth < 2_000; depth += 1) deeplyNested = { child: deeplyNested }
    const nodes = flattenJsonTree(deeplyNested)
    expect(nodes).toHaveLength(2_002)
    expect(nodes[nodes.length - 1]?.value).toBe(true)
  })
})
