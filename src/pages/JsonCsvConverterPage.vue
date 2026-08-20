<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { csvToJson, jsonToCsv } from '@/composables/useUtilityTools'

const mode = ref<'json-to-csv' | 'csv-to-json'>('json-to-csv')
const input = ref('[\n  {"name":"Dearga","category":"Tools"},\n  {"name":"Favicon Generator","category":"Design"}\n]')
const output = ref('')
const errorMessage = ref('')
const copied = ref(false)

function convert() {
  try {
    output.value = mode.value === 'json-to-csv' ? jsonToCsv(input.value) : csvToJson(input.value)
    errorMessage.value = ''
  } catch (error) {
    output.value = ''
    errorMessage.value = error instanceof Error ? error.message : 'Data tidak dapat dikonversi.'
  }
}

function switchMode() {
  mode.value = mode.value === 'json-to-csv' ? 'csv-to-json' : 'json-to-csv'
  if (output.value) {
    input.value = output.value
    output.value = ''
  }
  errorMessage.value = ''
}

async function copyOutput() {
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1_500)
}

function downloadOutput() {
  if (!output.value) return
  const extension = mode.value === 'json-to-csv' ? 'csv' : 'json'
  const blob = new Blob([output.value], { type: extension === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `converted.${extension}`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
</script>

<template>
  <ToolPageShell title="JSON ↔ CSV Converter" description="Konversikan object atau array JSON menjadi CSV dan CSV kembali menjadi JSON tanpa upload." icon="mdi:file-swap-outline" category="Data">
    <div class="flex flex-wrap items-center gap-2"><button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white hover:bg-indigo-700" @click="switchMode"><Icon icon="mdi:swap-horizontal" class="size-5" /> {{ mode === 'json-to-csv' ? 'JSON → CSV' : 'CSV → JSON' }}</button><span class="text-sm font-semibold text-slate-500">Klik untuk menukar arah konversi.</span></div>
    <div class="mt-5 grid gap-5 lg:grid-cols-2"><label class="text-sm font-bold">{{ mode === 'json-to-csv' ? 'JSON input' : 'CSV input' }}<textarea v-model="input" rows="17" spellcheck="false" class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label><div><div class="mb-2 flex items-center justify-between"><span class="text-sm font-bold">{{ mode === 'json-to-csv' ? 'CSV output' : 'JSON output' }}</span><div class="flex gap-2"><button type="button" class="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300" :disabled="!output" aria-label="Salin output" @click="copyOutput"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-4" /></button><button type="button" class="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300" :disabled="!output" aria-label="Download output" @click="downloadOutput"><Icon icon="mdi:download" class="size-4" /></button></div></div><textarea :value="output" rows="17" readonly class="w-full resize-y rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 font-mono text-sm leading-6 outline-none dark:border-indigo-500/25 dark:bg-indigo-500/10"></textarea></div></div>
    <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p><button type="button" class="mt-4 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950" @click="convert">Konversikan</button>
  </ToolPageShell>
</template>
