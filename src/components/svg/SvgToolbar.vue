<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { SvgElementType, SvgPathPreset } from '@/composables/useSvgMaker'

const emit = defineEmits<{ addElement: [type: SvgElementType]; addPath: [preset: SvgPathPreset] }>()
const tools: { type: SvgElementType; icon: string; label: string }[] = [
  { type: 'rectangle', icon: 'mdi:rectangle-outline', label: 'Kotak' },
  { type: 'circle', icon: 'mdi:circle-outline', label: 'Lingkaran' },
  { type: 'ellipse', icon: 'mdi:ellipse-outline', label: 'Elips' },
  { type: 'line', icon: 'mdi:vector-line', label: 'Garis' },
  { type: 'text', icon: 'mdi:format-text', label: 'Teks' },
]
</script>

<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 class="flex items-center gap-2 font-black"><Icon icon="mdi:shape-plus-outline" class="size-5 text-fuchsia-600" /> Tambah elemen</h2>
    <div class="mt-4 grid grid-cols-2 gap-2">
      <button v-for="tool in tools" :key="tool.type" type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-fuchsia-500/10" @click="emit('addElement', tool.type)"><Icon :icon="tool.icon" class="size-5" />{{ tool.label }}</button>
      <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-slate-700" @click="emit('addPath', 'path')"><Icon icon="mdi:vector-polyline-plus" class="size-5" />Path</button>
      <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-slate-700" @click="emit('addPath', 'polygon')"><Icon icon="mdi:hexagon-outline" class="size-5" />Polygon</button>
      <button type="button" class="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-slate-700" @click="emit('addPath', 'star')"><Icon icon="mdi:star-outline" class="size-5" />Bintang dengan node</button>
    </div>
  </section>
</template>
