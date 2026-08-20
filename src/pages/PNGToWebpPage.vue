<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import ToolTransferActions from '@/components/ToolTransferActions.vue'
import { calculateSavedPercentage, formatFileSize } from '@/composables/usePngToAvif'
import {
  createUniqueWebpFileName,
  maxPngToWebpFiles,
  normalizeWebpBaseName,
  normalizeWebpFileName,
  usePngToWebp,
  type PngToWebpItem,
} from '@/composables/usePngToWebp'
import { useIncomingToolTransfer } from '@/composables/useToolTransfer'

const {
  items,
  adaptiveMaxPixels,
  quality,
  isConverting,
  isDragging,
  errorMessage,
  completedCount,
  failedCount,
  processedCount,
  progressPercentage,
  hasProcessableItems,
  addFiles,
  removeItem,
  convertAll,
  cancelConversion,
  reset,
} = usePngToWebp()

useIncomingToolTransfer('png-to-webp', addFiles)

const isPreparingDownload = ref(false)
const downloadMode = ref<'zip' | 'direct'>('zip')
const showDeleteConfirmation = ref(false)
const confirmDeleteButton = ref<HTMLButtonElement | null>(null)
const previewImage = ref<{ url: string; title: string; fileName: string } | null>(null)
let deleteTrigger: HTMLElement | null = null

const allFilesCompleted = computed(
  () => items.value.length > 0 && completedCount.value === items.value.length,
)
const directFolderDownloadSupported = computed(
  () => window.isSecureContext && typeof window.showDirectoryPicker === 'function',
)
const transferableResults = computed(() => {
  const usedFileNames = new Set<string>()
  return items.value.flatMap((item) => {
    if (!item.outputBlob || item.status !== 'completed') return []
    return [
      {
        blob: item.outputBlob,
        fileName: createUniqueWebpFileName(item.outputBaseName, usedFileNames),
      },
    ]
  })
})

const statusLabels = {
  queued: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  error: 'Gagal',
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  void addFiles(Array.from(input.files ?? []))
  input.value = ''
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (isPreparingDownload.value) return
  void addFiles(Array.from(event.dataTransfer?.files ?? []))
}

function normalizeItemFileName(item: PngToWebpItem) {
  item.outputBaseName = normalizeWebpBaseName(item.outputBaseName)
}

function downloadFileName(item: PngToWebpItem) {
  return normalizeWebpFileName(item.outputBaseName)
}

function savedPercentage(item: PngToWebpItem) {
  if (!item.outputBlob) return null
  return calculateSavedPercentage(item.file.size, item.outputBlob.size)
}

function sizeDifferenceLabel(item: PngToWebpItem) {
  const percentage = savedPercentage(item)
  if (percentage === null) return ''
  return percentage >= 0 ? `${percentage}% lebih kecil` : `${Math.abs(percentage)}% lebih besar`
}

function openImagePreview(item: PngToWebpItem, variant: 'original' | 'result') {
  previewImage.value = {
    url: variant === 'original' ? item.inputPreviewUrl : item.outputPreviewUrl,
    title: variant === 'original' ? 'PNG asli' : 'Hasil WebP',
    fileName: variant === 'original' ? item.file.name : downloadFileName(item),
  }
}

function closeImagePreview() {
  previewImage.value = null
}

async function openDeleteConfirmation(event: MouseEvent) {
  deleteTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  showDeleteConfirmation.value = true
  await nextTick()
  confirmDeleteButton.value?.focus()
}

async function closeDeleteConfirmation() {
  showDeleteConfirmation.value = false
  await nextTick()
  deleteTrigger?.focus()
  deleteTrigger = null
}

function confirmDeleteAll() {
  showDeleteConfirmation.value = false
  deleteTrigger = null
  reset()
}

function getCompletedFiles() {
  const usedFileNames = new Set<string>()
  return items.value.map((item) => {
    if (!item.outputBlob) throw new Error('Ada hasil WebP yang belum selesai.')
    return {
      blob: item.outputBlob,
      fileName: createUniqueWebpFileName(item.outputBaseName, usedFileNames),
    }
  })
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const downloadUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = downloadUrl
  downloadLink.download = fileName
  document.body.append(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000)
}

async function downloadAsZip(files: ReturnType<typeof getCompletedFiles>) {
  const { BlobReader, BlobWriter, ZipWriter } = await import('@zip.js/zip.js')
  const zipWriter = new ZipWriter(new BlobWriter('application/zip'))
  for (const file of files) {
    await zipWriter.add(file.fileName, new BlobReader(file.blob), { level: 0 })
  }
  triggerBrowserDownload(await zipWriter.close(), 'png-to-webp-results.zip')
}

async function downloadDirectly(files: ReturnType<typeof getCompletedFiles>) {
  if (directFolderDownloadSupported.value && window.showDirectoryPicker) {
    const directoryHandle = await window.showDirectoryPicker({
      id: 'png-to-webp-downloads',
      mode: 'readwrite',
      startIn: 'downloads',
    })
    for (const file of files) {
      const fileHandle = await directoryHandle.getFileHandle(file.fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(file.blob)
      await writable.close()
    }
    return
  }

  for (const file of files) {
    triggerBrowserDownload(file.blob, file.fileName)
    await new Promise<void>((resolve) => window.setTimeout(resolve, 150))
  }
}

async function downloadAll() {
  if (!allFilesCompleted.value || isPreparingDownload.value) return
  isPreparingDownload.value = true
  errorMessage.value = ''
  try {
    const files = getCompletedFiles()
    if (downloadMode.value === 'zip') await downloadAsZip(files)
    else await downloadDirectly(files)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      errorMessage.value = 'Pemilihan folder dibatalkan. Tidak ada file yang disimpan.'
      return
    }
    errorMessage.value = error instanceof Error ? error.message : 'Hasil WebP tidak dapat diunduh.'
  } finally {
    isPreparingDownload.value = false
  }
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (previewImage.value) closeImagePreview()
  else if (showDeleteConfirmation.value) void closeDeleteConfirmation()
}

onMounted(() => window.addEventListener('keydown', handleDialogKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleDialogKeydown))
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />
    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"><Icon icon="mdi:arrow-left" class="size-5" aria-hidden="true" /> Kembali ke Free Tools</RouterLink>

      <div class="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><span class="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"><Icon icon="mdi:image-sync-outline" class="size-4" aria-hidden="true" /> Image Converter</span><h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">PNG to WebP</h1><p class="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">Konversikan hingga 100 PNG menjadi WebP secara otomatis dan bertahap. Seluruh proses berlangsung di browser.</p></div><span class="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Icon icon="mdi:shield-check-outline" class="mr-1 inline size-4" aria-hidden="true" /> Lokal & privat</span></div>

          <label class="mt-7 block"><span class="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-700 dark:text-slate-300"><span>Kualitas WebP</span><span class="rounded-lg bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">{{ quality }}%</span></span><input v-model.number="quality" type="range" min="1" max="100" class="w-full accent-sky-600" :disabled="isConverting || items.length > 0" /><span class="mt-2 block text-xs text-slate-500 dark:text-slate-400">Atur kualitas sebelum menambahkan file. Default 82%.</span></label>

          <label class="mt-6 grid min-h-56 cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition" :class="isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10' : 'border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-sky-500 dark:hover:bg-sky-500/5'" @dragenter.prevent="isDragging = true" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop"><input type="file" accept="image/png,.png" multiple class="sr-only" :disabled="isConverting || isPreparingDownload || items.length >= maxPngToWebpFiles" @change="handleFileInput" /><span><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200 dark:shadow-sky-950"><Icon icon="mdi:cloud-upload-outline" class="size-7" aria-hidden="true" /></span><span class="mt-4 block text-lg font-black text-slate-950 dark:text-white">Pilih atau drop file PNG</span><span class="mt-1 block text-sm text-slate-500 dark:text-slate-400">{{ items.length }}/{{ maxPngToWebpFiles }} file · maksimal 25 MB dan {{ Math.round(adaptiveMaxPixels / 1_000_000) }} MP adaptif per file</span></span></label>

          <p v-if="errorMessage" role="alert" class="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ errorMessage }}</p>

          <div v-if="items.length && processedCount < items.length && isConverting" class="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div class="flex items-center justify-between gap-3"><p class="flex items-center gap-2 text-sm font-bold text-sky-700 dark:text-sky-300" role="status"><Icon icon="mdi:loading" class="size-4 animate-spin" aria-hidden="true" /> Memproses otomatis {{ Math.min(processedCount + 1, items.length) }} dari {{ items.length }}...</p><button type="button" class="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" @click="cancelConversion">Batalkan</button></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" :aria-valuenow="progressPercentage" aria-valuemin="0" aria-valuemax="100"><div class="h-full rounded-full bg-sky-600 transition-[width] duration-300" :style="{ width: `${progressPercentage}%` }"></div></div></div>

          <fieldset v-if="allFilesCompleted" class="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><legend class="px-1 font-bold text-slate-900 dark:text-white">Metode download semua</legend><div class="mt-2 grid gap-3 sm:grid-cols-2"><label class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition" :class="downloadMode === 'zip' ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'"><input v-model="downloadMode" type="radio" value="zip" class="mt-1 accent-sky-600" :disabled="isPreparingDownload" /><span><span class="flex items-center gap-2 font-bold"><Icon icon="mdi:folder-zip-outline" class="size-5 text-sky-600" /> ZIP</span><span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">Satu ZIP berisi seluruh WebP.</span></span></label><label class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition" :class="downloadMode === 'direct' ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'"><input v-model="downloadMode" type="radio" value="direct" class="mt-1 accent-sky-600" :disabled="isPreparingDownload" /><span><span class="flex items-center gap-2 font-bold"><Icon icon="mdi:folder-download-outline" class="size-5 text-sky-600" /> Download langsung</span><span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">Simpan ke folder pilihan browser.</span></span></label></div><p v-if="downloadMode === 'direct'" class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ directFolderDownloadSupported ? 'Browser akan meminta izin folder di localhost atau production HTTPS.' : 'Pemilih folder tidak didukung; browser mungkin meminta izin multiple downloads.' }}</p></fieldset>

          <div v-if="allFilesCompleted" class="mt-6"><div class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" role="status"><Icon icon="mdi:check-circle" class="size-5" aria-hidden="true" /> Semua file selesai dikonversi</div><div class="mt-3 flex gap-3"><button type="button" class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 font-bold text-white transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60" :disabled="isPreparingDownload" @click="downloadAll"><Icon :icon="isPreparingDownload ? 'mdi:loading' : downloadMode === 'zip' ? 'mdi:folder-zip-outline' : 'mdi:folder-download-outline'" class="size-5" :class="{ 'animate-spin': isPreparingDownload }" aria-hidden="true" />{{ isPreparingDownload ? 'Menyiapkan hasil...' : downloadMode === 'zip' ? 'Download semua ZIP' : 'Download langsung' }}</button><button type="button" class="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700" aria-label="Hapus semua file" title="Hapus semua" @click="openDeleteConfirmation"><Icon icon="mdi:trash-can-outline" class="size-5" aria-hidden="true" /></button></div><ToolTransferActions source-tool-key="png-to-webp" :files="transferableResults" :disabled="isPreparingDownload" /></div>

          <div v-else-if="items.length && !isConverting && hasProcessableItems && (failedCount || errorMessage)" class="mt-6 flex gap-3"><button type="button" class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 font-bold text-white hover:bg-rose-700" @click="convertAll"><Icon icon="mdi:refresh" class="size-5" /> Coba proses lagi</button><button type="button" class="grid size-12 place-items-center rounded-xl bg-rose-600 text-white" aria-label="Hapus semua file" @click="openDeleteConfirmation"><Icon icon="mdi:trash-can-outline" class="size-5" /></button></div>

          <div v-if="items.length" class="mt-8 max-h-[48rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div class="grid gap-4 sm:grid-cols-2"><article v-for="item in items" :key="item.id" class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div class="grid grid-cols-2"><button type="button" class="group relative min-w-0 overflow-hidden text-left" :aria-label="`Buka PNG asli ${item.file.name}`" @click="openImagePreview(item, 'original')"><figure class="relative grid aspect-4/3 place-items-center bg-slate-100 p-2 dark:bg-slate-800"><img :src="item.inputPreviewUrl" :alt="`Preview PNG ${item.file.name}`" class="max-h-full max-w-full object-contain transition group-hover:scale-105" /><figcaption class="absolute left-2 top-2 rounded-lg bg-black/65 px-2 py-1 text-[11px] font-bold text-white">PNG</figcaption></figure></button><button v-if="item.outputPreviewUrl" type="button" class="group relative min-w-0 overflow-hidden border-l border-slate-200 text-left dark:border-slate-700" :aria-label="`Buka hasil WebP ${item.file.name}`" @click="openImagePreview(item, 'result')"><figure class="relative grid aspect-4/3 place-items-center bg-slate-100 p-2 dark:bg-slate-800"><img :src="item.outputPreviewUrl" :alt="`Hasil WebP ${item.file.name}`" class="max-h-full max-w-full object-contain transition group-hover:scale-105" /><figcaption class="absolute left-2 top-2 rounded-lg bg-sky-600/90 px-2 py-1 text-[11px] font-bold text-white">WebP</figcaption></figure></button><div v-else class="grid aspect-4/3 place-items-center border-l border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"><Icon icon="mdi:loading" class="size-6 animate-spin text-sky-500" /></div></div><div class="p-4"><div class="flex items-start justify-between gap-3"><p class="min-w-0 truncate font-bold" :title="item.file.name">{{ item.file.name }}</p><span class="rounded-full px-2 py-0.5 text-xs font-bold" :class="item.status === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'">{{ statusLabels[item.status] }}</span></div><div class="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs dark:bg-slate-800/70"><span><span class="block text-slate-400">PNG</span><strong>{{ formatFileSize(item.file.size) }}</strong></span><span><span class="block text-slate-400">WebP</span><strong>{{ item.outputBlob ? formatFileSize(item.outputBlob.size) : '—' }}</strong></span><span><span class="block text-slate-400">Selisih</span><strong>{{ sizeDifferenceLabel(item) || '—' }}</strong></span></div><label class="mt-4 block"><span class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Nama file hasil</span><span class="flex min-h-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"><input v-model="item.outputBaseName" type="text" maxlength="180" class="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" :disabled="isPreparingDownload" @blur="normalizeItemFileName(item)" /><span class="flex items-center border-l border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800">.webp</span></span></label><p v-if="item.errorMessage" class="mt-2 text-xs font-semibold text-rose-600">{{ item.errorMessage }}</p><div class="mt-4 flex gap-2"><a v-if="item.outputBlob" :href="item.outputPreviewUrl" :download="downloadFileName(item)" class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 text-sm font-bold text-white hover:bg-sky-700" @click="normalizeItemFileName(item)"><Icon icon="mdi:download" class="size-4" /> Download WebP</a><button v-else type="button" disabled class="inline-flex min-h-10 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-3 text-sm font-bold text-slate-500 dark:bg-slate-800"><Icon :icon="item.status === 'error' ? 'mdi:alert-circle-outline' : 'mdi:loading'" class="size-4" :class="{ 'animate-spin': item.status !== 'error' }" />{{ item.status === 'error' ? 'Konversi gagal' : 'Memproses...' }}</button><button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:border-slate-700 dark:hover:bg-slate-800" :disabled="isConverting || isPreparingDownload" :aria-label="`Hapus ${item.file.name}`" @click="removeItem(item.id)"><Icon icon="mdi:delete-outline" class="size-5" /></button></div></div></article></div></div>
        </section>

        <aside class="space-y-5"><section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 class="flex items-center gap-2 font-black"><Icon icon="mdi:information-outline" class="size-5 text-sky-600" /> Detail proses</h2><ul class="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400"><li class="flex gap-2"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Maksimal 100 PNG per antrean.</li><li class="flex gap-2"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Konversi berjalan otomatis satu per satu.</li><li class="flex gap-2"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Transparansi PNG tetap didukung.</li><li class="flex gap-2"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> File tidak dikirim ke server.</li></ul></section><section class="rounded-3xl bg-sky-600 p-5 text-white shadow-lg shadow-sky-200 dark:shadow-sky-950"><Icon icon="mdi:transit-connection-variant" class="size-7" /><h2 class="mt-3 text-lg font-black">Lanjutkan workflow</h2><p class="mt-2 text-sm leading-6 text-sky-100">Setelah selesai, hasil WebP dapat langsung dikirim ke Green Screen Remover tanpa download dan upload ulang.</p></section></aside>
      </div>
    </main>

    <Teleport to="body"><div v-if="previewImage" class="fixed inset-0 z-100 grid place-items-center p-4 sm:p-7"><button type="button" class="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Tutup preview" @click="closeImagePreview"></button><section role="dialog" aria-modal="true" class="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"><header class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3 dark:border-slate-700"><div><h2 class="font-black">{{ previewImage.title }}</h2><p class="text-sm text-slate-500">{{ previewImage.fileName }}</p></div><button type="button" class="grid size-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup preview" @click="closeImagePreview"><Icon icon="mdi:close" class="size-6" /></button></header><div class="grid min-h-0 flex-1 place-items-center overflow-auto bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-size-[20px_20px] p-4 dark:bg-[conic-gradient(#334155_25%,#0f172a_0_50%,#334155_0_75%,#0f172a_0)]"><img :src="previewImage.url" :alt="`${previewImage.title} ${previewImage.fileName}`" class="max-h-[78vh] max-w-full object-contain" /></div></section></div></Teleport>

    <Teleport to="body"><div v-if="showDeleteConfirmation" class="fixed inset-0 z-100 grid place-items-center p-5"><button type="button" class="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Tutup konfirmasi" @click="closeDeleteConfirmation"></button><section role="alertdialog" aria-modal="true" class="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><span class="grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"><Icon icon="mdi:trash-can-outline" class="size-6" /></span><h2 class="mt-4 text-xl font-black">Hapus semua file?</h2><p class="mt-2 leading-7 text-slate-500 dark:text-slate-400">Seluruh PNG dan hasil WebP akan dihapus dari antrean browser.</p><div class="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" class="min-h-11 rounded-xl border border-slate-200 font-bold dark:border-slate-700" @click="closeDeleteConfirmation">Batal</button><button ref="confirmDeleteButton" type="button" class="min-h-11 rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700" @click="confirmDeleteAll">Hapus semua</button></div></section></div></Teleport>
  </div>
</template>
