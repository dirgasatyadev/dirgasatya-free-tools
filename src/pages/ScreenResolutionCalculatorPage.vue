<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { calculateScreenMetrics, roundNumber } from '@/composables/useCalculatorTools'

const width = ref(1920)
const height = ref(1080)
const diagonal = ref<number | undefined>(24)
const presets = [{ n: 'HD', w: 1280, h: 720 }, { n: 'Full HD', w: 1920, h: 1080 }, { n: 'QHD', w: 2560, h: 1440 }, { n: '4K UHD', w: 3840, h: 2160 }, { n: '5K', w: 5120, h: 2880 }, { n: '8K UHD', w: 7680, h: 4320 }]
const result = computed(() => {
  try { return { ...calculateScreenMetrics(width.value, height.value, diagonal.value), error: '' } }
  catch (error) { return { ratio: { width: 0, height: 0, decimal: 0 }, totalPixels: 0, megapixels: 0, orientation: '—', ppi: null, error: error instanceof Error ? error.message : 'Perhitungan gagal.' } }
})
function applyPreset(item: (typeof presets)[number]) { width.value = item.w; height.value = item.h }
</script>

<template>
  <ToolPageShell title="Screen Resolution / Ratio Calculator" description="Analisis rasio, jumlah pixel, megapixel, orientasi, dan kepadatan pixel suatu layar." icon="mdi:monitor-cellphone" category="Calculator">
    <div class="grid gap-4 sm:grid-cols-3"><label class="text-sm font-bold">Lebar (px)<input v-model.number="width" type="number" min="1" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Tinggi (px)<input v-model.number="height" type="number" min="1" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Diagonal (inci, opsional)<input v-model.number="diagonal" type="number" min="0" step="0.1" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label></div>
    <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5"><article v-for="metric in [{ l: 'Aspect ratio', v: `${result.ratio.width}:${result.ratio.height}` }, { l: 'Orientasi', v: result.orientation }, { l: 'Total pixel', v: result.totalPixels.toLocaleString('id-ID') }, { l: 'Megapixel', v: roundNumber(result.megapixels, 4) }, { l: 'Kepadatan', v: result.ppi ? `${roundNumber(result.ppi, 2)} PPI` : 'Isi diagonal' }]" :key="metric.l" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><p class="text-xs font-bold text-slate-400">{{ metric.l }}</p><p class="mt-2 break-words text-xl font-black text-indigo-700 dark:text-indigo-300">{{ metric.v }}</p></article></div>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{{ result.error }}</p>
    <div class="mt-7"><p class="text-sm font-bold">Resolusi populer</p><div class="mt-3 flex flex-wrap gap-2"><button v-for="preset in presets" :key="preset.n" type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-500/10" @click="applyPreset(preset)">{{ preset.n }} <span class="text-xs font-normal text-slate-400">{{ preset.w }}×{{ preset.h }}</span></button></div></div>
  </ToolPageShell>
</template>
