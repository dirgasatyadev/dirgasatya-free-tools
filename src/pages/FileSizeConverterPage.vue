<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { convertFileSize, roundNumber, type FileSizeUnit } from '@/composables/useCalculatorTools'

const value = ref(1)
const sourceUnit = ref<FileSizeUnit>('GB')
const system = ref<'binary' | 'decimal'>('binary')
const units: FileSizeUnit[] = ['bit', 'B', 'KB', 'MB', 'GB', 'TB']
const results = computed(() => {
  try { return { values: units.map((unit) => ({ unit, value: convertFileSize(value.value, sourceUnit.value, unit, system.value) })), error: '' } }
  catch (error) { return { values: [], error: error instanceof Error ? error.message : 'Konversi gagal.' } }
})
</script>

<template>
  <ToolPageShell title="File Size Converter" description="Konversikan bit, byte, KB, MB, GB, dan TB menggunakan sistem binary atau decimal." icon="mdi:file-swap-outline" category="File">
    <div class="grid gap-4 sm:grid-cols-[1fr_10rem]"><label class="text-sm font-bold">Ukuran<input v-model.number="value" type="number" min="0" step="any" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Satuan<select v-model="sourceUnit" class="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"><option v-for="unit in units" :key="unit" :value="unit">{{ unit }}</option></select></label></div>
    <fieldset class="mt-5"><legend class="text-sm font-bold">Standar konversi</legend><div class="mt-2 grid max-w-xl grid-cols-2 gap-2"><label class="cursor-pointer rounded-xl border p-3 text-sm" :class="system === 'binary' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'"><input v-model="system" type="radio" value="binary" class="mr-2 accent-indigo-600" /><strong>Binary (1024)</strong><span class="mt-1 block text-xs text-slate-400">Umum pada sistem operasi.</span></label><label class="cursor-pointer rounded-xl border p-3 text-sm" :class="system === 'decimal' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'"><input v-model="system" type="radio" value="decimal" class="mr-2 accent-indigo-600" /><strong>Decimal (1000)</strong><span class="mt-1 block text-xs text-slate-400">Umum pada media penyimpanan.</span></label></div></fieldset>
    <div class="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><article v-for="item in results.values" :key="item.unit" class="rounded-2xl border p-4" :class="item.unit === sourceUnit ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'"><p class="text-xs font-black uppercase tracking-wider text-slate-400">{{ item.unit }}</p><p class="mt-2 break-all font-mono text-lg font-black text-slate-950 dark:text-white">{{ roundNumber(item.value, item.value < 1 ? 10 : 4).toLocaleString('id-ID', { maximumFractionDigits: 10 }) }}</p></article></div>
    <p v-if="results.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{{ results.error }}</p>
  </ToolPageShell>
</template>
