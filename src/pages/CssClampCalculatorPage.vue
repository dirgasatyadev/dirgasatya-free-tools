<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { calculateCssClamp, roundNumber } from '@/composables/useCalculatorTools'

const minSize = ref(16)
const maxSize = ref(32)
const minViewport = ref(320)
const maxViewport = ref(1280)
const rootFontSize = ref(16)
const copied = ref(false)
const result = computed(() => {
  try { return { ...calculateCssClamp(minSize.value, maxSize.value, minViewport.value, maxViewport.value, rootFontSize.value), error: '' } }
  catch (error) { return { css: '', slope: 0, intercept: 0, error: error instanceof Error ? error.message : 'Perhitungan gagal.' } }
})
async function copyCss() { if (!result.value.css) return; await navigator.clipboard.writeText(result.value.css); copied.value = true; window.setTimeout(() => (copied.value = false), 1_500) }
</script>

<template>
  <ToolPageShell title="CSS clamp() Calculator" description="Buat nilai CSS fluid yang berubah mulus antara ukuran dan viewport minimum hingga maksimum." icon="mdi:code-braces-box" category="Developer">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label class="text-sm font-bold">Ukuran min (px)<input v-model.number="minSize" type="number" min="1" step="any" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label>
      <label class="text-sm font-bold">Ukuran max (px)<input v-model.number="maxSize" type="number" min="1" step="any" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label>
      <label class="text-sm font-bold">Viewport min (px)<input v-model.number="minViewport" type="number" min="1" step="any" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label>
      <label class="text-sm font-bold">Viewport max (px)<input v-model.number="maxViewport" type="number" min="1" step="any" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label>
      <label class="text-sm font-bold">Root size (px)<input v-model.number="rootFontSize" type="number" min="1" step="any" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label>
    </div>
    <section class="mt-7 overflow-hidden rounded-2xl bg-slate-950 text-white"><div class="p-5 sm:p-6"><p class="text-xs font-black uppercase tracking-widest text-violet-300">Hasil CSS</p><code class="mt-3 block break-all text-lg font-black leading-8 text-white sm:text-xl">{{ result.css || 'Periksa nilai input' }}</code><button type="button" class="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 font-bold hover:bg-violet-400 disabled:opacity-50" :disabled="!result.css" @click="copyCss"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-5" />{{ copied ? 'Tersalin' : 'Salin clamp()' }}</button></div><div class="grid grid-cols-2 border-t border-white/10 bg-white/5 p-4 text-center text-sm"><span><small class="block text-slate-400">Slope</small><strong>{{ roundNumber(result.slope, 4) }}vw</strong></span><span><small class="block text-slate-400">Intercept</small><strong>{{ roundNumber(result.intercept, 4) }}px</strong></span></div></section>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ result.error }}</p>
    <div class="mt-6 rounded-2xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200"><strong>Contoh penggunaan:</strong><code class="mt-2 block break-all">font-size: {{ result.css || 'clamp(...)' }};</code></div>
  </ToolPageShell>
</template>
