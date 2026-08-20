<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { calculateAspectRatio, calculateProportionalHeight, calculateProportionalWidth, roundNumber, validateCustomRatio } from '@/composables/useCalculatorTools'

const width = ref(1920)
const height = ref(1080)
const targetWidth = ref(1280)
const targetHeight = ref(720)
const lockRatio = ref(true)
const useCustomRatio = ref(false)
const customRatioWidth = ref(16)
const customRatioHeight = ref(9)
let syncingTarget = false

const result = computed(() => {
  try {
    const pixelRatio = calculateAspectRatio(width.value, height.value)
    const activeRatio = useCustomRatio.value ? validateCustomRatio(customRatioWidth.value, customRatioHeight.value) : pixelRatio
    return { pixelRatio, activeRatio, error: '' }
  } catch (error) {
    return { pixelRatio: { width: 0, height: 0, decimal: 0 }, activeRatio: { width: 0, height: 0, decimal: 0 }, error: error instanceof Error ? error.message : 'Perhitungan gagal.' }
  }
})

watch(targetWidth, (value) => {
  if (!lockRatio.value || syncingTarget || result.value.error) return
  try {
    syncingTarget = true
    targetHeight.value = Math.round(calculateProportionalHeight(result.value.activeRatio.width, result.value.activeRatio.height, value))
  } finally { syncingTarget = false }
})

watch(targetHeight, (value) => {
  if (!lockRatio.value || syncingTarget || result.value.error) return
  try {
    syncingTarget = true
    targetWidth.value = Math.round(calculateProportionalWidth(result.value.activeRatio.width, result.value.activeRatio.height, value))
  } finally { syncingTarget = false }
})

watch([useCustomRatio, customRatioWidth, customRatioHeight, width, height], () => {
  if (!lockRatio.value || result.value.error) return
  syncingTarget = true
  targetHeight.value = Math.round((result.value.activeRatio.height / result.value.activeRatio.width) * targetWidth.value)
  syncingTarget = false
})

function applyPreset(presetWidth: number, presetHeight: number) {
  customRatioWidth.value = presetWidth
  customRatioHeight.value = presetHeight
  useCustomRatio.value = true
}
</script>

<template>
  <ToolPageShell title="Aspect Ratio Calculator" description="Sederhanakan rasio pixel, gunakan rasio custom, dan hitung lebar atau tinggi secara proporsional." icon="mdi:aspect-ratio" category="Calculator">
    <div class="grid gap-4 sm:grid-cols-2"><label class="text-sm font-bold">Lebar pixel<input v-model.number="width" type="number" min="1" step="1" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Tinggi pixel<input v-model.number="height" type="number" min="1" step="1" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label></div>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ result.error }}</p>

    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      <article class="rounded-2xl bg-indigo-600 p-5 text-white"><Icon icon="mdi:aspect-ratio" class="size-6 text-indigo-200" /><p class="mt-4 text-xs font-black uppercase tracking-wider text-indigo-200">Rasio pixel disederhanakan</p><p class="mt-1 text-4xl font-black">{{ result.pixelRatio.width }}:{{ result.pixelRatio.height }}</p><p class="mt-2 text-sm text-indigo-100">Decimal {{ roundNumber(result.pixelRatio.decimal, 6) }}</p></article>
      <article class="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><label class="flex items-center justify-between gap-3 text-sm font-bold"><span>Gunakan rasio custom</span><input v-model="useCustomRatio" type="checkbox" class="size-5 accent-indigo-600" /></label><div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><input v-model.number="customRatioWidth" type="number" min="0.0001" step="any" :disabled="!useCustomRatio" class="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950" aria-label="Rasio lebar custom" /><strong>:</strong><input v-model.number="customRatioHeight" type="number" min="0.0001" step="any" :disabled="!useCustomRatio" class="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950" aria-label="Rasio tinggi custom" /></div><p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Aktif: {{ result.activeRatio.width }}:{{ result.activeRatio.height }} · decimal {{ roundNumber(result.activeRatio.decimal, 6) }}</p></article>
    </div>

    <section class="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><div class="flex items-center justify-between gap-3"><h2 class="font-black">Ukuran proporsional</h2><label class="inline-flex items-center gap-2 text-sm font-bold"><Icon :icon="lockRatio ? 'mdi:lock-outline' : 'mdi:lock-open-outline'" class="size-5" /> Kunci rasio<input v-model="lockRatio" type="checkbox" class="size-5 accent-indigo-600" /></label></div><div class="mt-4 grid gap-4 sm:grid-cols-2"><label class="text-sm font-bold">Lebar target<input v-model.number="targetWidth" type="number" min="1" step="1" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Tinggi target<input v-model.number="targetHeight" type="number" min="1" step="1" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label></div></section>

    <div class="mt-7"><p class="text-sm font-bold">Preset populer & cinematic</p><div class="mt-3 flex flex-wrap gap-2"><button v-for="preset in [{ l: '16:9', w: 16, h: 9 }, { l: '4:3', w: 4, h: 3 }, { l: '1:1', w: 1, h: 1 }, { l: '9:16', w: 9, h: 16 }, { l: '21:9', w: 21, h: 9 }, { l: '2.39:1', w: 2.39, h: 1 }, { l: '1.85:1', w: 1.85, h: 1 }]" :key="preset.l" type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-500/10" @click="applyPreset(preset.w, preset.h)">{{ preset.l }}</button></div></div>
  </ToolPageShell>
</template>
