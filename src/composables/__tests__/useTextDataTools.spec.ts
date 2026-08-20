import { describe, expect, it } from 'vitest'
import { convertTextCases, diffLines, generateSlug, jsonToXml, jsonToYaml, xmlToJson, yamlToJson } from '@/composables/useTextDataTools'

describe('text and data tool helpers', () => {
  it('mengonversi seluruh format case', () => {
    expect(convertTextCases('hello HTTP world')).toEqual({ camelCase: 'helloHttpWorld', PascalCase: 'HelloHttpWorld', snake_case: 'hello_http_world', 'kebab-case': 'hello-http-world', CONSTANT_CASE: 'HELLO_HTTP_WORLD' })
  })

  it('membuat slug yang bersih', () => {
    expect(generateSlug('Café & Produk Baru!', '-', 80)).toBe('cafe-dan-produk-baru')
  })

  it('mengonversi YAML dan JSON dua arah', () => {
    expect(JSON.parse(yamlToJson('name: Dearga\ntools:\n  - zip\n  - yaml'))).toEqual({ name: 'Dearga', tools: ['zip', 'yaml'] })
    expect(jsonToYaml('{"active":true}')).toContain('active: true')
  })

  it('melakukan round-trip XML AST dengan mixed content dan namespace', () => {
    const xml = '<?xml version="1.0"?><p xmlns:x="urn:x">Hello <x:b id="1">world</x:b>!<![CDATA[ raw ]]><!--ok--><?next run?></p>'
    const json = xmlToJson(xml)
    const ast = JSON.parse(json)
    expect(ast.type).toBe('document')
    expect(ast.children.at(-1).children.map((node: { type: string }) => node.type)).toEqual([
      'text', 'element', 'text', 'cdata', 'comment', 'processing-instruction',
    ])
    expect(jsonToXml(json)).toBe(xml)
  })

  it('menolak nama atribut XML yang tidak valid', () => {
    const invalidAst = JSON.stringify({ type: 'document', declaration: null, children: [{ type: 'element', name: 'root', attributes: [{ name: 'bad name', value: 'x' }], children: [] }] })
    expect(() => jsonToXml(invalidAst)).toThrow('Nama atribut XML tidak valid')
  })

  it('membuat diff added, deleted, dan changed secara side-by-side', () => {
    const rows = diffLines('sama\nlama\nhapus', 'sama\nbaru\ntambah')
    expect(rows.map((row) => row.type)).toEqual(['unchanged', 'changed', 'changed'])
    expect(rows[1]).toMatchObject({ left: 'lama', right: 'baru' })
  })
})
