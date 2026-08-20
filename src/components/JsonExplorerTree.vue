<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { jsonPreview, type JsonExplorerNode } from '@/composables/useJsonExplorer'

const props = defineProps<{ nodes: JsonExplorerNode[]; expandedPaths: Set<string>; matchedPaths: Set<string> }>()
const emit = defineEmits<{ toggle: [path: string]; copyPath: [path: string]; copyValue: [value: unknown] }>()
const nodesByPath = computed(() => new Map(props.nodes.map((node) => [node.path, node])))
const visibleNodes = computed(() => props.nodes.filter((node) => {
  let parent = node.parentPath
  while (parent) {
    if (!props.expandedPaths.has(parent)) return false
    parent = nodesByPath.value.get(parent)?.parentPath ?? null
  }
  return true
}))
const typeClasses: Record<JsonExplorerNode['type'], string> = { object: 'text-indigo-600', array: 'text-violet-600', string: 'text-emerald-600', number: 'text-blue-600', boolean: 'text-amber-600', null: 'text-slate-400' }
</script>

<template>
  <div class="min-w-max py-2 font-mono text-sm" role="tree">
    <div v-for="node in visibleNodes" :key="node.path" role="treeitem" class="group flex min-h-9 items-center gap-1 rounded-lg pr-2 hover:bg-slate-50 dark:hover:bg-slate-800" :class="matchedPaths.has(node.path) ? 'bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-500/10' : ''" :style="{ paddingLeft: `${node.depth * 1.25 + 0.5}rem` }">
      <button v-if="node.expandable" type="button" class="grid size-7 shrink-0 place-items-center rounded hover:bg-slate-200 dark:hover:bg-slate-700" :aria-label="expandedPaths.has(node.path) ? `Tutup ${node.path}` : `Buka ${node.path}`" @click="emit('toggle', node.path)"><Icon :icon="expandedPaths.has(node.path) ? 'mdi:chevron-down' : 'mdi:chevron-right'" class="size-4" /></button><span v-else class="size-7 shrink-0"></span>
      <button type="button" class="font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-200" :title="node.path" @click="emit('copyPath', node.path)">{{ node.key }}</button><span class="text-slate-400">:</span><span :class="typeClasses[node.type]">{{ jsonPreview(node.value) }}</span><span v-if="node.expandable" class="text-xs text-slate-400">{{ node.childCount }} item</span><button v-if="!node.expandable" type="button" class="ml-auto hidden size-7 place-items-center rounded text-slate-400 group-hover:grid" aria-label="Salin value" @click="emit('copyValue', node.value)"><Icon icon="mdi:content-copy" class="size-4" /></button>
    </div>
  </div>
</template>
