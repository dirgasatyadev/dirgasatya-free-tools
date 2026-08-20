<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import SiteHeader from '@/components/SiteHeader.vue'
import {
  buildSvgPathData,
  clampSvgDimension,
  getEditableShapeNodes,
  normalizeSvgFileName,
  svgMakerElementLabels,
  updateEditableShapeNode,
  useSvgMaker,
  type SvgElementType,
  type SvgMakerElement,
  type SvgPathNode,
} from '@/composables/useSvgMaker'

const {
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
} = useSvgMaker()

const fileName = ref('design')
const copyLabel = ref('Salin kode SVG')
const showCode = ref(false)
const showResetConfirmation = ref(false)
const svgCanvas = ref<SVGSVGElement | null>(null)
const selectedNodeId = ref<string | null>(null)
const nodeAddMode = ref(false)
const showGrid = ref(true)
const snapToGrid = ref(false)
const gridSize = ref(20)
const zoom = ref(100)
let copyTimer = 0

const canvasStyle = computed(() => ({
  aspectRatio: `${width.value} / ${height.value}`,
  width: `${zoom.value}%`,
}))
const editableNodes = computed(() =>
  selectedElement.value ? getEditableShapeNodes(selectedElement.value) : [],
)
const selectedNode = computed(
  () => editableNodes.value.find((node) => node.id === selectedNodeId.value) ?? null,
)
const selectedNodeX = computed({
  get: () => selectedNode.value?.x ?? 0,
  set: (value: number) => updateSelectedNodeCoordinate(value, selectedNode.value?.y ?? 0),
})
const selectedNodeY = computed({
  get: () => selectedNode.value?.y ?? 0,
  set: (value: number) => updateSelectedNodeCoordinate(selectedNode.value?.x ?? 0, value),
})
const shapeTools: { type: SvgElementType; icon: string; label: string }[] = [
  { type: 'rectangle', icon: 'mdi:rectangle-outline', label: 'Kotak' },
  { type: 'circle', icon: 'mdi:circle-outline', label: 'Lingkaran' },
  { type: 'ellipse', icon: 'mdi:ellipse-outline', label: 'Elips' },
  { type: 'line', icon: 'mdi:vector-line', label: 'Garis' },
  { type: 'text', icon: 'mdi:format-text', label: 'Teks' },
]

function clampCanvasSize() {
  width.value = clampSvgDimension(width.value)
  height.value = clampSvgDimension(height.value)
}

function downloadSvg() {
  const blob = new Blob([svgCode.value], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = normalizeSvgFileName(fileName.value)
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

async function copySvgCode() {
  try {
    await navigator.clipboard.writeText(svgCode.value)
    copyLabel.value = 'Kode tersalin'
  } catch {
    copyLabel.value = 'Gagal menyalin'
  }
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => (copyLabel.value = 'Salin kode SVG'), 1_800)
}

interface DragState {
  element: SvgMakerElement
  startX: number
  startY: number
  elementX: number
  elementY: number
  elementX2: number
  elementY2: number
  nodePositions: { node: SvgPathNode; x: number; y: number }[]
}

let dragState: DragState | null = null

function beginDrag(event: PointerEvent, element: SvgMakerElement) {
  if (event.button !== 0) return
  selectedId.value = element.id
  if (element.type !== 'path') {
    selectedNodeId.value = null
    nodeAddMode.value = false
  }
  dragState = {
    element,
    startX: event.clientX,
    startY: event.clientY,
    elementX: element.x,
    elementY: element.y,
    elementX2: element.x2,
    elementY2: element.y2,
    nodePositions: element.nodes.map((node) => ({ node, x: node.x, y: node.y })),
  }
  window.addEventListener('pointermove', moveDraggedElement)
  window.addEventListener('pointerup', endDrag, { once: true })
}

function moveDraggedElement(event: PointerEvent) {
  const canvas = svgCanvas.value
  if (!dragState || !canvas) return
  const bounds = canvas.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return
  const deltaX = ((event.clientX - dragState.startX) / bounds.width) * width.value
  const deltaY = ((event.clientY - dragState.startY) / bounds.height) * height.value
  dragState.element.x = snapValue(dragState.elementX + deltaX)
  dragState.element.y = snapValue(dragState.elementY + deltaY)
  if (dragState.element.type === 'line') {
    dragState.element.x2 = snapValue(dragState.elementX2 + deltaX)
    dragState.element.y2 = snapValue(dragState.elementY2 + deltaY)
  }
  if (dragState.element.type === 'path') {
    for (const position of dragState.nodePositions) {
      position.node.x = snapValue(position.x + deltaX)
      position.node.y = snapValue(position.y + deltaY)
    }
  }
}

function endDrag() {
  dragState = null
  window.removeEventListener('pointermove', moveDraggedElement)
}

function selectLayer(element: SvgMakerElement) {
  selectedId.value = element.id
  selectedNodeId.value = null
  nodeAddMode.value = false
}

function elementIcon(type: SvgElementType) {
  if (type === 'path') return 'mdi:vector-polyline'
  return shapeTools.find((tool) => tool.type === type)?.icon ?? 'mdi:shape-outline'
}

function snapValue(value: number) {
  if (!snapToGrid.value) return Math.round(value)
  const safeGridSize = Math.max(1, gridSize.value)
  return Math.round(value / safeGridSize) * safeGridSize
}

function canvasCoordinates(event: PointerEvent) {
  const canvas = svgCanvas.value
  if (!canvas) return null
  const bounds = canvas.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return null
  return {
    x: snapValue(((event.clientX - bounds.left) / bounds.width) * width.value),
    y: snapValue(((event.clientY - bounds.top) / bounds.height) * height.value),
  }
}

function handleCanvasPointerDown(event: PointerEvent) {
  const element = selectedElement.value
  if (nodeAddMode.value && element?.type === 'path') {
    const coordinates = canvasCoordinates(event)
    if (!coordinates) return
    const node = addPathNode(element.id, coordinates.x, coordinates.y)
    selectedNodeId.value = node?.id ?? null
    return
  }
  selectedId.value = null
  selectedNodeId.value = null
}

interface NodeDragState {
  element: SvgMakerElement
  nodeId: string
  startX: number
  startY: number
  nodeX: number
  nodeY: number
}

let nodeDragState: NodeDragState | null = null

function beginNodeDrag(event: PointerEvent, element: SvgMakerElement, node: SvgPathNode) {
  selectedNodeId.value = node.id
  nodeDragState = {
    element,
    nodeId: node.id,
    startX: event.clientX,
    startY: event.clientY,
    nodeX: node.x,
    nodeY: node.y,
  }
  window.addEventListener('pointermove', moveDraggedNode)
  window.addEventListener('pointerup', endNodeDrag, { once: true })
}

function moveDraggedNode(event: PointerEvent) {
  const canvas = svgCanvas.value
  if (!nodeDragState || !canvas) return
  const bounds = canvas.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return
  updateEditableShapeNode(
    nodeDragState.element,
    nodeDragState.nodeId,
    snapValue(
      nodeDragState.nodeX + ((event.clientX - nodeDragState.startX) / bounds.width) * width.value,
    ),
    snapValue(
      nodeDragState.nodeY + ((event.clientY - nodeDragState.startY) / bounds.height) * height.value,
    ),
  )
}

function endNodeDrag() {
  nodeDragState = null
  window.removeEventListener('pointermove', moveDraggedNode)
}

function removeSelectedNode() {
  const element = selectedElement.value
  if (!element || element.type !== 'path' || !selectedNodeId.value) return
  deletePathNode(element.id, selectedNodeId.value)
  selectedNodeId.value = null
}

function updateSelectedNodeCoordinate(x: number, y: number) {
  const element = selectedElement.value
  if (!element || !selectedNodeId.value) return
  updateEditableShapeNode(element, selectedNodeId.value, snapValue(x), snapValue(y))
}

onBeforeUnmount(() => {
  window.clearTimeout(copyTimer)
  window.removeEventListener('pointermove', moveDraggedElement)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointermove', moveDraggedNode)
  window.removeEventListener('pointerup', endNodeDrag)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />
    <main class="mx-auto max-w-[90rem] px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-fuchsia-600 dark:text-slate-400 dark:hover:text-fuchsia-400">
        <Icon icon="mdi:arrow-left" class="size-5" aria-hidden="true" /> Kembali ke Free Tools
      </RouterLink>

      <div class="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span class="inline-flex items-center gap-2 rounded-full bg-fuchsia-50 px-3 py-1.5 text-sm font-bold text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300"><Icon icon="mdi:svg" class="size-4" /> Vector editor</span>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">SVG Maker</h1>
          <p class="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">Buat ilustrasi SVG dari bentuk dan teks, atur setiap layer, lalu salin kode atau download hasilnya. Semuanya berjalan langsung di browser.</p>
        </div>
        <span class="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Icon icon="mdi:shield-check-outline" class="size-5" /> Tanpa upload</span>
      </div>

      <div class="mt-8 grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)_20rem]">
        <aside class="space-y-5">
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:shape-plus-outline" class="size-5 text-fuchsia-600" /> Tambah elemen</h2>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <button v-for="tool in shapeTools" :key="tool.type" type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-fuchsia-500/50 dark:hover:bg-fuchsia-500/10 dark:hover:text-fuchsia-300" @click="addElement(tool.type)"><Icon :icon="tool.icon" class="size-5" /> {{ tool.label }}</button>
              <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-fuchsia-500/50 dark:hover:bg-fuchsia-500/10 dark:hover:text-fuchsia-300" @click="addPathPreset('path')"><Icon icon="mdi:vector-polyline-plus" class="size-5" /> Path</button>
              <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-fuchsia-500/50 dark:hover:bg-fuchsia-500/10 dark:hover:text-fuchsia-300" @click="addPathPreset('polygon')"><Icon icon="mdi:hexagon-outline" class="size-5" /> Polygon</button>
              <button type="button" class="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-fuchsia-500/50 dark:hover:bg-fuchsia-500/10 dark:hover:text-fuchsia-300" @click="addPathPreset('star')"><Icon icon="mdi:star-outline" class="size-5" /> Bintang dengan node</button>
            </div>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between"><h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:layers-outline" class="size-5 text-fuchsia-600" /> Layer</h2><span class="text-xs font-bold text-slate-400">{{ elements.length }}</span></div>
            <div v-if="elements.length" class="mt-4 max-h-72 space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button v-for="(element, index) in [...elements].reverse()" :key="element.id" type="button" class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition" :class="selectedId === element.id ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'" @click="selectLayer(element)"><Icon :icon="elementIcon(element.type)" class="size-5 shrink-0" /><span class="min-w-0 flex-1 truncate text-sm font-bold">{{ element.type === 'text' ? element.text : svgMakerElementLabels[element.type] }}</span><span class="text-[10px] font-black opacity-50">{{ elements.length - index }}</span></button>
            </div>
            <div v-else class="mt-4 rounded-2xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-400 dark:bg-slate-950">Belum ada layer.</div>
            <div class="mt-3 grid grid-cols-4 gap-2"><button type="button" class="grid min-h-10 place-items-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300" :disabled="!selectedElement" title="Naikkan layer" aria-label="Naikkan layer" @click="moveLayer('up')"><Icon icon="mdi:arrow-up" class="size-5" /></button><button type="button" class="grid min-h-10 place-items-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300" :disabled="!selectedElement" title="Turunkan layer" aria-label="Turunkan layer" @click="moveLayer('down')"><Icon icon="mdi:arrow-down" class="size-5" /></button><button type="button" class="grid min-h-10 place-items-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300" :disabled="!selectedElement" title="Duplikat layer" aria-label="Duplikat layer" @click="duplicateSelected"><Icon icon="mdi:content-copy" class="size-5" /></button><button type="button" class="grid min-h-10 place-items-center rounded-xl bg-rose-50 text-rose-600 disabled:opacity-40 dark:bg-rose-500/10 dark:text-rose-300" :disabled="!selectedElement" title="Hapus layer" aria-label="Hapus layer" @click="deleteSelected"><Icon icon="mdi:trash-can-outline" class="size-5" /></button></div>
          </section>
        </aside>

        <section class="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="font-black text-slate-950 dark:text-white">Kanvas</h2><p class="mt-1 text-xs font-semibold text-slate-500">Klik dan tarik elemen atau node untuk memindahkannya.</p></div><div class="flex items-center gap-2 text-xs font-bold text-slate-500"><span>{{ width }} × {{ height }}</span><span>·</span><span>{{ elements.length }} elemen</span></div></div>
          <div class="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition" :class="showGrid ? 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'" :aria-pressed="showGrid" @click="showGrid = !showGrid"><Icon icon="mdi:grid" class="size-4" /> Grid</button>
            <button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition" :class="snapToGrid ? 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'" :aria-pressed="snapToGrid" @click="snapToGrid = !snapToGrid"><Icon icon="mdi:magnet-on" class="size-4" /> Snap</button>
            <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-500">Grid <input v-model.number="gridSize" type="number" min="5" max="100" class="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
            <label class="ml-auto inline-flex items-center gap-2 text-xs font-bold text-slate-500"><Icon icon="mdi:magnify" class="size-4" /><input v-model.number="zoom" type="range" min="50" max="200" step="10" class="w-24 accent-fuchsia-600" /> {{ zoom }}%</label>
          </div>
          <div class="mt-5 grid min-h-[28rem] place-items-center overflow-auto rounded-2xl bg-slate-100 p-5 dark:bg-slate-950 sm:min-h-[38rem]">
            <div class="w-full max-w-4xl overflow-hidden shadow-xl" :style="canvasStyle">
              <svg ref="svgCanvas" :viewBox="`0 0 ${width} ${height}`" class="h-full w-full touch-none select-none" :class="transparentBackground ? 'bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] dark:bg-slate-800' : ''" :style="transparentBackground ? undefined : { backgroundColor: background }" aria-label="Preview SVG" @pointerdown.self="handleCanvasPointerDown">
                <defs><pattern id="svg-maker-grid" :width="gridSize" :height="gridSize" patternUnits="userSpaceOnUse"><path :d="`M ${gridSize} 0 L 0 0 0 ${gridSize}`" fill="none" stroke="currentColor" stroke-width="1" /></pattern></defs>
                <rect v-if="showGrid" width="100%" height="100%" fill="url(#svg-maker-grid)" class="pointer-events-none text-slate-400/35 dark:text-slate-500/30" />
                <g v-for="element in elements" :key="element.id" class="cursor-move" :class="{ '[filter:drop-shadow(0_0_5px_rgba(217,70,239,0.9))]': selectedId === element.id }" @pointerdown.stop="beginDrag($event, element)">
                  <rect v-if="element.type === 'rectangle'" :x="element.x" :y="element.y" :width="element.width" :height="element.height" :rx="element.cornerRadius" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" />
                  <circle v-else-if="element.type === 'circle'" :cx="element.x" :cy="element.y" :r="element.radius" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" />
                  <ellipse v-else-if="element.type === 'ellipse'" :cx="element.x" :cy="element.y" :rx="element.radiusX" :ry="element.radiusY" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" />
                  <line v-else-if="element.type === 'line'" :x1="element.x" :y1="element.y" :x2="element.x2" :y2="element.y2" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" stroke-linecap="round" />
                  <path v-else-if="element.type === 'path'" :d="buildSvgPathData(element.nodes, element.closed)" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" stroke-linejoin="round" stroke-linecap="round" />
                  <text v-else :x="element.x" :y="element.y" font-family="Arial, sans-serif" :font-size="element.fontSize" :font-weight="element.fontWeight" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100">{{ element.text }}</text>
                </g>
                <g v-if="editableNodes.length && selectedElement">
                  <circle v-for="node in editableNodes" :key="node.id" :cx="node.x" :cy="node.y" :r="selectedNodeId === node.id ? 10 : 8" :fill="selectedNodeId === node.id ? '#facc15' : '#ffffff'" stroke="#c026d3" stroke-width="4" class="cursor-crosshair" @pointerdown.stop="beginNodeDrag($event, selectedElement, node)" />
                  <text v-for="(node, index) in editableNodes" :key="`${node.id}-label`" :x="node.x + 13" :y="node.y - 12" font-size="18" font-weight="700" fill="#c026d3" class="pointer-events-none">{{ index + 1 }}</text>
                </g>
              </svg>
            </div>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><div class="flex items-center"><input v-model="fileName" type="text" class="min-w-0 flex-1 rounded-l-xl border border-r-0 border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-fuchsia-500 dark:border-slate-700 dark:bg-slate-950" aria-label="Nama file SVG" @blur="fileName = normalizeSvgFileName(fileName).replace(/\.svg$/i, '')" /><span class="rounded-r-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800">.svg</span></div><button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-fuchsia-200 px-4 font-bold text-fuchsia-700 transition hover:bg-fuchsia-50 dark:border-fuchsia-500/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-500/10" @click="showCode = !showCode"><Icon icon="mdi:code-tags" class="size-5" /> {{ showCode ? 'Tutup kode' : 'Lihat kode' }}</button><button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 font-bold text-white transition hover:bg-fuchsia-700" @click="downloadSvg"><Icon icon="mdi:download" class="size-5" /> Download SVG</button></div>
          <div v-if="showCode" class="mt-4 rounded-2xl bg-slate-950 p-4"><div class="flex items-center justify-between gap-3"><span class="text-xs font-black uppercase tracking-wider text-slate-400">SVG source</span><button type="button" class="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15" @click="copySvgCode"><Icon icon="mdi:content-copy" class="size-4" /> {{ copyLabel }}</button></div><pre class="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs leading-6 text-emerald-300">{{ svgCode }}</pre></div>
        </section>

        <aside class="space-y-5">
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:crop-free" class="size-5 text-fuchsia-600" /> Ukuran dokumen</h2>
            <div class="mt-4 grid grid-cols-2 gap-3"><label class="text-xs font-bold text-slate-500">Lebar<input v-model.number="width" type="number" min="16" max="4096" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-fuchsia-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" @blur="clampCanvasSize" /></label><label class="text-xs font-bold text-slate-500">Tinggi<input v-model.number="height" type="number" min="16" max="4096" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-fuchsia-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" @blur="clampCanvasSize" /></label></div>
            <label class="mt-4 flex items-center justify-between gap-3 text-sm font-bold"><span>Background transparan</span><input v-model="transparentBackground" type="checkbox" class="size-5 accent-fuchsia-600" /></label>
            <label v-if="!transparentBackground" class="mt-4 flex items-center justify-between gap-3 text-sm font-bold"><span>Warna background</span><input v-model="background" type="color" class="size-10 cursor-pointer rounded-lg border-0 bg-transparent" /></label>
          </section>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:tune-variant" class="size-5 text-fuchsia-600" /> Properti elemen</h2>
            <div v-if="selectedElement" class="mt-4 space-y-4">
              <div class="rounded-xl bg-fuchsia-50 px-3 py-2 text-sm font-black text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300">{{ svgMakerElementLabels[selectedElement.type] }}</div>
              <div v-if="selectedElement.type === 'path' || selectedElement.type === 'rectangle' || selectedElement.type === 'ellipse'" class="space-y-3 rounded-2xl border border-fuchsia-200 p-3 dark:border-fuchsia-500/30">
                <div class="flex items-center justify-between gap-2"><div><p class="text-sm font-black text-slate-950 dark:text-white">Edit node</p><p class="mt-0.5 text-[11px] font-semibold text-slate-500">{{ editableNodes.length }} node</p></div><button v-if="selectedElement.type === 'path'" type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition" :class="nodeAddMode ? 'bg-fuchsia-600 text-white' : 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300'" :aria-pressed="nodeAddMode" @click="nodeAddMode = !nodeAddMode"><Icon icon="mdi:vector-point-plus" class="size-4" /> {{ nodeAddMode ? 'Klik kanvas...' : 'Tambah node' }}</button><span v-else class="rounded-lg bg-fuchsia-50 px-2.5 py-1.5 text-[11px] font-bold text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300">Node geometri</span></div>
                <label v-if="selectedElement.type === 'path'" class="flex items-center justify-between gap-3 text-xs font-bold text-slate-600 dark:text-slate-300"><span>Tutup path</span><input v-model="selectedElement.closed" type="checkbox" class="size-5 accent-fuchsia-600" :disabled="selectedElement.nodes.length < 3" /></label>
                <div v-if="selectedNode" class="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div class="flex items-center justify-between"><span class="text-xs font-black text-fuchsia-700 dark:text-fuchsia-300">Node terpilih</span><button v-if="selectedElement.type === 'path'" type="button" class="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300" aria-label="Hapus node" @click="removeSelectedNode"><Icon icon="mdi:trash-can-outline" class="size-4" /></button></div><div class="mt-2 grid grid-cols-2 gap-2"><label class="text-[11px] font-bold text-slate-500">X<input v-model.number="selectedNodeX" type="number" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label><label class="text-[11px] font-bold text-slate-500">Y<input v-model.number="selectedNodeY" type="number" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label></div></div>
                <div class="flex flex-wrap gap-1.5"><button v-for="(node, index) in editableNodes" :key="node.id" type="button" class="grid size-8 place-items-center rounded-lg text-xs font-black transition" :class="selectedNodeId === node.id ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'" @click="selectedNodeId = node.id">{{ index + 1 }}</button></div>
                <p v-if="nodeAddMode && selectedElement.type === 'path'" class="text-[11px] font-semibold leading-5 text-fuchsia-700 dark:text-fuchsia-300">Klik area kosong pada kanvas untuk menambahkan node baru ke ujung path.</p>
              </div>
              <label v-if="selectedElement.type === 'text'" class="block text-xs font-bold text-slate-500">Teks<input v-model="selectedElement.text" type="text" maxlength="200" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-fuchsia-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
              <div v-if="selectedElement.type !== 'path'" class="grid grid-cols-2 gap-3"><label class="text-xs font-bold text-slate-500">X<input v-model.number="selectedElement.x" type="number" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label class="text-xs font-bold text-slate-500">Y<input v-model.number="selectedElement.y" type="number" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label></div>
              <div v-if="selectedElement.type === 'rectangle'" class="grid grid-cols-2 gap-3"><label class="text-xs font-bold text-slate-500">Lebar<input v-model.number="selectedElement.width" type="number" min="1" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label class="text-xs font-bold text-slate-500">Tinggi<input v-model.number="selectedElement.height" type="number" min="1" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label class="col-span-2 text-xs font-bold text-slate-500">Radius sudut<input v-model.number="selectedElement.cornerRadius" type="range" min="0" max="100" class="mt-2 w-full accent-fuchsia-600" /></label></div>
              <label v-if="selectedElement.type === 'circle'" class="block text-xs font-bold text-slate-500">Radius<input v-model.number="selectedElement.radius" type="number" min="1" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
              <div v-if="selectedElement.type === 'ellipse'" class="grid grid-cols-2 gap-3"><label class="text-xs font-bold text-slate-500">Radius X<input v-model.number="selectedElement.radiusX" type="number" min="1" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label class="text-xs font-bold text-slate-500">Radius Y<input v-model.number="selectedElement.radiusY" type="number" min="1" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label></div>
              <div v-if="selectedElement.type === 'line'" class="grid grid-cols-2 gap-3"><label class="text-xs font-bold text-slate-500">X akhir<input v-model.number="selectedElement.x2" type="number" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label class="text-xs font-bold text-slate-500">Y akhir<input v-model.number="selectedElement.y2" type="number" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label></div>
              <div v-if="selectedElement.type === 'text'" class="grid grid-cols-2 gap-3"><label class="text-xs font-bold text-slate-500">Ukuran font<input v-model.number="selectedElement.fontSize" type="number" min="1" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label class="text-xs font-bold text-slate-500">Ketebalan<select v-model.number="selectedElement.fontWeight" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option :value="400">Regular</option><option :value="500">Medium</option><option :value="700">Bold</option><option :value="900">Black</option></select></label></div>
              <div v-if="selectedElement.type !== 'line'" class="flex items-center justify-between gap-3"><label class="text-sm font-bold">Warna isi</label><input v-model="selectedElement.fill" type="color" class="size-10 cursor-pointer rounded-lg border-0 bg-transparent" /></div>
              <div class="grid grid-cols-[1fr_auto] items-end gap-3"><label class="text-xs font-bold text-slate-500">Warna garis<input v-model="selectedElement.stroke" type="text" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="none atau #000000" /></label><input v-if="selectedElement.stroke !== 'none'" v-model="selectedElement.stroke" type="color" class="mb-0.5 size-10 cursor-pointer rounded-lg border-0 bg-transparent" /></div>
              <label class="block text-xs font-bold text-slate-500">Ketebalan garis: {{ selectedElement.strokeWidth }}<input v-model.number="selectedElement.strokeWidth" type="range" min="0" max="40" class="mt-2 w-full accent-fuchsia-600" /></label>
              <label class="block text-xs font-bold text-slate-500">Opacity: {{ selectedElement.opacity }}%<input v-model.number="selectedElement.opacity" type="range" min="0" max="100" class="mt-2 w-full accent-fuchsia-600" /></label>
            </div>
            <div v-else class="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold leading-6 text-slate-400 dark:bg-slate-950">Pilih atau tambahkan elemen untuk mengubah propertinya.</div>
          </section>
          <button type="button" class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 font-bold text-white transition hover:bg-rose-700" @click="showResetConfirmation = true"><Icon icon="mdi:trash-can-outline" class="size-5" /> Bersihkan kanvas</button>
        </aside>
      </div>
    </main>

    <div v-if="showResetConfirmation" class="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-title" @click.self="showResetConfirmation = false"><div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900"><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"><Icon icon="mdi:delete-sweep-outline" class="size-7" /></span><h2 id="reset-title" class="mt-4 text-xl font-black text-slate-950 dark:text-white">Bersihkan kanvas?</h2><p class="mt-2 text-sm leading-6 text-slate-500">Semua elemen dan pengaturan dokumen akan dikembalikan ke awal.</p><div class="mt-6 grid grid-cols-2 gap-3"><button type="button" class="min-h-11 rounded-xl border border-slate-200 font-bold dark:border-slate-700" @click="showResetConfirmation = false">Batal</button><button type="button" class="min-h-11 rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700" @click="showResetConfirmation = false; reset()">Bersihkan</button></div></div></div>
  </div>
</template>
