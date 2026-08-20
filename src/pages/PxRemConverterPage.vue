<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { convertPxRem, roundNumber } from '@/composables/useCalculatorTools'

const direction = ref<'px-to-rem' | 'rem-to-px'>('px-to-rem')
const value = ref(16)
const rootFontSize = ref(16)
const copied = ref(false)
const result = computed(() => {
  try { return { value: convertPxRem(value.value, rootFontSize.value, direction.value), error: '' } }
  catch (error) { return { value: 0, error: error instanceof Error ? error.message : 'Perhitungan gagal.' } }
})
const outputUnit = computed(() => direction.value === 'px-to-rem' ? 'rem' : 'px')
function swap() { direction.value = direction.value === 'px-to-rem' ? 'rem-to-px' : 'px-to-rem' }
async function copyResult() {
  await navigator.clipboard.writeText(`${roundNumber(result.value.value, 6)}${outputUnit.value}`)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1_500)
}
</script>

<template>
  <ToolPageShell title="PX ↔ REM Converter" description="Konversikan ukuran CSS antara pixel dan rem berdasarkan root font size yang dapat disesuaikan." icon="mdi:swap-horizontal-bold" category="Developer">
    <div class="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
      <label class="text-sm font-bold">{{ direction === 'px-to-rem' ? 'Pixel (px)' : 'REM' }}<input v-model.number="value" type="number" step="any" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label>
      <button type="button" class="grid size-12 place-items-center justify-self-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:rotate-180 hover:bg-indigo-700" aria-label="Tukar arah konversi" @click="swap"><Icon icon="mdi:swap-horizontal" class="size-6 lg:rotate-90" /></button>
      <div><p class="text-sm font-bold">Hasil {{ outputUnit.toUpperCase() }}</p><div class="mt-2 flex min-h-14 items-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-xl font-black text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"><span class="min-w-0 flex-1 truncate">{{ roundNumber(result.value, 6) }}{{ outputUnit }}</span><button type="button" class="grid size-9 place-items-center rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20" :disabled="!!result.error" aria-label="Salin hasil" @click="copyResult"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-5" /></button></div></div>
    </div>
    <label class="mt-6 block max-w-sm text-sm font-bold">Root font size<input v-model.number="rootFontSize" type="number" min="1" step="any" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /><span class="mt-1 block text-xs font-normal text-slate-400">Default browser umumnya 16px.</span></label>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ result.error }}</p>
    <div class="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8"><button v-for="px in [4, 8, 12, 16, 20, 24, 32, 48]" :key="px" type="button" class="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-500/10" @click="direction = 'px-to-rem'; value = px">{{ px }}px<br><span class="text-xs font-normal text-slate-400">{{ roundNumber(px / rootFontSize, 4) }}rem</span></button></div>
  </ToolPageShell>
</template>
