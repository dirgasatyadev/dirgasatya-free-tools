<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { jsonPreview, type JsonExplorerNode } from '@/composables/useJsonExplorer'

const props = defineProps<{ nodes: JsonExplorerNode[]; expandedPaths: Set<string>; matchedPaths: Set<string> }>()
const emit = defineEmits<{ toggle: [path: string]; copyPath: [path: string]; copyValue: [value: unknown] }>()
const rowHeight = 36
const overscan = 8
const viewport = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(480)
const visibleNodes = computed(() => {
  const visible: JsonExplorerNode[] = []
  let hiddenBelowDepth: number | null = null
  for (const node of props.nodes) {
    if (hiddenBelowDepth !== null && node.depth > hiddenBelowDepth) continue
    if (hiddenBelowDepth !== null && node.depth <= hiddenBelowDepth) hiddenBelowDepth = null
    visible.push(node)
    if (node.expandable && !props.expandedPaths.has(node.path)) hiddenBelowDepth = node.depth
  }
  return visible
})
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan))
const endIndex = computed(() => Math.min(visibleNodes.value.length, Math.ceil((scrollTop.value + viewportHeight.value) / rowHeight) + overscan))
const virtualNodes = computed(() => visibleNodes.value.slice(startIndex.value, endIndex.value))
function updateViewport(event?: Event) {
  const element = (event?.currentTarget as HTMLElement | null) ?? viewport.value
  if (!element) return
  scrollTop.value = element.scrollTop
  viewportHeight.value = element.clientHeight || 480
}
onMounted(() => updateViewport())
watch(() => props.matchedPaths, (matchedPaths) => {
  if (matchedPaths.size === 0) return
  const matchIndex = visibleNodes.value.findIndex((node) => matchedPaths.has(node.path))
  if (matchIndex < 0 || !viewport.value) return
  viewport.value.scrollTop = matchIndex * rowHeight
  updateViewport()
}, { flush: 'post' })
const typeClasses: Record<JsonExplorerNode['type'], string> = { object: 'text-indigo-600', array: 'text-violet-600', string: 'text-emerald-600', number: 'text-blue-600', boolean: 'text-amber-600', null: 'text-slate-400' }
</script>

<template>
  <div ref="viewport" class="size-full overflow-auto font-mono text-sm" role="tree" @scroll.passive="updateViewport">
    <div class="relative min-w-max" :style="{ height: `${visibleNodes.length * rowHeight}px` }">
      <div class="absolute inset-x-0 top-0" :style="{ transform: `translateY(${startIndex * rowHeight}px)` }">
    <div v-for="(node, index) in virtualNodes" :key="node.path" role="treeitem" class="group flex h-9 items-center gap-1 rounded-lg pr-2 hover:bg-slate-50 dark:hover:bg-slate-800" :class="matchedPaths.has(node.path) ? 'bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-500/10' : ''" :style="{ paddingLeft: `${node.depth * 1.25 + 0.5}rem` }" :aria-posinset="startIndex + index + 1" :aria-setsize="visibleNodes.length">
      <button v-if="node.expandable" type="button" class="grid size-7 shrink-0 place-items-center rounded hover:bg-slate-200 dark:hover:bg-slate-700" :aria-label="expandedPaths.has(node.path) ? `Tutup ${node.path}` : `Buka ${node.path}`" @click="emit('toggle', node.path)"><Icon :icon="expandedPaths.has(node.path) ? 'mdi:chevron-down' : 'mdi:chevron-right'" class="size-4" /></button><span v-else class="size-7 shrink-0"></span>
      <button type="button" class="font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-200" :title="node.path" @click="emit('copyPath', node.path)">{{ node.key }}</button><span class="text-slate-400">:</span><span :class="typeClasses[node.type]">{{ jsonPreview(node.value) }}</span><span v-if="node.expandable" class="text-xs text-slate-400">{{ node.childCount }} item</span><button v-if="!node.expandable" type="button" class="ml-auto hidden size-7 place-items-center rounded text-slate-400 group-hover:grid" aria-label="Salin value" @click="emit('copyValue', node.value)"><Icon icon="mdi:content-copy" class="size-4" /></button>
    </div>
      </div>
    </div>
  </div>
</template>
