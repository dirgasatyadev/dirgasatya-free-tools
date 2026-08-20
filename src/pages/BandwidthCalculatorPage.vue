<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { calculateDownloadSeconds, formatDuration, roundNumber, type BandwidthUnit, type FileSizeUnit } from '@/composables/useCalculatorTools'

const fileValue = ref(1)
const fileUnit = ref<Exclude<FileSizeUnit, 'bit'>>('GB')
const speedValue = ref(100)
const speedUnit = ref<BandwidthUnit>('Mbps')
const overhead = ref(5)
const result = computed(() => {
  try { const seconds = calculateDownloadSeconds(fileValue.value, fileUnit.value, speedValue.value, speedUnit.value, overhead.value); return { seconds, duration: formatDuration(seconds), error: '' } }
  catch (error) { return { seconds: 0, duration: '—', error: error instanceof Error ? error.message : 'Perhitungan gagal.' } }
})
</script>

<template>
  <ToolPageShell title="Bandwidth / Download Time Calculator" description="Perkirakan waktu download berdasarkan ukuran file, kecepatan koneksi, dan overhead jaringan." icon="mdi:download-network-outline" category="Calculator">
    <div class="grid gap-6 lg:grid-cols-2"><section><h2 class="font-black">Ukuran file</h2><div class="mt-3 grid grid-cols-[1fr_8rem] gap-2"><input v-model.number="fileValue" type="number" min="0.000001" step="any" aria-label="Ukuran file" class="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /><select v-model="fileUnit" aria-label="Satuan ukuran file" class="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-black dark:border-slate-700 dark:bg-slate-950"><option v-for="unit in ['B', 'KB', 'MB', 'GB', 'TB']" :key="unit" :value="unit">{{ unit }}</option></select></div></section><section><h2 class="font-black">Kecepatan koneksi</h2><div class="mt-3 grid grid-cols-[1fr_8rem] gap-2"><input v-model.number="speedValue" type="number" min="0.000001" step="any" aria-label="Kecepatan koneksi" class="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /><select v-model="speedUnit" aria-label="Satuan bandwidth" class="min-h-14 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-black dark:border-slate-700 dark:bg-slate-950"><option v-for="unit in ['Kbps', 'Mbps', 'Gbps']" :key="unit" :value="unit">{{ unit }}</option></select></div></section></div>
    <label class="mt-6 block max-w-md text-sm font-bold">Overhead jaringan: {{ overhead }}%<input v-model.number="overhead" type="range" min="0" max="30" step="1" class="mt-2 w-full accent-indigo-600" /><span class="flex justify-between text-xs font-normal text-slate-400"><span>0%</span><span>30%</span></span></label>
    <article class="mt-7 rounded-3xl bg-indigo-600 p-6 text-white sm:p-8"><p class="text-sm font-bold text-indigo-200">Estimasi waktu download</p><p class="mt-2 text-3xl font-black sm:text-4xl">{{ result.duration }}</p><p class="mt-3 text-sm text-indigo-100">{{ roundNumber(result.seconds, 3).toLocaleString('id-ID') }} detik · termasuk {{ overhead }}% overhead</p></article>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ result.error }}</p>
    <p class="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">Perkiraan menggunakan ukuran file binary (1 MB = 1.048.576 byte) dan bandwidth jaringan decimal (1 Mbps = 1.000.000 bit/detik). Kecepatan nyata dapat berbeda karena server, Wi-Fi, dan kondisi jaringan.</p>
  </ToolPageShell>
</template>
