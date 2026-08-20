<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SiteHeader from '@/components/SiteHeader.vue'
import SvgLayerPanel from '@/components/svg/SvgLayerPanel.vue'
import SvgToolbar from '@/components/svg/SvgToolbar.vue'
import SvgCanvas from '@/components/svg/SvgCanvas.vue'
import { useSvgPointer } from '@/composables/svg/useSvgPointer'
import { useSvgSelection } from '@/composables/svg/useSvgSelection'
import { useSvgHistory } from '@/composables/svg/useSvgHistory'
import {
  clampSvgDimension,
  normalizeSvgFileName,
  svgMakerElementLabels,
  updateEditableShapeNode,
  useSvgMaker,
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
  addElement: addElementBase,
  addPathPreset: addPathPresetBase,
  addPathNode: addPathNodeBase,
  deletePathNode: deletePathNodeBase,
  deleteSelected: deleteSelectedBase,
  duplicateSelected: duplicateSelectedBase,
  moveLayer: moveLayerBase,
  reset: resetBase,
} = useSvgMaker()

const fileName = ref('design')
const copyLabel = ref('Salin kode SVG')
const showCode = ref(false)
const showResetConfirmation = ref(false)
const svgCanvas = ref<SVGSVGElement | null>(null)
const nodeAddMode = ref(false)
const showGrid = ref(true)
const snapToGrid = ref(false)
const gridSize = ref(20)
const zoom = ref(100)
let copyTimer = 0
const { selectedNodeId, editableNodes, selectedNode } = useSvgSelection(selectedElement)
const { snapValue, canvasCoordinates } = useSvgPointer({ canvas: svgCanvas, width, height, snapToGrid, gridSize })
const history = useSvgHistory(
  () => ({ width: width.value, height: height.value, background: background.value, transparentBackground: transparentBackground.value, elements: structuredClone(elements.value), selectedId: selectedId.value }),
  (snapshot) => { width.value = snapshot.width; height.value = snapshot.height; background.value = snapshot.background; transparentBackground.value = snapshot.transparentBackground; elements.value = snapshot.elements; selectedId.value = snapshot.selectedId },
)

function addElement(type: Parameters<typeof addElementBase>[0]) { history.checkpoint(); addElementBase(type) }
function addPathPreset(preset: Parameters<typeof addPathPresetBase>[0]) { history.checkpoint(); addPathPresetBase(preset) }
function deleteSelected() { history.checkpoint(); deleteSelectedBase() }
function duplicateSelected() { history.checkpoint(); duplicateSelectedBase() }
function moveLayer(direction: 'up' | 'down') { history.checkpoint(); moveLayerBase(direction) }
function reset() { history.checkpoint(); resetBase() }

const canvasStyle = computed(() => ({
  aspectRatio: `${width.value} / ${height.value}`,
  width: `${zoom.value}%`,
}))
const selectedNodeX = computed({
  get: () => selectedNode.value?.x ?? 0,
  set: (value: number) => updateSelectedNodeCoordinate(value, selectedNode.value?.y ?? 0),
})
const selectedNodeY = computed({
  get: () => selectedNode.value?.y ?? 0,
  set: (value: number) => updateSelectedNodeCoordinate(selectedNode.value?.x ?? 0, value),
})

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
  history.checkpoint()
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

function selectLayer(id: string) {
  selectedId.value = id
  selectedNodeId.value = null
  nodeAddMode.value = false
}

function handleCanvasPointerDown(event: PointerEvent) {
  const element = selectedElement.value
  if (nodeAddMode.value && element?.type === 'path') {
    const coordinates = canvasCoordinates(event)
    if (!coordinates) return
    history.checkpoint()
    const node = addPathNodeBase(element.id, coordinates.x, coordinates.y)
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
  history.checkpoint()
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
  history.checkpoint()
  deletePathNodeBase(element.id, selectedNodeId.value)
  selectedNodeId.value = null
}

function updateSelectedNodeCoordinate(x: number, y: number) {
  const element = selectedElement.value
  if (!element || !selectedNodeId.value) return
  updateEditableShapeNode(element, selectedNodeId.value, snapValue(x), snapValue(y))
}

function handleEditorShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase('en') === 'z') {
    event.preventDefault()
    if (event.shiftKey) history.redo()
    else history.undo()
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase('en') === 'd') {
    event.preventDefault(); duplicateSelected()
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault(); deleteSelected()
  }
}

onMounted(() => window.addEventListener('keydown', handleEditorShortcut))

onBeforeUnmount(() => {
  window.clearTimeout(copyTimer)
  window.removeEventListener('pointermove', moveDraggedElement)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointermove', moveDraggedNode)
  window.removeEventListener('pointerup', endNodeDrag)
  window.removeEventListener('keydown', handleEditorShortcut)
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
          <SvgToolbar @add-element="addElement" @add-path="addPathPreset" />
          <SvgLayerPanel :elements="elements" :selected-id="selectedId" @select="selectLayer" @move="moveLayer" @duplicate="duplicateSelected" @delete="deleteSelected" />
        </aside>

        <section class="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="font-black text-slate-950 dark:text-white">Kanvas</h2><p class="mt-1 text-xs font-semibold text-slate-500">Klik dan tarik elemen atau node untuk memindahkannya.</p></div><div class="flex items-center gap-2 text-xs font-bold text-slate-500"><span>{{ width }} × {{ height }}</span><span>·</span><span>{{ elements.length }} elemen</span></div></div>
          <div class="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
            <button type="button" class="grid size-9 place-items-center rounded-lg bg-slate-100 disabled:opacity-40 dark:bg-slate-800" :disabled="!history.canUndo.value" aria-label="Undo" title="Undo" @click="history.undo"><Icon icon="mdi:undo" class="size-4" /></button><button type="button" class="grid size-9 place-items-center rounded-lg bg-slate-100 disabled:opacity-40 dark:bg-slate-800" :disabled="!history.canRedo.value" aria-label="Redo" title="Redo" @click="history.redo"><Icon icon="mdi:redo" class="size-4" /></button>
            <button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition" :class="showGrid ? 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'" :aria-pressed="showGrid" @click="showGrid = !showGrid"><Icon icon="mdi:grid" class="size-4" /> Grid</button>
            <button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition" :class="snapToGrid ? 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'" :aria-pressed="snapToGrid" @click="snapToGrid = !snapToGrid"><Icon icon="mdi:magnet-on" class="size-4" /> Snap</button>
            <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-500">Grid <input v-model.number="gridSize" type="number" min="5" max="100" class="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
            <label class="ml-auto inline-flex items-center gap-2 text-xs font-bold text-slate-500"><Icon icon="mdi:magnify" class="size-4" /><input v-model.number="zoom" type="range" min="50" max="200" step="10" class="w-24 accent-fuchsia-600" /> {{ zoom }}%</label>
          </div>
          <div class="mt-5 grid min-h-[28rem] place-items-center overflow-auto rounded-2xl bg-slate-100 p-5 dark:bg-slate-950 sm:min-h-[38rem]">
            <div class="w-full max-w-4xl overflow-hidden shadow-xl" :style="canvasStyle">
              <SvgCanvas :width="width" :height="height" :background="background" :transparent-background="transparentBackground" :elements="elements" :selected-id="selectedId" :grid-size="gridSize" :show-grid="showGrid" :editable-nodes="editableNodes" :selected-element="selectedElement" :selected-node-id="selectedNodeId" @ready="svgCanvas = $event" @canvas-pointer="handleCanvasPointerDown" @element-pointer="beginDrag" @node-pointer="beginNodeDrag" />
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
