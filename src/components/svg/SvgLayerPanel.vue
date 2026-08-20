<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { svgMakerElementLabels, type SvgMakerElement } from '@/composables/useSvgMaker'

defineProps<{ elements: SvgMakerElement[]; selectedId: string | null }>()
const emit = defineEmits<{ select: [id: string]; move: [direction: 'up' | 'down']; duplicate: []; delete: [] }>()
function elementIcon(type: SvgMakerElement['type']) {
  return ({ rectangle: 'mdi:rectangle-outline', circle: 'mdi:circle-outline', ellipse: 'mdi:ellipse-outline', line: 'mdi:vector-line', text: 'mdi:format-text', path: 'mdi:vector-polyline' })[type]
}
</script>

<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-center justify-between"><h2 class="flex items-center gap-2 font-black"><Icon icon="mdi:layers-outline" class="size-5 text-fuchsia-600" /> Layer</h2><span class="text-xs font-bold text-slate-400">{{ elements.length }}</span></div>
    <div v-if="elements.length" class="mt-4 max-h-72 space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><button v-for="(element, index) in [...elements].reverse()" :key="element.id" type="button" class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition" :class="selectedId === element.id ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'" @click="emit('select', element.id)"><Icon :icon="elementIcon(element.type)" class="size-5 shrink-0" /><span class="min-w-0 flex-1 truncate text-sm font-bold">{{ element.type === 'text' ? element.text : svgMakerElementLabels[element.type] }}</span><span class="text-[10px] font-black opacity-50">{{ elements.length - index }}</span></button></div>
    <div v-else class="mt-4 rounded-2xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-400 dark:bg-slate-950">Belum ada layer.</div>
    <div class="mt-3 grid grid-cols-4 gap-2"><button type="button" class="grid min-h-10 place-items-center rounded-xl bg-slate-100 disabled:opacity-40 dark:bg-slate-800" :disabled="!selectedId" aria-label="Naikkan layer" @click="emit('move', 'up')"><Icon icon="mdi:arrow-up" class="size-5" /></button><button type="button" class="grid min-h-10 place-items-center rounded-xl bg-slate-100 disabled:opacity-40 dark:bg-slate-800" :disabled="!selectedId" aria-label="Turunkan layer" @click="emit('move', 'down')"><Icon icon="mdi:arrow-down" class="size-5" /></button><button type="button" class="grid min-h-10 place-items-center rounded-xl bg-slate-100 disabled:opacity-40 dark:bg-slate-800" :disabled="!selectedId" aria-label="Duplikat layer" @click="emit('duplicate')"><Icon icon="mdi:content-copy" class="size-5" /></button><button type="button" class="grid min-h-10 place-items-center rounded-xl bg-rose-50 text-rose-600 disabled:opacity-40 dark:bg-rose-500/10" :disabled="!selectedId" aria-label="Hapus layer" @click="emit('delete')"><Icon icon="mdi:trash-can-outline" class="size-5" /></button></div>
  </section>
</template>
