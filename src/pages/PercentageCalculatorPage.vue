<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { calculatePercentage, roundNumber } from '@/composables/useCalculatorTools'

const mode = ref<'of' | 'ratio' | 'change'>('of')
const first = ref(20)
const second = ref(250)
const modes = [
  { value: 'of' as const, label: 'Persentase dari nilai', question: 'Berapa hasil X% dari Y?' },
  { value: 'ratio' as const, label: 'Nilai sebagai persentase', question: 'X adalah berapa persen dari Y?' },
  { value: 'change' as const, label: 'Perubahan persentase', question: 'Berapa perubahan dari Y ke X?' },
]
const result = computed(() => {
  try { return { value: calculatePercentage(mode.value, first.value, second.value), error: '' } }
  catch (error) { return { value: 0, error: error instanceof Error ? error.message : 'Perhitungan gagal.' } }
})
const resultSuffix = computed(() => mode.value === 'of' ? '' : '%')
const labels = computed(() => mode.value === 'change' ? ['Nilai baru (X)', 'Nilai awal (Y)'] : mode.value === 'ratio' ? ['Bagian (X)', 'Total (Y)'] : ['Persentase (X)', 'Nilai (Y)'])
</script>

<template>
  <ToolPageShell title="Percentage Calculator" description="Hitung persentase suatu nilai, rasio dalam persen, atau kenaikan dan penurunan persentase." icon="mdi:percent-outline" category="Calculator">
    <div class="grid gap-2 sm:grid-cols-3"><button v-for="item in modes" :key="item.value" type="button" class="rounded-2xl border p-4 text-left transition" :class="mode === item.value ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/10' : 'border-slate-200 hover:border-indigo-300 dark:border-slate-700'" @click="mode = item.value"><strong class="block text-sm">{{ item.label }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{{ item.question }}</span></button></div>
    <div class="mt-7 grid gap-4 sm:grid-cols-2"><label v-for="(label, index) in labels" :key="label" class="text-sm font-bold">{{ label }}<input v-if="index === 0" v-model.number="first" type="number" step="any" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /><input v-else v-model.number="second" type="number" step="any" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label></div>
    <article class="mt-6 rounded-2xl bg-indigo-600 p-6 text-white"><p class="text-sm font-bold text-indigo-200">Hasil</p><p class="mt-2 break-all text-4xl font-black">{{ roundNumber(result.value, 6) }}{{ resultSuffix }}</p><p v-if="mode === 'change' && !result.error" class="mt-2 text-sm text-indigo-100">{{ result.value > 0 ? 'Kenaikan' : result.value < 0 ? 'Penurunan' : 'Tidak berubah' }}</p></article>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ result.error }}</p>
  </ToolPageShell>
</template>
