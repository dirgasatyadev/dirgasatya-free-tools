<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { dateToUnix, parseUnixTimestamp } from '@/composables/useUtilityTools'

const timestamp = ref(String(Math.floor(Date.now() / 1000)))
const unit = ref<'auto' | 'seconds' | 'milliseconds'>('auto')
const dateInput = ref(new Date().toISOString().slice(0, 16))
const parsedTimestamp = computed(() => {
  try {
    return { date: parseUnixTimestamp(timestamp.value, unit.value), errorMessage: '' }
  } catch (error) {
    return {
      date: null,
      errorMessage: error instanceof Error ? error.message : 'Timestamp tidak valid.',
    }
  }
})
const parsedDate = computed(() => parsedTimestamp.value.date)
const errorMessage = computed(() => parsedTimestamp.value.errorMessage)
const unixFromDate = computed(() => {
  try { return dateToUnix(dateInput.value) } catch { return null }
})

function useNow() {
  timestamp.value = String(Math.floor(Date.now() / 1000))
  unit.value = 'seconds'
  dateInput.value = new Date().toISOString().slice(0, 16)
}
</script>

<template>
  <ToolPageShell title="Unix Timestamp Converter" description="Konversikan Unix timestamp detik atau milidetik ke tanggal, dan tanggal lokal kembali ke timestamp." icon="mdi:clock-arrow" category="Developer">
    <div class="grid gap-5 lg:grid-cols-2"><section class="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><h2 class="font-black">Timestamp → tanggal</h2><input v-model="timestamp" inputmode="numeric" class="mt-4 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /><div class="mt-3 grid grid-cols-3 gap-2"><button v-for="option in (['auto', 'seconds', 'milliseconds'] as const)" :key="option" type="button" class="min-h-10 rounded-lg text-xs font-bold" :class="unit === option ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'" @click="unit = option">{{ option === 'auto' ? 'Auto' : option === 'seconds' ? 'Detik' : 'Milidetik' }}</button></div><div v-if="parsedDate" class="mt-4 space-y-2 rounded-xl bg-indigo-50 p-4 text-sm dark:bg-indigo-500/10"><p><strong>UTC:</strong> {{ parsedDate.toUTCString() }}</p><p><strong>ISO:</strong> {{ parsedDate.toISOString() }}</p><p><strong>Lokal:</strong> {{ parsedDate.toLocaleString() }}</p></div><p v-if="errorMessage" class="mt-3 text-sm font-semibold text-rose-600">{{ errorMessage }}</p></section><section class="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><h2 class="font-black">Tanggal → timestamp</h2><input v-model="dateInput" type="datetime-local" class="mt-4 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /><div v-if="unixFromDate" class="mt-4 space-y-3"><div class="rounded-xl bg-slate-100 p-4 dark:bg-slate-800"><span class="text-xs font-bold text-slate-500">Detik</span><code class="mt-1 block break-all text-lg font-black">{{ unixFromDate.seconds }}</code></div><div class="rounded-xl bg-slate-100 p-4 dark:bg-slate-800"><span class="text-xs font-bold text-slate-500">Milidetik</span><code class="mt-1 block break-all text-lg font-black">{{ unixFromDate.milliseconds }}</code></div></div><button type="button" class="mt-4 min-h-11 w-full rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700" @click="useNow">Gunakan waktu sekarang</button></section></div>
  </ToolPageShell>
</template>
