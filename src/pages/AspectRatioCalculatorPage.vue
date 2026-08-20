<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { calculateAspectRatio, calculateProportionalHeight, roundNumber } from '@/composables/useCalculatorTools'

const width = ref(1920)
const height = ref(1080)
const targetWidth = ref(1280)
const result = computed(() => {
  try {
    const ratio = calculateAspectRatio(width.value, height.value)
    return { ratio, targetHeight: calculateProportionalHeight(width.value, height.value, targetWidth.value), error: '' }
  } catch (error) { return { ratio: { width: 0, height: 0, decimal: 0 }, targetHeight: 0, error: error instanceof Error ? error.message : 'Perhitungan gagal.' } }
})
function applyPreset(presetWidth: number, presetHeight: number) { width.value = presetWidth; height.value = presetHeight }
</script>

<template>
  <ToolPageShell title="Aspect Ratio Calculator" description="Temukan rasio gambar atau video dan hitung ukuran baru tanpa mengubah proporsinya." icon="mdi:aspect-ratio" category="Calculator">
    <div class="grid gap-4 sm:grid-cols-2"><label class="text-sm font-bold">Lebar<input v-model.number="width" type="number" min="1" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Tinggi<input v-model.number="height" type="number" min="1" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label></div>
    <div class="mt-6 grid gap-4 sm:grid-cols-2"><article class="rounded-2xl bg-indigo-600 p-5 text-white"><Icon icon="mdi:aspect-ratio" class="size-6 text-indigo-200" /><p class="mt-4 text-xs font-black uppercase tracking-wider text-indigo-200">Aspect ratio</p><p class="mt-1 text-4xl font-black">{{ result.ratio.width }}:{{ result.ratio.height }}</p><p class="mt-2 text-sm text-indigo-100">Decimal {{ roundNumber(result.ratio.decimal, 4) }}</p></article><article class="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><label class="text-sm font-bold">Lebar target<input v-model.number="targetWidth" type="number" min="1" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><p class="mt-4 text-sm text-slate-500">Tinggi proporsional</p><p class="text-2xl font-black text-indigo-600 dark:text-indigo-300">{{ roundNumber(result.targetHeight, 2) }} px</p></article></div>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{{ result.error }}</p>
    <div class="mt-7"><p class="text-sm font-bold">Preset populer</p><div class="mt-3 flex flex-wrap gap-2"><button v-for="preset in [{ l: '16:9', w: 16, h: 9 }, { l: '4:3', w: 4, h: 3 }, { l: '1:1', w: 1, h: 1 }, { l: '9:16', w: 9, h: 16 }, { l: '21:9', w: 21, h: 9 }]" :key="preset.l" type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-500/10" @click="applyPreset(preset.w, preset.h)">{{ preset.l }}</button></div></div>
  </ToolPageShell>
</template>
