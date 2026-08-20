<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SiteHeader from '@/components/SiteHeader.vue'
import ToolTransferActions from '@/components/ToolTransferActions.vue'
import {
  createFaviconBaseName,
  createFaviconFileName,
  createFaviconHtmlSnippet,
  createFaviconManifest,
  createMaskableIcon,
  createPngIco,
  createSvgFavicon,
  faviconSizes,
  normalizeFaviconWebsiteUrl,
  useFaviconGenerator,
  type FaviconResult,
} from '@/composables/useFaviconGenerator'
import { formatFileSize } from '@/composables/usePngToAvif'
import { useIncomingToolTransfer } from '@/composables/useToolTransfer'

const {
  sourceFile,
  sourcePreviewUrl,
  baseName,
  fitMode,
  transparentBackground,
  backgroundColor,
  results,
  isProcessing,
  isDragging,
  errorMessage,
  completedCount,
  progressPercentage,
  allCompleted,
  setSourceFile,
  generate,
  reset,
} = useFaviconGenerator()

useIncomingToolTransfer('favicon-generator', (files) => {
  const [file] = files
  if (file) return loadSourceFile(file)
})

const downloadMode = ref<'zip' | 'direct'>('zip')
const websiteUrl = ref('')
const assetPath = ref('/icons/')
const selectedSizes = ref<number[]>(faviconSizes.map((item) => item.size))
const isPreparingDownload = ref(false)
const showDeleteConfirmation = ref(false)
const previewResult = ref<FaviconResult | null>(null)
const directFolderDownloadSupported = computed(
  () => window.isSecureContext && typeof window.showDirectoryPicker === 'function',
)
const transferableResults = computed(() =>
  results.value.flatMap((result) =>
    result.blob && result.status === 'completed'
      ? [{ blob: result.blob, fileName: createFaviconFileName(baseName.value, result.size) }]
      : [],
  ),
)
const allSizesSelected = computed(() => selectedSizes.value.length === faviconSizes.length)
const selectedCompletedCount = computed(
  () => results.value.filter((result) => selectedSizes.value.includes(result.size)).length,
)
const htmlSnippet = computed(() => createFaviconHtmlSnippet(baseName.value, assetPath.value))

async function loadSourceFile(file: File) {
  selectedSizes.value = faviconSizes.map((item) => item.size)
  await setSourceFile(file)
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const [file] = Array.from(input.files ?? [])
  if (file) void loadSourceFile(file)
  input.value = ''
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const [file] = Array.from(event.dataTransfer?.files ?? [])
  if (file && !isProcessing.value) void loadSourceFile(file)
}

function normalizeBaseName() {
  baseName.value = createFaviconBaseName(baseName.value)
}

function normalizeWebsiteUrl() {
  if (!websiteUrl.value.trim()) return
  try {
    websiteUrl.value = normalizeFaviconWebsiteUrl(websiteUrl.value)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'URL website tidak valid.'
  }
}

function selectAllSizes() {
  selectedSizes.value = faviconSizes.map((item) => item.size)
}

function clearSizeSelection() {
  selectedSizes.value = []
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function downloadResult(result: FaviconResult) {
  if (result.blob) triggerDownload(result.blob, createFaviconFileName(baseName.value, result.size))
}

async function completedFiles(scope: 'all' | 'selected') {
  const selectedResults =
    scope === 'all'
      ? results.value
      : results.value.filter((result) => selectedSizes.value.includes(result.size))
  if (selectedResults.length === 0) throw new Error('Pilih minimal satu ukuran favicon.')
  const imageFiles = selectedResults.map((result) => {
    if (!result.blob) throw new Error('Ada ukuran favicon yang belum selesai.')
    return {
      blob: result.blob,
      fileName: createFaviconFileName(baseName.value, result.size),
    }
  })
  if (!sourceFile.value) throw new Error('Sumber favicon tidak tersedia.')
  const maskableResults = await Promise.all(selectedResults
    .filter((result) => result.size === 192 || result.size === 512)
    .map(async (result) => ({
      size: result.size,
      fileName: `${createFaviconBaseName(baseName.value)}-maskable-${result.size}x${result.size}.png`,
      blob: await createMaskableIcon(sourceFile.value!, result.size, transparentBackground.value ? '#ffffff' : backgroundColor.value),
    })))
  const manifest = createFaviconManifest(
    websiteUrl.value,
    baseName.value,
    transparentBackground.value ? '#ffffff' : backgroundColor.value,
    [
      ...selectedResults.filter((result) => result.size === 192 || result.size === 512).map((result) => ({
      size: result.size,
      fileName: createFaviconFileName(baseName.value, result.size),
        purpose: 'any' as const,
      })),
      ...maskableResults.map((result) => ({ size: result.size, fileName: result.fileName, purpose: 'maskable' as const })),
    ],
    assetPath.value,
  )
  const icoSources = selectedResults.filter((result) => [16, 32, 48].includes(result.size) && result.blob).map((result) => ({ size: result.size, blob: result.blob! }))
  const extras = [
    ...(icoSources.length ? [{ blob: await createPngIco(icoSources), fileName: 'favicon.ico' }] : []),
    { blob: await createSvgFavicon(sourceFile.value), fileName: 'favicon.svg' },
    ...maskableResults.map((result) => ({ blob: result.blob, fileName: result.fileName })),
    { blob: new Blob([htmlSnippet.value], { type: 'text/html;charset=utf-8' }), fileName: 'favicon-links.html' },
  ]
  return [
    ...imageFiles,
    ...extras,
    {
      blob: new Blob([manifest], { type: 'application/manifest+json' }),
      fileName: 'manifest.webmanifest',
    },
  ]
}

async function downloadPackage(scope: 'all' | 'selected') {
  if (!allCompleted.value || isPreparingDownload.value) return
  isPreparingDownload.value = true
  errorMessage.value = ''
  try {
    const files = await completedFiles(scope)
    if (downloadMode.value === 'zip') {
      const { BlobReader, BlobWriter, ZipWriter } = await import('@zip.js/zip.js')
      const writer = new ZipWriter(new BlobWriter('application/zip'))
      for (const file of files) await writer.add(file.fileName, new BlobReader(file.blob), { level: 0 })
      triggerDownload(
        await writer.close(),
        `${createFaviconBaseName(baseName.value)}-favicon-${scope === 'all' ? 'complete' : 'selected'}.zip`,
      )
    } else if (directFolderDownloadSupported.value && window.showDirectoryPicker) {
      const directory = await window.showDirectoryPicker({
        id: 'favicon-generator-downloads',
        mode: 'readwrite',
        startIn: 'downloads',
      })
      for (const file of files) {
        const handle = await directory.getFileHandle(file.fileName, { create: true })
        const writable = await handle.createWritable()
        await writable.write(file.blob)
        await writable.close()
      }
    } else {
      for (const file of files) {
        triggerDownload(file.blob, file.fileName)
        await new Promise<void>((resolve) => window.setTimeout(resolve, 150))
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      errorMessage.value = 'Pemilihan folder dibatalkan.'
    } else {
      errorMessage.value = error instanceof Error ? error.message : 'Paket favicon gagal diunduh.'
    }
  } finally {
    isPreparingDownload.value = false
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (previewResult.value) previewResult.value = null
  else showDeleteConfirmation.value = false
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />
    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"><Icon icon="mdi:arrow-left" class="size-5" /> Kembali ke Free Tools</RouterLink>

      <div class="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><span class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Icon icon="mdi:web-box" class="size-4" /> Website icon</span><h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Favicon Generator</h1><p class="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">Buat paket favicon browser, Apple Touch Icon, PWA, dan master image dari satu sumber PNG.</p></div><span class="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Icon icon="mdi:shield-check-outline" class="size-5" /> Tanpa upload</span></div>

          <label class="mt-8 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-5 py-8 text-center transition" :class="isDragging ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-amber-500'" @dragenter.prevent="isDragging = true" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
            <input type="file" accept="image/png,.png" class="sr-only" :disabled="isProcessing" @change="handleFileInput" />
            <img v-if="sourcePreviewUrl" :src="sourcePreviewUrl" alt="Preview sumber favicon" class="size-24 rounded-2xl bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] object-contain shadow-lg" />
            <span v-else class="grid size-16 place-items-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20"><Icon icon="mdi:image-plus-outline" class="size-8" /></span>
            <strong class="mt-5 text-lg text-slate-950 dark:text-white">{{ sourceFile ? 'Ganti sumber PNG' : 'Tarik PNG ke sini atau klik untuk memilih' }}</strong>
            <span class="mt-2 text-sm text-slate-500 dark:text-slate-400">Wajib PNG · maksimal 25 MB · satu sumber</span>
            <span v-if="sourceFile" class="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300">{{ sourceFile.name }} · {{ formatFileSize(sourceFile.size) }}</span>
          </label>

          <p v-if="errorMessage" class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">{{ errorMessage }}</p>

          <div v-if="isProcessing" class="mt-6 rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10"><div class="flex items-center justify-between text-sm font-bold text-amber-700 dark:text-amber-300"><span>Membuat favicon {{ completedCount }} dari {{ faviconSizes.length }}...</span><span>{{ progressPercentage }}%</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950"><div class="h-full rounded-full bg-amber-500 transition-all" :style="{ width: `${progressPercentage}%` }"></div></div></div>

          <div v-if="results.length" class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"><div><p class="text-sm font-black text-slate-950 dark:text-white">Pilih ukuran yang dibutuhkan</p><p class="mt-0.5 text-xs font-semibold text-slate-500">{{ selectedSizes.length }} dari {{ faviconSizes.length }} ukuran dipilih</p></div><div class="flex gap-2"><button type="button" class="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" :disabled="allSizesSelected" @click="selectAllSizes">Pilih semua</button><button type="button" class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300" :disabled="selectedSizes.length === 0" @click="clearSizeSelection">Kosongkan</button></div></div>

          <div v-if="results.length" class="mt-3 grid max-h-[52rem] gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid-cols-2">
            <article v-for="result in results" :key="result.size" class="relative rounded-2xl border p-4 transition" :class="selectedSizes.includes(result.size) ? 'border-amber-400 bg-amber-50/40 dark:border-amber-500/50 dark:bg-amber-500/5' : 'border-slate-200 dark:border-slate-700'"><label class="absolute right-3 top-3 grid size-8 cursor-pointer place-items-center rounded-lg bg-white shadow-sm dark:bg-slate-800" :aria-label="`Pilih ukuran ${result.size}x${result.size}`"><input v-model="selectedSizes" type="checkbox" :value="result.size" class="size-4 accent-amber-500" /></label><div class="flex items-center gap-3 pr-9"><button type="button" class="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0]" :disabled="!result.previewUrl" :aria-label="`Preview favicon ${result.size}x${result.size}`" @click="previewResult = result"><img v-if="result.previewUrl" :src="result.previewUrl" :alt="`Favicon ${result.size}x${result.size}`" class="max-h-full max-w-full object-contain" /><Icon v-else :icon="result.status === 'processing' ? 'mdi:loading' : 'mdi:image-outline'" class="size-6 text-slate-400" :class="{ 'animate-spin': result.status === 'processing' }" /></button><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><strong class="text-lg font-black text-slate-950 dark:text-white">{{ result.size }}×{{ result.size }}</strong><span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-800">{{ result.group }}</span></div><p class="mt-1 text-xs font-semibold leading-5 text-slate-500">{{ result.label }}</p><p v-if="result.blob" class="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">PNG · {{ formatFileSize(result.blob.size) }}</p></div></div><button type="button" class="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-50" :disabled="result.status !== 'completed'" @click="downloadResult(result)"><Icon :icon="result.status === 'processing' ? 'mdi:loading' : 'mdi:download'" class="size-5" :class="{ 'animate-spin': result.status === 'processing' }" /> Download PNG</button><p v-if="result.errorMessage" class="mt-2 text-xs font-semibold text-rose-600">{{ result.errorMessage }}</p></article>
          </div>

          <div v-if="allCompleted" class="mt-6"><div class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Icon icon="mdi:check-circle" class="size-5" /> Semua {{ faviconSizes.length }} ukuran PNG selesai</div><div class="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div class="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"><Icon icon="mdi:file-document-check-outline" class="mt-0.5 size-5 shrink-0" /><p class="text-xs font-semibold leading-5">Setiap paket selalu menyertakan <strong>manifest.webmanifest</strong> dengan URL ikon sesuai URL website.</p></div><p class="mt-4 text-sm font-black text-slate-950 dark:text-white">Metode download paket</p><div class="mt-3 grid grid-cols-2 gap-2"><button type="button" class="rounded-xl border px-3 py-2 text-sm font-bold" :class="downloadMode === 'zip' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" @click="downloadMode = 'zip'">ZIP</button><button type="button" class="rounded-xl border px-3 py-2 text-sm font-bold" :class="downloadMode === 'direct' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" @click="downloadMode = 'direct'">Langsung</button></div><div class="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 font-bold text-white transition hover:bg-amber-600 disabled:opacity-50" :disabled="isPreparingDownload" @click="downloadPackage('all')"><Icon :icon="isPreparingDownload ? 'mdi:loading' : 'mdi:download-multiple'" class="size-5" :class="{ 'animate-spin': isPreparingDownload }" /> Download semua</button><button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950" :disabled="isPreparingDownload || selectedSizes.length === 0" @click="downloadPackage('selected')"><Icon :icon="isPreparingDownload ? 'mdi:loading' : 'mdi:checkbox-multiple-marked-outline'" class="size-5" :class="{ 'animate-spin': isPreparingDownload }" /> Download dipilih ({{ selectedCompletedCount }})</button></div><button type="button" class="mt-2 grid min-h-11 w-full place-items-center rounded-xl bg-rose-600 text-white hover:bg-rose-700" aria-label="Hapus seluruh favicon" @click="showDeleteConfirmation = true"><Icon icon="mdi:trash-can-outline" class="size-5" /></button></div><ToolTransferActions source-tool-key="favicon-generator" :files="transferableResults" :disabled="isPreparingDownload" /></div>
        </section>

        <aside class="space-y-5">
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:tune-variant" class="size-5 text-amber-500" /> Pengaturan</h2><label class="mt-5 block text-xs font-bold text-slate-500">Nama dasar file<div class="mt-1.5 flex"><input v-model="baseName" type="text" class="min-w-0 flex-1 rounded-l-xl border border-r-0 border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" @blur="normalizeBaseName" /><span class="rounded-r-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800">.png</span></div></label><label class="mt-4 block text-xs font-bold text-slate-500">URL website<input v-model="websiteUrl" type="url" inputmode="url" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="https://example.com" @blur="normalizeWebsiteUrl" /></label><label class="mt-4 block text-xs font-bold text-slate-500">Path tujuan ikon<input v-model="assetPath" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm font-semibold dark:border-slate-700 dark:bg-slate-950" placeholder="/icons/" /></label><p class="mt-2 text-[11px] font-semibold leading-5 text-slate-400">URL dan path dipakai oleh manifest serta snippet HTML.</p><p class="mt-5 text-xs font-bold text-slate-500">Penempatan gambar</p><div class="mt-2 grid grid-cols-2 gap-2"><button type="button" class="rounded-xl border px-3 py-2.5 text-sm font-bold" :class="fitMode === 'contain' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" @click="fitMode = 'contain'">Contain</button><button type="button" class="rounded-xl border px-3 py-2.5 text-sm font-bold" :class="fitMode === 'cover' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" @click="fitMode = 'cover'">Cover</button></div><label class="mt-5 flex items-center justify-between gap-3 text-sm font-bold"><span>Background transparan</span><input v-model="transparentBackground" type="checkbox" class="size-5 accent-amber-500" /></label><label v-if="!transparentBackground" class="mt-4 flex items-center justify-between gap-3 text-sm font-bold"><span>Warna background</span><input v-model="backgroundColor" type="color" class="size-10 cursor-pointer rounded-lg border-0 bg-transparent" /></label><button type="button" class="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950" :disabled="!sourceFile || isProcessing" @click="generate"><Icon :icon="isProcessing ? 'mdi:loading' : 'mdi:refresh'" class="size-5" :class="{ 'animate-spin': isProcessing }" /> Terapkan pengaturan</button></section>
          <section v-if="sourcePreviewUrl" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 class="font-black">Maskable safe-zone</h2><div class="relative mx-auto mt-4 grid aspect-square w-48 place-items-center overflow-hidden rounded-3xl" :style="{ backgroundColor: transparentBackground ? '#ffffff' : backgroundColor }"><div class="absolute size-[80%] rounded-full border-2 border-dashed border-rose-500"></div><img :src="sourcePreviewUrl" alt="Preview safe zone ikon maskable" class="size-[80%] object-contain" /></div><p class="mt-3 text-xs leading-5 text-slate-500">Konten utama dijaga di dalam lingkaran safe-zone 80% untuk ikon PWA maskable.</p></section>
          <section v-if="allCompleted" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 class="font-black">HTML link snippet</h2><textarea :value="htmlSnippet" readonly rows="7" class="mt-3 w-full rounded-xl bg-slate-950 p-3 font-mono text-xs leading-5 text-emerald-300"></textarea></section>
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:format-list-numbered" class="size-5 text-amber-500" /> Ukuran tersedia</h2><ul class="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500"><li v-for="item in faviconSizes" :key="item.size" class="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-950">{{ item.size }}×{{ item.size }}</li></ul><p class="mt-4 text-xs leading-5 text-slate-500">Semua hasil selalu PNG. Contain menjaga seluruh gambar; cover memenuhi kotak dengan kemungkinan crop.</p></section>
        </aside>
      </div>
    </main>

    <div v-if="previewResult?.previewUrl" class="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" @click.self="previewResult = null"><div class="w-full max-w-2xl rounded-3xl bg-white p-4 shadow-2xl dark:bg-slate-900"><div class="mb-3 flex items-center justify-between"><div><h2 class="font-black text-slate-950 dark:text-white">Preview {{ previewResult.size }}×{{ previewResult.size }}</h2><p class="text-sm text-slate-500">{{ createFaviconFileName(baseName, previewResult.size) }}</p></div><button type="button" class="grid size-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Tutup preview" @click="previewResult = null"><Icon icon="mdi:close" class="size-5" /></button></div><div class="grid max-h-[70vh] place-items-center overflow-auto rounded-2xl bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] p-6"><img :src="previewResult.previewUrl" :alt="`Favicon ${previewResult.size}x${previewResult.size}`" class="max-h-[60vh] max-w-full object-contain [image-rendering:auto]" /></div></div></div>

    <div v-if="showDeleteConfirmation" class="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title" @click.self="showDeleteConfirmation = false"><div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900"><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"><Icon icon="mdi:trash-can-outline" class="size-7" /></span><h2 id="delete-title" class="mt-4 text-xl font-black text-slate-950 dark:text-white">Hapus paket favicon?</h2><p class="mt-2 text-sm leading-6 text-slate-500">Sumber PNG dan seluruh hasil ukuran akan dihapus.</p><div class="mt-6 grid grid-cols-2 gap-3"><button type="button" class="min-h-11 rounded-xl border border-slate-200 font-bold dark:border-slate-700" @click="showDeleteConfirmation = false">Batal</button><button type="button" class="min-h-11 rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700" @click="showDeleteConfirmation = false; reset()">Hapus</button></div></div></div>
  </div>
</template>
