import { describe, expect, it } from 'vitest'
import {
  buildSvgPathData,
  clampSvgDimension,
  escapeSvgText,
  getEditableShapeNodes,
  normalizeSvgFileName,
  serializeSvg,
  serializeSvgElement,
  updateEditableShapeNode,
  type SvgMakerElement,
} from '@/composables/useSvgMaker'

function createElement(overrides: Partial<SvgMakerElement> = {}): SvgMakerElement {
  return {
    id: 'shape-1',
    type: 'rectangle',
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    radius: 50,
    radiusX: 80,
    radiusY: 40,
    x2: 300,
    y2: 250,
    fill: '#7c3aed',
    stroke: 'none',
    strokeWidth: 0,
    opacity: 100,
    cornerRadius: 16,
    text: 'Teks SVG',
    fontSize: 48,
    fontWeight: 700,
    nodes: [],
    closed: false,
    pathName: 'Path bebas',
    ...overrides,
  }
}

describe('SVG Maker helpers', () => {
  it('membatasi dimensi dokumen ke rentang yang aman', () => {
    expect(clampSvgDimension(2)).toBe(16)
    expect(clampSvgDimension(900.7)).toBe(901)
    expect(clampSvgDimension(9_000)).toBe(4096)
  })

  it('menormalkan nama file SVG', () => {
    expect(normalizeSvgFileName('logo.svg')).toBe('logo.svg')
    expect(normalizeSvgFileName('folder/logo:*?')).toBe('folder-logo---.svg')
    expect(normalizeSvgFileName('')).toBe('design.svg')
  })

  it('melakukan escape teks dan atribut SVG', () => {
    expect(escapeSvgText('<b>Tom & Jerry</b>')).toBe('&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;')
    const output = serializeSvgElement(
      createElement({ type: 'text', text: '<script>alert("x")</script>' }),
    )
    expect(output).not.toContain('<script>')
    expect(output).toContain('&lt;script&gt;')
    expect(output).toContain('&quot;x&quot;')
  })

  it('menyusun dokumen SVG dengan viewBox dan background opsional', () => {
    const transparent = serializeSvg(800, 600, null, [createElement()])
    expect(transparent).toContain('viewBox="0 0 800 600"')
    expect(transparent).not.toContain('<rect width="800" height="600"')

    const withBackground = serializeSvg(800, 600, '#ffffff', [createElement()])
    expect(withBackground).toContain('<rect width="800" height="600" fill="#ffffff" />')
    expect(withBackground).toContain('<rect x="10" y="20"')
  })

  it('menyusun path dari node terbuka dan tertutup', () => {
    const nodes = [
      { id: 'n1', x: 10, y: 20 },
      { id: 'n2', x: 100, y: 40 },
      { id: 'n3', x: 80, y: 120 },
    ]
    expect(buildSvgPathData(nodes, false)).toBe('M 10 20 L 100 40 L 80 120')
    expect(buildSvgPathData(nodes, true)).toBe('M 10 20 L 100 40 L 80 120 Z')
    expect(serializeSvgElement(createElement({ type: 'path', nodes, closed: true }))).toContain(
      'd="M 10 20 L 100 40 L 80 120 Z"',
    )
  })

  it('memberikan empat node sudut dan mengubah ukuran kotak dari node', () => {
    const rectangle = createElement({ type: 'rectangle', x: 10, y: 20, width: 200, height: 100 })
    const nodes = getEditableShapeNodes(rectangle)
    expect(nodes.map(({ x, y }) => [x, y])).toEqual([
      [10, 20],
      [210, 20],
      [210, 120],
      [10, 120],
    ])

    expect(updateEditableShapeNode(rectangle, nodes[2]!.id, 260, 170)).toBe(true)
    expect(rectangle).toMatchObject({ x: 10, y: 20, width: 250, height: 150 })
  })

  it('memberikan empat node sumbu dan mengubah radius elips dari node', () => {
    const ellipse = createElement({
      type: 'ellipse',
      x: 200,
      y: 150,
      radiusX: 80,
      radiusY: 50,
    })
    const nodes = getEditableShapeNodes(ellipse)
    expect(nodes.map(({ x, y }) => [x, y])).toEqual([
      [200, 100],
      [280, 150],
      [200, 200],
      [120, 150],
    ])

    expect(updateEditableShapeNode(ellipse, nodes[1]!.id, 320, 160)).toBe(true)
    expect(ellipse).toMatchObject({ x: 220, y: 160, radiusX: 100, radiusY: 50 })
  })
})
