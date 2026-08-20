import { computed, ref } from 'vue'

export type SvgElementType = 'rectangle' | 'circle' | 'ellipse' | 'line' | 'text' | 'path'
export type SvgPathPreset = 'path' | 'polygon' | 'star'

export interface SvgPathNode {
  id: string
  x: number
  y: number
}

export interface SvgMakerElement {
  id: string
  type: SvgElementType
  x: number
  y: number
  width: number
  height: number
  radius: number
  radiusX: number
  radiusY: number
  x2: number
  y2: number
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  cornerRadius: number
  text: string
  fontSize: number
  fontWeight: number
  nodes: SvgPathNode[]
  closed: boolean
  pathName: string
}

export const svgMakerElementLabels: Record<SvgElementType, string> = {
  rectangle: 'Kotak',
  circle: 'Lingkaran',
  ellipse: 'Elips',
  line: 'Garis',
  text: 'Teks',
  path: 'Path',
}

export function clampSvgDimension(value: number) {
  if (!Number.isFinite(value)) return 800
  return Math.min(4096, Math.max(16, Math.round(value)))
}

export function normalizeSvgFileName(value: string) {
  const withoutExtension = value.replace(/\.svg$/i, '')
  const safeName = Array.from(withoutExtension)
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 180)
  return `${safeName || 'design'}.svg`
}

export function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function commonAttributes(element: SvgMakerElement) {
  return `fill="${escapeSvgText(element.fill)}" stroke="${escapeSvgText(element.stroke)}" stroke-width="${element.strokeWidth}" opacity="${element.opacity / 100}"`
}

export function serializeSvgElement(element: SvgMakerElement) {
  const common = commonAttributes(element)
  if (element.type === 'rectangle') {
    return `  <rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="${element.cornerRadius}" ${common} />`
  }
  if (element.type === 'circle') {
    return `  <circle cx="${element.x}" cy="${element.y}" r="${element.radius}" ${common} />`
  }
  if (element.type === 'ellipse') {
    return `  <ellipse cx="${element.x}" cy="${element.y}" rx="${element.radiusX}" ry="${element.radiusY}" ${common} />`
  }
  if (element.type === 'line') {
    return `  <line x1="${element.x}" y1="${element.y}" x2="${element.x2}" y2="${element.y2}" ${common} />`
  }
  if (element.type === 'path') {
    return `  <path d="${buildSvgPathData(element.nodes, element.closed)}" ${common} stroke-linejoin="round" stroke-linecap="round" />`
  }
  return `  <text x="${element.x}" y="${element.y}" font-family="Arial, sans-serif" font-size="${element.fontSize}" font-weight="${element.fontWeight}" ${common}>${escapeSvgText(element.text)}</text>`
}

export function buildSvgPathData(nodes: readonly SvgPathNode[], closed: boolean) {
  if (nodes.length === 0) return ''
  const [first, ...rest] = nodes
  if (!first) return ''
  const commands = [`M ${first.x} ${first.y}`]
  for (const node of rest) commands.push(`L ${node.x} ${node.y}`)
  if (closed && nodes.length > 2) commands.push('Z')
  return commands.join(' ')
}

export function getEditableShapeNodes(element: SvgMakerElement): SvgPathNode[] {
  if (element.type === 'path') return element.nodes
  if (element.type === 'rectangle') {
    return [
      { id: `${element.id}-nw`, x: element.x, y: element.y },
      { id: `${element.id}-ne`, x: element.x + element.width, y: element.y },
      { id: `${element.id}-se`, x: element.x + element.width, y: element.y + element.height },
      { id: `${element.id}-sw`, x: element.x, y: element.y + element.height },
    ]
  }
  if (element.type === 'ellipse') {
    return [
      { id: `${element.id}-n`, x: element.x, y: element.y - element.radiusY },
      { id: `${element.id}-e`, x: element.x + element.radiusX, y: element.y },
      { id: `${element.id}-s`, x: element.x, y: element.y + element.radiusY },
      { id: `${element.id}-w`, x: element.x - element.radiusX, y: element.y },
    ]
  }
  return []
}

export function updateEditableShapeNode(
  element: SvgMakerElement,
  nodeId: string,
  x: number,
  y: number,
) {
  if (element.type === 'path') {
    const node = element.nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return false
    node.x = Math.round(x)
    node.y = Math.round(y)
    return true
  }

  if (element.type === 'rectangle') {
    const left = element.x
    const top = element.y
    const right = left + element.width
    const bottom = top + element.height
    if (nodeId.endsWith('-nw')) {
      element.x = Math.min(Math.round(x), right - 1)
      element.y = Math.min(Math.round(y), bottom - 1)
      element.width = right - element.x
      element.height = bottom - element.y
    } else if (nodeId.endsWith('-ne')) {
      element.y = Math.min(Math.round(y), bottom - 1)
      element.width = Math.max(1, Math.round(x) - left)
      element.height = bottom - element.y
    } else if (nodeId.endsWith('-se')) {
      element.width = Math.max(1, Math.round(x) - left)
      element.height = Math.max(1, Math.round(y) - top)
    } else if (nodeId.endsWith('-sw')) {
      element.x = Math.min(Math.round(x), right - 1)
      element.width = right - element.x
      element.height = Math.max(1, Math.round(y) - top)
    } else return false
    return true
  }

  if (element.type === 'ellipse') {
    const left = element.x - element.radiusX
    const top = element.y - element.radiusY
    const right = element.x + element.radiusX
    const bottom = element.y + element.radiusY
    if (nodeId.endsWith('-n')) {
      const nextTop = Math.min(Math.round(y), bottom - 2)
      element.x = Math.round(x)
      element.y = Math.round((nextTop + bottom) / 2)
      element.radiusY = Math.max(1, Math.round((bottom - nextTop) / 2))
    } else if (nodeId.endsWith('-e')) {
      const nextRight = Math.max(Math.round(x), left + 2)
      element.x = Math.round((left + nextRight) / 2)
      element.y = Math.round(y)
      element.radiusX = Math.max(1, Math.round((nextRight - left) / 2))
    } else if (nodeId.endsWith('-s')) {
      const nextBottom = Math.max(Math.round(y), top + 2)
      element.x = Math.round(x)
      element.y = Math.round((top + nextBottom) / 2)
      element.radiusY = Math.max(1, Math.round((nextBottom - top) / 2))
    } else if (nodeId.endsWith('-w')) {
      const nextLeft = Math.min(Math.round(x), right - 2)
      element.x = Math.round((nextLeft + right) / 2)
      element.y = Math.round(y)
      element.radiusX = Math.max(1, Math.round((right - nextLeft) / 2))
    } else return false
    return true
  }

  return false
}

export function serializeSvg(
  width: number,
  height: number,
  background: string | null,
  elements: readonly SvgMakerElement[],
) {
  const safeWidth = clampSvgDimension(width)
  const safeHeight = clampSvgDimension(height)
  const content = elements.map(serializeSvgElement)
  if (background) {
    content.unshift(
      `  <rect width="${safeWidth}" height="${safeHeight}" fill="${escapeSvgText(background)}" />`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">\n${content.join('\n')}\n</svg>`
}

function createElement(type: SvgElementType, id: string, offset: number): SvgMakerElement {
  return {
    id,
    type,
    x: type === 'text' ? 90 + offset : 160 + offset,
    y: type === 'text' ? 150 + offset : 160 + offset,
    width: 240,
    height: 160,
    radius: 90,
    radiusX: 120,
    radiusY: 75,
    x2: 480 + offset,
    y2: 330 + offset,
    fill: type === 'line' ? 'none' : type === 'text' ? '#0f172a' : '#7c3aed',
    stroke: type === 'line' ? '#7c3aed' : 'none',
    strokeWidth: type === 'line' ? 10 : 0,
    opacity: 100,
    cornerRadius: 24,
    text: 'Teks SVG',
    fontSize: 64,
    fontWeight: 700,
    nodes: [],
    closed: false,
    pathName: 'Path bebas',
  }
}

function createPresetNodes(
  preset: SvgPathPreset,
  createNodeId: () => string,
): SvgPathNode[] {
  if (preset === 'path') {
    return [
      { id: createNodeId(), x: 170, y: 360 },
      { id: createNodeId(), x: 310, y: 180 },
      { id: createNodeId(), x: 470, y: 340 },
    ]
  }

  const centerX = 400
  const centerY = 300
  const pointCount = preset === 'star' ? 10 : 6
  return Array.from({ length: pointCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2
    const radius = preset === 'star' && index % 2 === 1 ? 65 : 140
    return {
      id: createNodeId(),
      x: Math.round(centerX + Math.cos(angle) * radius),
      y: Math.round(centerY + Math.sin(angle) * radius),
    }
  })
}

export function useSvgMaker() {
  const width = ref(800)
  const height = ref(600)
  const background = ref('#ffffff')
  const transparentBackground = ref(true)
  const elements = ref<SvgMakerElement[]>([])
  const selectedId = ref<string | null>(null)
  let sequence = 0
  let nodeSequence = 0

  const selectedElement = computed(
    () => elements.value.find((element) => element.id === selectedId.value) ?? null,
  )
  const svgCode = computed(() =>
    serializeSvg(
      width.value,
      height.value,
      transparentBackground.value ? null : background.value,
      elements.value,
    ),
  )

  function addElement(type: SvgElementType) {
    const element = createElement(type, `svg-element-${sequence++}`, (elements.value.length % 6) * 18)
    elements.value.push(element)
    selectedId.value = element.id
  }

  function addPathPreset(preset: SvgPathPreset) {
    const element = createElement('path', `svg-element-${sequence++}`, 0)
    element.nodes = createPresetNodes(preset, () => `svg-node-${nodeSequence++}`)
    element.closed = preset !== 'path'
    element.pathName = preset === 'polygon' ? 'Polygon' : preset === 'star' ? 'Bintang' : 'Path bebas'
    element.fill = preset === 'path' ? 'none' : '#7c3aed'
    element.stroke = preset === 'path' ? '#7c3aed' : 'none'
    element.strokeWidth = preset === 'path' ? 10 : 0
    elements.value.push(element)
    selectedId.value = element.id
  }

  function addPathNode(elementId: string, x: number, y: number) {
    const element = elements.value.find((candidate) => candidate.id === elementId)
    if (!element || element.type !== 'path') return null
    const node = { id: `svg-node-${nodeSequence++}`, x: Math.round(x), y: Math.round(y) }
    element.nodes.push(node)
    return node
  }

  function deletePathNode(elementId: string, nodeId: string) {
    const element = elements.value.find((candidate) => candidate.id === elementId)
    if (!element || element.type !== 'path') return false
    const index = element.nodes.findIndex((node) => node.id === nodeId)
    if (index === -1) return false
    element.nodes.splice(index, 1)
    return true
  }

  function deleteSelected() {
    if (!selectedId.value) return
    const index = elements.value.findIndex((element) => element.id === selectedId.value)
    if (index === -1) return
    elements.value.splice(index, 1)
    selectedId.value = elements.value[Math.min(index, elements.value.length - 1)]?.id ?? null
  }

  function duplicateSelected() {
    const selected = selectedElement.value
    if (!selected) return
    const duplicate = {
      ...selected,
      id: `svg-element-${sequence++}`,
      x: selected.x + 20,
      y: selected.y + 20,
      x2: selected.x2 + 20,
      y2: selected.y2 + 20,
      nodes: selected.nodes.map((node) => ({
        ...node,
        id: `svg-node-${nodeSequence++}`,
        x: node.x + 20,
        y: node.y + 20,
      })),
    }
    elements.value.push(duplicate)
    selectedId.value = duplicate.id
  }

  function moveLayer(direction: 'up' | 'down') {
    if (!selectedId.value) return
    const index = elements.value.findIndex((element) => element.id === selectedId.value)
    const target = direction === 'up' ? index + 1 : index - 1
    if (index < 0 || target < 0 || target >= elements.value.length) return
    const [element] = elements.value.splice(index, 1)
    if (element) elements.value.splice(target, 0, element)
  }

  function reset() {
    elements.value = []
    selectedId.value = null
    width.value = 800
    height.value = 600
    background.value = '#ffffff'
    transparentBackground.value = true
  }

  return {
    width,
    height,
    background,
    transparentBackground,
    elements,
    selectedId,
    selectedElement,
    svgCode,
    addElement,
    addPathPreset,
    addPathNode,
    deletePathNode,
    deleteSelected,
    duplicateSelected,
    moveLayer,
    reset,
  }
}
