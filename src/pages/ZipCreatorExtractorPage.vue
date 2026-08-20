<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { formatFileSize } from '@/composables/usePngToAvif'
import { createZipArchive, extractZipFiles, getAdaptiveZipCreateLimit, getAdaptiveZipExtractionLimit, listZipEntries, maxZipCreateFiles, validateZipCreation, zipCreateWarningSize, type ExtractedZipFile, type ZipEntryInfo } from '@/composables/useZipTools'

const mode = ref<'create' | 'extract'>('create')
const files = ref<File[]>([])
const zipFile = ref<File | null>(null)
const zipEntries = ref<ZipEntryInfo[]>([])
const selectedEntryIndices = ref<number[]>([])
const extracted = ref<(ExtractedZipFile & { url: string })[]>([])
const archiveName = ref('archive')
const compressionLevel = ref(6)
const isDragging = ref(false)
const isProcessing = ref(false)
const progress = ref(0)
const errorMessage = ref('')
const zipResultUrl = ref('')
const zipResultSize = ref(0)
const adaptiveCreateLimit = getAdaptiveZipCreateLimit()
const adaptiveExtractionLimit = getAdaptiveZipExtractionLimit()
let createController: AbortController | null = null
const extractController = ref<AbortController | null>(null)
const inputSize = computed(() => files.value.reduce((total, file) => total + file.size, 0))
const hasLargeCreateWarning = computed(() => inputSize.value > zipCreateWarningSize)
const fileEntryCount = computed(() => zipEntries.value.filter((entry) => !entry.directory).length)
const safeEntries = computed(() => zipEntries.value.filter((entry) => !entry.directory && !entry.safetyIssue))
const selectedSize = computed(() => zipEntries.value.filter((entry) => selectedEntryIndices.value.includes(entry.index)).reduce((total, entry) => total + entry.uncompressedSize, 0))

function revokeResults() {
  if (zipResultUrl.value) URL.revokeObjectURL(zipResultUrl.value)
  zipResultUrl.value = ''
  for (const item of extracted.value) URL.revokeObjectURL(item.url)
  extracted.value = []
}
function addFiles(incoming: File[]) {
  if (!incoming.length) return
  const combined = [...files.value, ...incoming]
  try { validateZipCreation(combined, adaptiveCreateLimit) }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : 'File tidak dapat ditambahkan.'; return }
  files.value = combined
  zipResultUrl.value = ''
  errorMessage.value = ''
}
async function selectZip(file?: File) {
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.zip')) { errorMessage.value = 'Pilih file dengan ekstensi .zip.'; return }
  revokeResults()
  zipFile.value = file
  zipEntries.value = []
  selectedEntryIndices.value = []
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
    const controller = new AbortController()
    createController = controller
    const blob = await createZipArchive(files.value, compressionLevel.value, (done, total) => (progress.value = done / total), controller.signal)
    zipResultSize.value = blob.size
    zipResultUrl.value = URL.createObjectURL(blob)
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'ZIP tidak dapat dibuat.' }
  finally { createController = null; isProcessing.value = false }
}
function cancelCreate() { createController?.abort() }
async function extractArchive() {
  if (!zipFile.value) return
  isProcessing.value = true
  progress.value = 0
  errorMessage.value = ''
  revokeResults()
  try {
    const controller = new AbortController()
    extractController.value = controller
    const results = await extractZipFiles(zipFile.value, selectedEntryIndices.value, (done, total) => (progress.value = done / total), controller.signal)
    extracted.value = results.map((item) => ({ ...item, url: URL.createObjectURL(item.blob) }))
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'ZIP tidak dapat diekstrak.' }
  finally { extractController.value = null; isProcessing.value = false }
}
function cancelExtract() { extractController.value?.abort() }
function extractedUrl(index: number) { return extracted.value.find((item) => item.index === index)?.url ?? '' }
function selectSafeEntries() {
  let total = 0
  selectedEntryIndices.value = safeEntries.value.slice(0, 250).filter((entry) => {
    if (total + entry.uncompressedSize > adaptiveExtractionLimit) return false
    total += entry.uncompressedSize
    return true
  }).map((entry) => entry.index)
}
function safeDownloadName(name: string) { return name.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'file' }
function downloadAll() {
  for (const item of extracted.value) {
    const link = document.createElement('a'); link.href = item.url; link.download = safeDownloadName(item.name); link.click()
  }
}
onUnmounted(() => { createController?.abort(); extractController.value?.abort(); revokeResults() })
</script>

<template>
  <ToolPageShell title="ZIP Creator & Extractor" description="Buat arsip ZIP dari beberapa file atau ekstrak isi ZIP langsung di browser tanpa upload." icon="mdi:folder-zip-outline" category="File">
    <div class="inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button type="button" class="min-h-10 rounded-lg px-4 text-sm font-bold" :class="mode === 'create' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'" @click="mode = 'create'; errorMessage = ''"><Icon icon="mdi:archive-plus-outline" class="mr-2 inline size-5" />Buat ZIP</button><button type="button" class="min-h-10 rounded-lg px-4 text-sm font-bold" :class="mode === 'extract' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'" @click="mode = 'extract'; errorMessage = ''"><Icon icon="mdi:archive-arrow-down-outline" class="mr-2 inline size-5" />Ekstrak ZIP</button></div>
    <label class="mt-6 grid min-h-48 cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition" :class="isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950'" @dragenter.prevent="isDragging = true" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop"><input type="file" class="sr-only" :accept="mode === 'extract' ? '.zip,application/zip' : undefined" :multiple="mode === 'create'" @change="handleInput" /><span><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-600 text-white"><Icon :icon="mode === 'create' ? 'mdi:cloud-upload-outline' : 'mdi:folder-zip-outline'" class="size-7" /></span><strong class="mt-4 block text-lg">{{ mode === 'create' ? 'Pilih atau drop beberapa file' : 'Pilih atau drop satu file ZIP' }}</strong><span class="mt-1 block text-sm text-slate-400">Seluruh proses berjalan lokal di browser</span></span></label>

    <template v-if="mode === 'create' && files.length">
      <div class="mt-6 grid gap-4 sm:grid-cols-[1fr_12rem]"><label class="text-sm font-bold">Nama arsip<input v-model="archiveName" maxlength="120" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Level kompresi<select v-model.number="compressionLevel" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950"><option :value="0">0 — tanpa kompresi</option><option :value="3">3 — cepat</option><option :value="6">6 — seimbang</option><option :value="9">9 — maksimum</option></select></label></div>
      <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><div class="flex items-center justify-between bg-slate-50 px-4 py-3 text-sm font-bold dark:bg-slate-800"><span>{{ files.length }} file · {{ formatFileSize(inputSize) }}</span><button type="button" class="text-rose-600 dark:text-rose-300" @click="files = []; revokeResults()">Hapus semua</button></div><ul class="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800"><li v-for="(file, index) in files" :key="`${file.name}-${index}`" class="flex items-center gap-3 px-4 py-3 text-sm"><Icon icon="mdi:file-outline" class="size-5 shrink-0 text-indigo-500" /><span class="min-w-0 flex-1 truncate">{{ file.name }}</span><span class="text-xs text-slate-400">{{ formatFileSize(file.size) }}</span><button type="button" class="text-slate-400 hover:text-rose-600" aria-label="Hapus file" @click="files.splice(index, 1)"><Icon icon="mdi:close" class="size-5" /></button></li></ul></div>
      <p v-if="hasLargeCreateWarning" class="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Sumber melebihi 500 MB. Hasil ZIP dibuat sebagai Blob di memory; tutup tab lain dan pastikan memory perangkat mencukupi.</p>
      <p class="mt-3 text-xs text-slate-500">Proteksi create: maksimal {{ maxZipCreateFiles.toLocaleString('id-ID') }} file dan {{ formatFileSize(adaptiveCreateLimit) }} total sumber pada perangkat ini.</p>
      <button type="button" class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50" :disabled="isProcessing" @click="createArchive"><Icon :icon="isProcessing ? 'mdi:loading' : 'mdi:folder-zip-outline'" class="size-5" :class="{ 'animate-spin': isProcessing }" />{{ isProcessing ? `Membuat ZIP ${Math.round(progress * 100)}%` : 'Buat ZIP' }}</button>
      <button v-if="isProcessing" type="button" class="mt-3 min-h-11 w-full rounded-xl bg-rose-50 px-4 font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" @click="cancelCreate">Batalkan kompresi</button>
      <a v-if="zipResultUrl" :href="zipResultUrl" :download="`${archiveName.trim() || 'archive'}.zip`" class="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700"><Icon icon="mdi:download" class="size-5" />Download {{ archiveName.trim() || 'archive' }}.zip · {{ formatFileSize(zipResultSize) }}</a>
    </template>

    <template v-if="mode === 'extract' && zipFile">
      <div class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><span><strong class="block">{{ zipFile.name }}</strong><span class="text-xs text-slate-400">{{ formatFileSize(zipFile.size) }} · {{ fileEntryCount }} file</span></span><button type="button" class="text-sm font-bold text-rose-600" @click="zipFile = null; zipEntries = []; selectedEntryIndices = []; revokeResults()">Hapus</button></div>
      <div v-if="zipEntries.length" class="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800"><span class="font-bold">{{ selectedEntryIndices.length }} dipilih · {{ formatFileSize(selectedSize) }}</span><span class="flex gap-3"><button type="button" class="font-bold text-indigo-600" @click="selectSafeEntries">Pilih aman</button><button type="button" class="font-bold text-slate-500" @click="selectedEntryIndices = []">Kosongkan</button></span></div><ul class="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800"><li v-for="entry in zipEntries" :key="`${entry.index}-${entry.name}`" class="flex items-center gap-3 px-4 py-3 text-sm" :class="entry.safetyIssue ? 'bg-rose-50 dark:bg-rose-500/10' : ''"><input v-if="!entry.directory" v-model="selectedEntryIndices" type="checkbox" :value="entry.index" :disabled="!!entry.safetyIssue || !!extracted.length" class="size-4 shrink-0 accent-indigo-600" :aria-label="`Pilih ${entry.name}`" /><span v-else class="size-4"></span><Icon :icon="entry.directory ? 'mdi:folder-outline' : entry.safetyIssue ? 'mdi:alert-outline' : 'mdi:file-outline'" class="size-5 shrink-0" :class="entry.safetyIssue ? 'text-rose-600' : 'text-indigo-500'" /><span class="min-w-0 flex-1"><span class="block truncate" :title="entry.name">{{ entry.name }}</span><span v-if="entry.safetyIssue" class="block text-xs font-semibold text-rose-600 dark:text-rose-300">{{ entry.safetyIssue }}</span></span><span v-if="!entry.directory" class="text-xs text-slate-400">{{ formatFileSize(entry.uncompressedSize) }}</span><a v-if="extractedUrl(entry.index)" :href="extractedUrl(entry.index)" :download="safeDownloadName(entry.name)" class="text-indigo-600" aria-label="Download file"><Icon icon="mdi:download" class="size-5" /></a></li></ul></div>
      <p v-if="zipEntries.length" class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Proteksi aktif: maksimal 2.000 entry per ZIP, 250 file dan {{ formatFileSize(adaptiveExtractionLimit) }} per ekstraksi pada perangkat ini, 256 MB per entry, serta rasio kompresi maksimal 200×.</p>
      <button v-if="!extracted.length" type="button" class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50" :disabled="isProcessing || !selectedEntryIndices.length" @click="extractArchive"><Icon :icon="isProcessing ? 'mdi:loading' : 'mdi:archive-arrow-down-outline'" class="size-5" :class="{ 'animate-spin': isProcessing }" />{{ isProcessing ? `Mengekstrak ${Math.round(progress * 100)}%` : `Ekstrak ${selectedEntryIndices.length} file terpilih` }}</button><button v-else type="button" class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700" @click="downloadAll"><Icon icon="mdi:download-multiple" class="size-5" />Download semua hasil</button>
      <button v-if="isProcessing && extractController" type="button" class="mt-3 min-h-11 w-full rounded-xl bg-rose-50 px-4 font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" @click="cancelExtract">Batalkan ekstraksi</button>
    </template>
    <p v-if="errorMessage" role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
  </ToolPageShell>
</template>
