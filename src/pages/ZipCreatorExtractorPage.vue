<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { formatFileSize } from '@/composables/usePngToAvif'
import { createZipArchive, extractZipFiles, listZipEntries, type ExtractedZipFile, type ZipEntryInfo } from '@/composables/useZipTools'

const mode = ref<'create' | 'extract'>('create')
const files = ref<File[]>([])
const zipFile = ref<File | null>(null)
const zipEntries = ref<ZipEntryInfo[]>([])
const extracted = ref<(ExtractedZipFile & { url: string })[]>([])
const archiveName = ref('archive')
const compressionLevel = ref(6)
const isDragging = ref(false)
const isProcessing = ref(false)
const progress = ref(0)
const errorMessage = ref('')
const zipResultUrl = ref('')
const zipResultSize = ref(0)
const inputSize = computed(() => files.value.reduce((total, file) => total + file.size, 0))
const fileEntryCount = computed(() => zipEntries.value.filter((entry) => !entry.directory).length)

function revokeResults() {
  if (zipResultUrl.value) URL.revokeObjectURL(zipResultUrl.value)
  zipResultUrl.value = ''
  for (const item of extracted.value) URL.revokeObjectURL(item.url)
  extracted.value = []
}
function addFiles(incoming: File[]) {
  files.value.push(...incoming)
  zipResultUrl.value = ''
  errorMessage.value = ''
}
async function selectZip(file?: File) {
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.zip')) { errorMessage.value = 'Pilih file dengan ekstensi .zip.'; return }
  revokeResults()
  zipFile.value = file
  zipEntries.value = []
  isProcessing.value = true
  errorMessage.value = ''
  try { zipEntries.value = await listZipEntries(file) }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : 'ZIP tidak dapat dibaca.' }
  finally { isProcessing.value = false }
}
function handleInput(event: Event) {
  const input = event.target as HTMLInputElement
  if (mode.value === 'create') addFiles(Array.from(input.files ?? []))
  else void selectZip(input.files?.[0])
  input.value = ''
}
function handleDrop(event: DragEvent) {
  isDragging.value = false
  const incoming = Array.from(event.dataTransfer?.files ?? [])
  if (mode.value === 'create') addFiles(incoming)
  else void selectZip(incoming[0])
}
async function createArchive() {
  isProcessing.value = true
  progress.value = 0
  errorMessage.value = ''
  if (zipResultUrl.value) URL.revokeObjectURL(zipResultUrl.value)
  try {
    const blob = await createZipArchive(files.value, compressionLevel.value, (done, total) => (progress.value = done / total))
    zipResultSize.value = blob.size
    zipResultUrl.value = URL.createObjectURL(blob)
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'ZIP tidak dapat dibuat.' }
  finally { isProcessing.value = false }
}
async function extractArchive() {
  if (!zipFile.value) return
  isProcessing.value = true
  progress.value = 0
  errorMessage.value = ''
  revokeResults()
  try {
    const results = await extractZipFiles(zipFile.value, (done, total) => (progress.value = done / total))
    extracted.value = results.map((item) => ({ ...item, url: URL.createObjectURL(item.blob) }))
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'ZIP tidak dapat diekstrak.' }
  finally { isProcessing.value = false }
}
function extractedUrl(index: number) { return extracted.value.find((item) => item.index === index)?.url ?? '' }
function safeDownloadName(name: string) { return name.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'file' }
function downloadAll() {
  for (const item of extracted.value) {
    const link = document.createElement('a'); link.href = item.url; link.download = safeDownloadName(item.name); link.click()
  }
}
onUnmounted(revokeResults)
</script>

<template>
  <ToolPageShell title="ZIP Creator & Extractor" description="Buat arsip ZIP dari beberapa file atau ekstrak isi ZIP langsung di browser tanpa upload." icon="mdi:folder-zip-outline" category="File">
    <div class="inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button type="button" class="min-h-10 rounded-lg px-4 text-sm font-bold" :class="mode === 'create' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'" @click="mode = 'create'; errorMessage = ''"><Icon icon="mdi:archive-plus-outline" class="mr-2 inline size-5" />Buat ZIP</button><button type="button" class="min-h-10 rounded-lg px-4 text-sm font-bold" :class="mode === 'extract' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'" @click="mode = 'extract'; errorMessage = ''"><Icon icon="mdi:archive-arrow-down-outline" class="mr-2 inline size-5" />Ekstrak ZIP</button></div>
    <label class="mt-6 grid min-h-48 cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition" :class="isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950'" @dragenter.prevent="isDragging = true" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop"><input type="file" class="sr-only" :accept="mode === 'extract' ? '.zip,application/zip' : undefined" :multiple="mode === 'create'" @change="handleInput" /><span><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-600 text-white"><Icon :icon="mode === 'create' ? 'mdi:cloud-upload-multiple-outline' : 'mdi:folder-zip-outline'" class="size-7" /></span><strong class="mt-4 block text-lg">{{ mode === 'create' ? 'Pilih atau drop beberapa file' : 'Pilih atau drop satu file ZIP' }}</strong><span class="mt-1 block text-sm text-slate-400">Seluruh proses berjalan lokal di browser</span></span></label>

    <template v-if="mode === 'create' && files.length">
      <div class="mt-6 grid gap-4 sm:grid-cols-[1fr_12rem]"><label class="text-sm font-bold">Nama arsip<input v-model="archiveName" maxlength="120" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Level kompresi<select v-model.number="compressionLevel" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950"><option :value="0">0 — tanpa kompresi</option><option :value="3">3 — cepat</option><option :value="6">6 — seimbang</option><option :value="9">9 — maksimum</option></select></label></div>
      <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><div class="flex items-center justify-between bg-slate-50 px-4 py-3 text-sm font-bold dark:bg-slate-800"><span>{{ files.length }} file · {{ formatFileSize(inputSize) }}</span><button type="button" class="text-rose-600 dark:text-rose-300" @click="files = []; revokeResults()">Hapus semua</button></div><ul class="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800"><li v-for="(file, index) in files" :key="`${file.name}-${index}`" class="flex items-center gap-3 px-4 py-3 text-sm"><Icon icon="mdi:file-outline" class="size-5 shrink-0 text-indigo-500" /><span class="min-w-0 flex-1 truncate">{{ file.name }}</span><span class="text-xs text-slate-400">{{ formatFileSize(file.size) }}</span><button type="button" class="text-slate-400 hover:text-rose-600" aria-label="Hapus file" @click="files.splice(index, 1)"><Icon icon="mdi:close" class="size-5" /></button></li></ul></div>
      <button type="button" class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50" :disabled="isProcessing" @click="createArchive"><Icon :icon="isProcessing ? 'mdi:loading' : 'mdi:folder-zip-outline'" class="size-5" :class="{ 'animate-spin': isProcessing }" />{{ isProcessing ? `Membuat ZIP ${Math.round(progress * 100)}%` : 'Buat ZIP' }}</button>
      <a v-if="zipResultUrl" :href="zipResultUrl" :download="`${archiveName.trim() || 'archive'}.zip`" class="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700"><Icon icon="mdi:download" class="size-5" />Download {{ archiveName.trim() || 'archive' }}.zip · {{ formatFileSize(zipResultSize) }}</a>
    </template>

    <template v-if="mode === 'extract' && zipFile">
      <div class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><span><strong class="block">{{ zipFile.name }}</strong><span class="text-xs text-slate-400">{{ formatFileSize(zipFile.size) }} · {{ fileEntryCount }} file</span></span><button type="button" class="text-sm font-bold text-rose-600" @click="zipFile = null; zipEntries = []; revokeResults()">Hapus</button></div>
      <div v-if="zipEntries.length" class="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><ul class="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800"><li v-for="entry in zipEntries" :key="`${entry.index}-${entry.name}`" class="flex items-center gap-3 px-4 py-3 text-sm"><Icon :icon="entry.directory ? 'mdi:folder-outline' : 'mdi:file-outline'" class="size-5 shrink-0 text-indigo-500" /><span class="min-w-0 flex-1 truncate" :title="entry.name">{{ entry.name }}</span><span v-if="!entry.directory" class="text-xs text-slate-400">{{ formatFileSize(entry.uncompressedSize) }}</span><a v-if="extractedUrl(entry.index)" :href="extractedUrl(entry.index)" :download="safeDownloadName(entry.name)" class="text-indigo-600" aria-label="Download file"><Icon icon="mdi:download" class="size-5" /></a></li></ul></div>
      <button v-if="!extracted.length" type="button" class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50" :disabled="isProcessing || !fileEntryCount" @click="extractArchive"><Icon :icon="isProcessing ? 'mdi:loading' : 'mdi:archive-arrow-down-outline'" class="size-5" :class="{ 'animate-spin': isProcessing }" />{{ isProcessing ? `Mengekstrak ${Math.round(progress * 100)}%` : 'Ekstrak semua file' }}</button><button v-else type="button" class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700" @click="downloadAll"><Icon icon="mdi:download-multiple" class="size-5" />Download semua hasil</button>
    </template>
    <p v-if="errorMessage" role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
  </ToolPageShell>
</template>
