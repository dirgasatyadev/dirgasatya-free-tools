<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { csvBlobToJson, csvToJson, csvToJsonLines, csvToObjects, detectCsvDelimiter, jsonLinesToCsv, jsonToCsv, streamCsvBlobToJson, type CsvDelimiter } from '@/composables/useUtilityTools'

const direction = ref<'to-csv' | 'from-csv'>('to-csv')
const jsonFormat = ref<'json' | 'jsonl'>('json')
const delimiterOption = ref<'auto' | CsvDelimiter>('auto')
const hasHeader = ref(true)
const includeHeader = ref(true)
const includeBom = ref(false)
const strict = ref(true)
const inferTypes = ref(true)
const input = ref('[\n  {"name":"Dearga","active":true,"score":10},\n  {"name":"Favicon Generator","active":false,"score":20}\n]')
const output = ref('')
const errorMessage = ref('')
const copied = ref(false)
const processingFile = ref(false)
const sourceFileName = ref('')
let streamController: AbortController | null = null
const directStreamSupported = computed(() => window.isSecureContext && typeof window.showSaveFilePicker === 'function')

const selectedDelimiter = computed<CsvDelimiter>(() => delimiterOption.value === 'auto' ? detectCsvDelimiter(input.value) : delimiterOption.value)
const preview = computed(() => {
  if (direction.value !== 'from-csv' || !input.value.trim()) return []
  try { return csvToObjects(input.value, { delimiter: selectedDelimiter.value, hasHeader: hasHeader.value, strict: strict.value, inferTypes: inferTypes.value }).slice(0, 5) }
  catch { return [] }
})
const previewColumns = computed(() => preview.value[0] ? Object.keys(preview.value[0]) : [])

function convert() {
  try {
    const csvOptions = { delimiter: selectedDelimiter.value, includeHeader: includeHeader.value, includeBom: includeBom.value, hasHeader: hasHeader.value, strict: strict.value, inferTypes: inferTypes.value }
    output.value = direction.value === 'to-csv'
      ? jsonFormat.value === 'jsonl' ? jsonLinesToCsv(input.value, csvOptions) : jsonToCsv(input.value, csvOptions)
      : jsonFormat.value === 'jsonl' ? csvToJsonLines(input.value, csvOptions) : csvToJson(input.value, csvOptions)
    errorMessage.value = ''
  } catch (error) { output.value = ''; errorMessage.value = error instanceof Error ? error.message : 'Data tidak dapat dikonversi.' }
}
function switchDirection() {
  direction.value = direction.value === 'to-csv' ? 'from-csv' : 'to-csv'
  if (output.value) { input.value = output.value; output.value = '' }
  errorMessage.value = ''
  sourceFileName.value = ''
}
async function handleCsvFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  processingFile.value = true
  sourceFileName.value = file.name
  errorMessage.value = ''
  try {
    output.value = await csvBlobToJson(file, {
      delimiter: delimiterOption.value === 'auto' ? undefined : delimiterOption.value,
      hasHeader: hasHeader.value,
      strict: strict.value,
      inferTypes: inferTypes.value,
    }, jsonFormat.value === 'jsonl')
  } catch (error) {
    output.value = ''
    errorMessage.value = error instanceof Error ? error.message : 'File CSV tidak dapat dikonversi.'
  } finally {
    processingFile.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}
async function handleLargeCsvFile(event: Event) {
  const inputElement = event.target as HTMLInputElement
  const file = inputElement.files?.[0]
  inputElement.value = ''
  if (!file || !window.showSaveFilePicker) return
  processingFile.value = true
  sourceFileName.value = file.name
  errorMessage.value = ''
  const controller = new AbortController()
  streamController = controller
  try {
    const extension = jsonFormat.value === 'jsonl' ? 'jsonl' : 'json'
    const handle = await window.showSaveFilePicker({
      suggestedName: `${file.name.replace(/\.(?:csv|tsv)$/i, '') || 'converted'}.${extension}`,
      types: [{ description: extension === 'jsonl' ? 'JSON Lines' : 'JSON', accept: { 'application/json': [`.${extension}`] } }],
    })
    const writable = await handle.createWritable()
    await streamCsvBlobToJson(file, writable, {
      delimiter: delimiterOption.value === 'auto' ? undefined : delimiterOption.value,
      hasHeader: hasHeader.value,
      strict: strict.value,
      inferTypes: inferTypes.value,
    }, jsonFormat.value === 'jsonl', controller.signal)
    sourceFileName.value = `${file.name} selesai disimpan tanpa buffer output.`
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) errorMessage.value = error instanceof Error ? error.message : 'File CSV tidak dapat dikonversi.'
  } finally {
    streamController = null
    processingFile.value = false
  }
}
function cancelFileConversion() { streamController?.abort() }
async function copyOutput() { await navigator.clipboard.writeText(output.value); copied.value = true; window.setTimeout(() => (copied.value = false), 1_500) }
function downloadOutput() {
  if (!output.value) return
  const extension = direction.value === 'to-csv' ? 'csv' : jsonFormat.value === 'jsonl' ? 'jsonl' : 'json'
  const blob = new Blob([output.value], { type: extension === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' })
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `converted.${extension}`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
</script>

<template>
  <ToolPageShell title="JSON ↔ CSV Converter" description="Konversi JSON, JSON Lines, dan CSV dengan delimiter, header, validasi, preview, serta type inference." icon="mdi:file-swap-outline" category="Data">
    <div class="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2 lg:grid-cols-4">
      <label class="text-xs font-bold text-slate-500">Arah<button type="button" class="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white hover:bg-indigo-700" @click="switchDirection"><Icon icon="mdi:swap-horizontal" class="size-5" />{{ direction === 'to-csv' ? `${jsonFormat.toUpperCase()} → CSV` : `CSV → ${jsonFormat.toUpperCase()}` }}</button></label>
      <label class="text-xs font-bold text-slate-500">Format JSON<select v-model="jsonFormat" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"><option value="json">JSON array</option><option value="jsonl">JSON Lines</option></select></label>
      <label class="text-xs font-bold text-slate-500">Delimiter<select v-model="delimiterOption" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"><option value="auto">Auto detect</option><option value=",">Comma (,)</option><option value=";">Semicolon (;)</option><option :value="'\t'">Tab</option><option value="|">Pipe (|)</option></select></label>
      <div class="grid grid-cols-2 gap-2 text-xs font-bold"><label v-if="direction === 'from-csv'" class="flex items-center gap-2"><input v-model="hasHeader" type="checkbox" class="size-4 accent-indigo-600" /> Ada header</label><label v-else class="flex items-center gap-2"><input v-model="includeHeader" type="checkbox" class="size-4 accent-indigo-600" /> Tulis header</label><label class="flex items-center gap-2"><input v-model="strict" type="checkbox" class="size-4 accent-indigo-600" /> Strict</label><label v-if="direction === 'from-csv'" class="flex items-center gap-2"><input v-model="inferTypes" type="checkbox" class="size-4 accent-indigo-600" /> Infer type</label><label v-else class="flex items-center gap-2"><input v-model="includeBom" type="checkbox" class="size-4 accent-indigo-600" /> UTF-8 BOM</label></div>
    </div>

    <div v-if="direction === 'from-csv'" class="mt-4 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 dark:border-indigo-500/40 dark:bg-indigo-500/10">
      <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700">
        <Icon icon="mdi:file-upload-outline" class="size-5" />{{ processingFile ? 'Memproses…' : 'Pilih file CSV' }}
        <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" class="sr-only" :disabled="processingFile" @change="handleCsvFile" />
      </label>
      <label v-if="directStreamSupported" class="ml-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-indigo-300 px-4 text-sm font-bold text-indigo-700 dark:border-indigo-500/40 dark:text-indigo-300"><Icon icon="mdi:database-export-outline" class="size-5" />Stream langsung ke file<input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" class="sr-only" :disabled="processingFile" @change="handleLargeCsvFile" /></label>
      <button v-if="processingFile && streamController" type="button" class="ml-2 min-h-11 rounded-xl bg-rose-50 px-4 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" @click="cancelFileConversion">Batalkan</button>
      <span class="mt-2 block text-xs text-slate-500">{{ sourceFileName || (directStreamSupported ? 'Gunakan stream langsung untuk file besar agar output tidak ditampung di textarea/RAM.' : 'File input dibaca bertahap; output tetap ditampilkan di textarea.') }}</span>
    </div>

    <div class="mt-5 grid gap-5 lg:grid-cols-2"><label class="text-sm font-bold">{{ direction === 'to-csv' ? `${jsonFormat.toUpperCase()} input` : 'CSV input' }}<textarea v-model="input" rows="17" spellcheck="false" class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label><div><div class="mb-2 flex items-center justify-between"><span class="text-sm font-bold">{{ direction === 'to-csv' ? 'CSV output' : `${jsonFormat.toUpperCase()} output` }}</span><div class="flex gap-2"><button type="button" class="grid size-9 place-items-center rounded-lg bg-slate-100 disabled:opacity-40 dark:bg-slate-800" :disabled="!output" aria-label="Salin output" @click="copyOutput"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-4" /></button><button type="button" class="grid size-9 place-items-center rounded-lg bg-slate-100 disabled:opacity-40 dark:bg-slate-800" :disabled="!output" aria-label="Download output" @click="downloadOutput"><Icon icon="mdi:download" class="size-4" /></button></div></div><textarea :value="output" rows="17" readonly class="w-full resize-y rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 font-mono text-sm leading-6 dark:border-indigo-500/25 dark:bg-indigo-500/10"></textarea></div></div>
    <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p><button type="button" class="mt-4 min-h-12 w-full rounded-xl bg-slate-900 px-5 font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950" @click="convert">Konversikan</button>

    <section v-if="preview.length" class="mt-7 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><div class="bg-slate-50 px-4 py-3 text-sm font-black dark:bg-slate-800">Preview 5 baris · delimiter <code>{{ selectedDelimiter === '\t' ? 'TAB' : selectedDelimiter }}</code></div><div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead><tr><th v-for="column in previewColumns" :key="column" class="border-b border-slate-200 px-4 py-2 dark:border-slate-700">{{ column }}</th></tr></thead><tbody><tr v-for="(row, index) in preview" :key="index"><td v-for="column in previewColumns" :key="column" class="border-b border-slate-100 px-4 py-2 font-mono text-xs dark:border-slate-800">{{ row[column] }}</td></tr></tbody></table></div></section>
  </ToolPageShell>
</template>
