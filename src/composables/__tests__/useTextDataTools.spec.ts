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

  it('mengonversi XML dan JSON beserta atribut dan array', () => {
    const json = xmlToJson('<root id="1"><item>A</item><item>B</item></root>')
    expect(JSON.parse(json)).toEqual({ root: { '@id': '1', item: ['A', 'B'] } })
    expect(jsonToXml(json)).toContain('<item>A</item>')
  })

  it('membuat diff added, deleted, dan changed secara side-by-side', () => {
    const rows = diffLines('sama\nlama\nhapus', 'sama\nbaru\ntambah')
    expect(rows.map((row) => row.type)).toEqual(['unchanged', 'changed', 'changed'])
    expect(rows[1]).toMatchObject({ left: 'lama', right: 'baru' })
  })
})
