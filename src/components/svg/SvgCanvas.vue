<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { buildSvgPathData, type SvgMakerElement, type SvgPathNode } from '@/composables/useSvgMaker'

defineProps<{ width: number; height: number; background: string; transparentBackground: boolean; elements: SvgMakerElement[]; selectedId: string | null; gridSize: number; showGrid: boolean; editableNodes: SvgPathNode[]; selectedElement: SvgMakerElement | null; selectedNodeId: string | null }>()
const emit = defineEmits<{ ready: [element: SVGSVGElement | null]; canvasPointer: [event: PointerEvent]; elementPointer: [event: PointerEvent, element: SvgMakerElement]; nodePointer: [event: PointerEvent, element: SvgMakerElement, node: SvgPathNode] }>()
const canvas = ref<SVGSVGElement | null>(null)
onMounted(() => emit('ready', canvas.value))
onBeforeUnmount(() => emit('ready', null))
</script>

<template>
  <svg ref="canvas" :viewBox="`0 0 ${width} ${height}`" class="h-full w-full touch-none select-none" :class="transparentBackground ? 'bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] dark:bg-slate-800' : ''" :style="transparentBackground ? undefined : { backgroundColor: background }" aria-label="Preview SVG" @pointerdown.self="emit('canvasPointer', $event)">
    <defs><pattern id="svg-maker-grid" :width="gridSize" :height="gridSize" patternUnits="userSpaceOnUse"><path :d="`M ${gridSize} 0 L 0 0 0 ${gridSize}`" fill="none" stroke="currentColor" stroke-width="1" /></pattern></defs>
    <rect v-if="showGrid" width="100%" height="100%" fill="url(#svg-maker-grid)" class="pointer-events-none text-slate-400/35 dark:text-slate-500/30" />
    <g v-for="element in elements" :key="element.id" class="cursor-move" :class="{ '[filter:drop-shadow(0_0_5px_rgba(217,70,239,0.9))]': selectedId === element.id }" @pointerdown.stop="emit('elementPointer', $event, element)">
      <rect v-if="element.type === 'rectangle'" :x="element.x" :y="element.y" :width="element.width" :height="element.height" :rx="element.cornerRadius" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" />
      <circle v-else-if="element.type === 'circle'" :cx="element.x" :cy="element.y" :r="element.radius" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" />
      <ellipse v-else-if="element.type === 'ellipse'" :cx="element.x" :cy="element.y" :rx="element.radiusX" :ry="element.radiusY" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" />
      <line v-else-if="element.type === 'line'" :x1="element.x" :y1="element.y" :x2="element.x2" :y2="element.y2" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" stroke-linecap="round" />
      <path v-else-if="element.type === 'path'" :d="buildSvgPathData(element.nodes, element.closed)" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100" stroke-linejoin="round" stroke-linecap="round" />
      <text v-else :x="element.x" :y="element.y" font-family="Arial, sans-serif" :font-size="element.fontSize" :font-weight="element.fontWeight" :fill="element.fill" :stroke="element.stroke" :stroke-width="element.strokeWidth" :opacity="element.opacity / 100">{{ element.text }}</text>
    </g>
    <g v-if="editableNodes.length && selectedElement"><circle v-for="node in editableNodes" :key="node.id" :cx="node.x" :cy="node.y" :r="selectedNodeId === node.id ? 10 : 8" :fill="selectedNodeId === node.id ? '#facc15' : '#ffffff'" stroke="#c026d3" stroke-width="4" class="cursor-crosshair" @pointerdown.stop="emit('nodePointer', $event, selectedElement, node)" /><text v-for="(node, index) in editableNodes" :key="`${node.id}-label`" :x="node.x + 13" :y="node.y - 12" font-size="18" font-weight="700" fill="#c026d3" class="pointer-events-none">{{ index + 1 }}</text></g>
  </svg>
</template>
