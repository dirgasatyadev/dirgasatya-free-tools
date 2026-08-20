<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type Cropper from 'cropperjs'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import SiteHeader from '@/components/SiteHeader.vue'
import ToolTransferActions from '@/components/ToolTransferActions.vue'
import {
  applyCanvasCropShape,
  getCropShapeAspectRatio,
  type CropShape,
} from '@/composables/useImageCrop'
import {
  createUniqueCompressedFileName,
  maxCompressImageFiles,
  normalizeCompressedBaseName,
  normalizeCompressedFileName,
  useImageCompressor,
  validateCompressImageDimensions,
  type CompressImageItem,
} from '@/composables/useImageCompressor'
import { formatFileSize, calculateSavedPercentage } from '@/composables/usePngToAvif'
import { useIncomingToolTransfer } from '@/composables/useToolTransfer'

const {
  items,
  adaptiveMaxPixels,
  quality,
  compressionMode,
  targetSizeMb,
  isProcessing,
  isDragging,
  errorMessage,
  completedCount,
  failedCount,
  processedCount,
  progressPercentage,
  hasProcessableItems,
  addFiles,
  processAll,
  cancelProcessing,
  applyCrop,
  removeItem,
  reset,
} = useImageCompressor()

useIncomingToolTransfer('compress-image', addFiles)

const downloadMode = ref<'zip' | 'direct'>('zip')
const isPreparingDownload = ref(false)
const showDeleteConfirmation = ref(false)
const previewImage = ref<{ url: string; title: string; fileName: string } | null>(null)
const editorItem = ref<CompressImageItem | null>(null)
const cropShape = ref<CropShape>('rectangle')
const cropContainer = ref<HTMLElement | null>(null)
const cropSourceImage = ref<HTMLImageElement | null>(null)
const isCropperLoading = ref(false)
const isApplyingCrop = ref(false)
const cropErrorMessage = ref('')
let cropper: Cropper | null = null
let cropperInitialization = 0

const allFilesCompleted = computed(
  () => items.value.length > 0 && completedCount.value === items.value.length,
)
const directFolderDownloadSupported = computed(
  () => window.isSecureContext && typeof window.showDirectoryPicker === 'function',
)
const transferableResults = computed(() => {
  const usedNames = new Set<string>()
  return items.value.flatMap((item) =>
    item.status === 'completed' && item.outputBlob
      ? [{
          blob: item.outputBlob,
          fileName: createUniqueCompressedFileName(
            item.outputBaseName,
            item.outputExtension,
            usedNames,
          ),
        }]
      : [],
  )
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
  if (!isPreparingDownload.value) void addFiles(Array.from(event.dataTransfer?.files ?? []))
}

function downloadFileName(item: CompressImageItem) {
  return normalizeCompressedFileName(item.outputBaseName, item.outputExtension)
}

function normalizeItemFileName(item: CompressImageItem) {
  item.outputBaseName = normalizeCompressedBaseName(item.outputBaseName)
}

function savedPercentage(item: CompressImageItem) {
  return item.outputBlob ? calculateSavedPercentage(item.file.size, item.outputBlob.size) : null
}

function sizeDifferenceLabel(item: CompressImageItem) {
  const percentage = savedPercentage(item)
  if (percentage === null) return ''
  return percentage >= 0 ? `${percentage}% lebih kecil` : `${Math.abs(percentage)}% lebih besar`
}

function openPreview(item: CompressImageItem, result: boolean) {
  previewImage.value = {
    url: result ? item.outputPreviewUrl : item.inputPreviewUrl,
    title: result ? 'Hasil kompresi' : 'Gambar asli',
    fileName: result ? downloadFileName(item) : item.file.name,
  }
}

async function openEditor(item: CompressImageItem) {
  if (isProcessing.value || isPreparingDownload.value) return
  editorItem.value = item
  cropShape.value = 'rectangle'
  cropErrorMessage.value = ''
  isCropperLoading.value = true
  await nextTick()
  if (cropSourceImage.value?.complete) void initializeCropper()
}

async function initializeCropper() {
  const sourceImage = cropSourceImage.value
  const container = cropContainer.value
  const itemId = editorItem.value?.id
  if (!sourceImage || !container || !itemId) return
  const initializationId = ++cropperInitialization
  cropper?.destroy()
  cropper = null
  isCropperLoading.value = true
  try {
    const { default: CropperConstructor } = await import('cropperjs')
    if (initializationId !== cropperInitialization || editorItem.value?.id !== itemId) return
    const initializedCropper = new CropperConstructor(sourceImage, { container })
    const cropperImage = initializedCropper.getCropperImage()
    if (!cropperImage) throw new Error('Gambar tidak dapat dibuka di editor crop.')
    await cropperImage.$ready()
    if (initializationId !== cropperInitialization || editorItem.value?.id !== itemId) {
      initializedCropper.destroy()
      return
    }
    cropper = initializedCropper
    const canvas = initializedCropper.getCropperCanvas()
    if (canvas) {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }
    setCropShape('rectangle', false)
  } catch (error) {
    cropErrorMessage.value = error instanceof Error ? error.message : 'Editor crop gagal dimuat.'
  } finally {
    if (initializationId === cropperInitialization) isCropperLoading.value = false
  }
}

function setCropShape(shape: CropShape, resize = true) {
  cropShape.value = shape
  const selection = cropper?.getCropperSelection()
  if (!selection) return
  selection.aspectRatio = getCropShapeAspectRatio(shape)
  selection.style.borderRadius = shape === 'circle' ? '50%' : ''
  if (shape === 'circle' && resize) {
    const size = Math.min(selection.width, selection.height)
    selection.$change(
      selection.x + (selection.width - size) / 2,
      selection.y + (selection.height - size) / 2,
      size,
      size,
      1,
    )
  }
}

function closeEditor(force = false) {
  if (isApplyingCrop.value && !force) return
  cropperInitialization += 1
  cropper?.destroy()
  cropper = null
  editorItem.value = null
  cropErrorMessage.value = ''
  isCropperLoading.value = false
}

async function saveCrop() {
  const item = editorItem.value
  const selection = cropper?.getCropperSelection()
  const cropperImage = cropper?.getCropperImage()
  if (!item || !selection || !cropperImage || isApplyingCrop.value) return
  cropErrorMessage.value = ''
  isApplyingCrop.value = true
  try {
    const [scaleX = 0, scaleY = 0] = cropperImage.$getTransform()
    const displayedScale = Math.hypot(scaleX, scaleY)
    if (!Number.isFinite(displayedScale) || displayedScale <= 0) {
      throw new Error('Skala gambar crop tidak valid.')
    }
    const width = Math.max(1, Math.round(selection.width / displayedScale))
    const height = Math.max(1, Math.round(selection.height / displayedScale))
    const dimensionError = validateCompressImageDimensions(width, height)
    if (dimensionError) throw new Error(dimensionError)
    const canvas = await selection.$toCanvas({ width, height })
    const saved = await applyCrop(item.id, applyCanvasCropShape(canvas, cropShape.value), cropShape.value)
    if (!saved) {
      cropErrorMessage.value = item.errorMessage || 'Hasil crop tidak dapat disimpan.'
      return
    }
    closeEditor(true)
  } catch (error) {
    cropErrorMessage.value = error instanceof Error ? error.message : 'Hasil crop tidak dapat disimpan.'
  } finally {
    isApplyingCrop.value = false
  }
}

function getCompletedFiles() {
  const usedNames = new Set<string>()
  return items.value.map((item) => {
    if (!item.outputBlob) throw new Error('Ada gambar yang belum selesai diproses.')
    return {
      blob: item.outputBlob,
      fileName: createUniqueCompressedFileName(
        item.outputBaseName,
        item.outputExtension,
        usedNames,
      ),
    }
  })
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

function downloadItem(item: CompressImageItem) {
  if (item.outputBlob) triggerDownload(item.outputBlob, downloadFileName(item))
}

async function downloadAll() {
  if (!allFilesCompleted.value || isPreparingDownload.value) return
  isPreparingDownload.value = true
  errorMessage.value = ''
  try {
    const files = getCompletedFiles()
    if (downloadMode.value === 'zip') {
      const { BlobReader, BlobWriter, ZipWriter } = await import('@zip.js/zip.js')
      const writer = new ZipWriter(new BlobWriter('application/zip'))
      for (const file of files) await writer.add(file.fileName, new BlobReader(file.blob), { level: 0 })
      triggerDownload(await writer.close(), 'compress-image-results.zip')
    } else if (directFolderDownloadSupported.value && window.showDirectoryPicker) {
      const directory = await window.showDirectoryPicker({
        id: 'compress-image-downloads',
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
      errorMessage.value = error instanceof Error ? error.message : 'Hasil tidak dapat diunduh.'
    }
  } finally {
    isPreparingDownload.value = false
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (editorItem.value) closeEditor()
  else if (previewImage.value) previewImage.value = null
  else showDeleteConfirmation.value = false
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  cropper?.destroy()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />
    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400">
        <Icon icon="mdi:arrow-left" class="size-5" aria-hidden="true" /> Kembali ke Free Tools
      </RouterLink>

      <div class="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span class="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                <Icon icon="mdi:image-size-select-small" class="size-4" aria-hidden="true" /> Image optimizer
              </span>
              <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Compress Image</h1>
              <p class="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">Kompres PNG, WebP, JPG, atau JPEG hingga 100 file sekaligus. Semua diproses bertahap langsung di browser.</p>
            </div>
            <span class="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Icon icon="mdi:shield-check-outline" class="size-5" aria-hidden="true" /> Tanpa upload
            </span>
          </div>

          <label
            class="mt-8 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-5 py-8 text-center transition"
            :class="isDragging ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-violet-500'"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <input type="file" class="sr-only" accept="image/png,image/webp,image/jpeg,.jpg,.jpeg" multiple :disabled="isProcessing || items.length >= maxCompressImageFiles" @change="handleFileInput" />
            <span class="grid size-16 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20"><Icon icon="mdi:image-multiple-outline" class="size-8" aria-hidden="true" /></span>
            <strong class="mt-5 text-lg text-slate-950 dark:text-white">Tarik gambar ke sini atau klik untuk memilih</strong>
            <span class="mt-2 text-sm text-slate-500 dark:text-slate-400">PNG, WebP, JPG, JPEG · maksimal 25 MB/file dan {{ Math.round(adaptiveMaxPixels / 1_000_000) }} MP adaptif · {{ items.length }}/{{ maxCompressImageFiles }} file</span>
          </label>

          <p v-if="errorMessage" class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">{{ errorMessage }}</p>

          <div v-if="items.length" class="mt-6">
            <div v-if="isProcessing" class="rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10">
              <div class="flex items-center justify-between text-sm font-bold text-violet-700 dark:text-violet-300"><span>Memproses otomatis {{ processedCount }} dari {{ items.length }}...</span><span>{{ progressPercentage }}%</span></div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950"><div class="h-full rounded-full bg-violet-600 transition-all" :style="{ width: `${progressPercentage}%` }"></div></div>
              <button type="button" class="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-300 px-4 text-sm font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/40 dark:text-violet-300" @click="cancelProcessing"><Icon icon="mdi:stop-circle-outline" class="size-5" /> Batalkan proses</button>
            </div>

            <div class="mt-4 max-h-[48rem] space-y-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <article v-for="item in items" :key="item.id" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div class="grid grid-cols-2 gap-2 sm:w-44">
                    <button type="button" class="overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Preview gambar asli" @click="openPreview(item, false)"><img :src="item.inputPreviewUrl" :alt="item.file.name" class="aspect-square w-full object-contain" /></button>
                    <button type="button" class="overflow-hidden rounded-xl bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] dark:bg-slate-800" :disabled="!item.outputPreviewUrl" aria-label="Preview hasil kompresi" @click="openPreview(item, true)"><img v-if="item.outputPreviewUrl" :src="item.outputPreviewUrl" :alt="downloadFileName(item)" class="aspect-square w-full object-contain" /><span v-else class="grid aspect-square place-items-center"><Icon :icon="item.status === 'processing' ? 'mdi:loading' : 'mdi:image-outline'" class="size-6 text-slate-400" :class="{ 'animate-spin': item.status === 'processing' }" /></span></button>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2"><span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="item.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : item.status === 'error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'">{{ statusLabels[item.status] }}</span><span v-if="item.cropShape" class="text-xs font-bold text-violet-600 dark:text-violet-300">Crop {{ item.cropShape === 'circle' ? 'lingkaran' : 'kotak' }}</span></div>
                    <div class="mt-3 flex items-center"><input v-model="item.outputBaseName" type="text" class="min-w-0 flex-1 rounded-l-xl border border-r-0 border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" aria-label="Nama file hasil" @blur="normalizeItemFileName(item)" /><span class="rounded-r-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">.{{ item.outputExtension }}</span></div>
                    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400"><span>Asli {{ formatFileSize(item.file.size) }}</span><span v-if="item.outputBlob">Hasil {{ formatFileSize(item.outputBlob.size) }}</span><span v-if="item.outputBlob" :class="savedPercentage(item)! >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">{{ sizeDifferenceLabel(item) }}</span></div>
                    <p v-if="item.errorMessage" class="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{{ item.errorMessage }}</p>
                  </div>
                  <div class="flex gap-2 sm:flex-col">
                    <button type="button" class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-violet-200 px-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-500/30 dark:text-violet-300 dark:hover:bg-violet-500/10" :disabled="item.status !== 'completed' || isProcessing" @click="openEditor(item)"><Icon icon="mdi:crop" class="size-5" /> Edit</button>
                    <button type="button" class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-50" :disabled="item.status !== 'completed'" @click="downloadItem(item)"><Icon :icon="item.status === 'processing' ? 'mdi:loading' : 'mdi:download'" class="size-5" :class="{ 'animate-spin': item.status === 'processing' }" /> Download</button>
                    <button type="button" class="grid min-h-10 flex-1 place-items-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-300" :disabled="isProcessing" aria-label="Hapus file" @click="removeItem(item.id)"><Icon icon="mdi:trash-can-outline" class="size-5" /></button>
                  </div>
                </div>
              </article>
            </div>

            <button v-if="failedCount && !isProcessing" type="button" class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 px-4 font-bold text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-300 dark:hover:bg-violet-500/10" :disabled="!hasProcessableItems" @click="processAll"><Icon icon="mdi:refresh" class="size-5" /> Coba ulang {{ failedCount }} file</button>

            <div v-if="allFilesCompleted" class="mt-6">
              <div class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Icon icon="mdi:check-circle" class="size-5" /> Semua file selesai dikompres</div>
              <div class="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p class="text-sm font-black text-slate-950 dark:text-white">Metode download semua</p>
                <div class="mt-3 grid grid-cols-2 gap-2"><button type="button" class="rounded-xl border px-3 py-2 text-sm font-bold" :class="downloadMode === 'zip' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" @click="downloadMode = 'zip'">ZIP</button><button type="button" class="rounded-xl border px-3 py-2 text-sm font-bold" :class="downloadMode === 'direct' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" @click="downloadMode = 'direct'">Langsung</button></div>
                <div class="mt-3 flex gap-2"><button type="button" class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-bold text-white transition hover:bg-violet-700 disabled:opacity-60" :disabled="isPreparingDownload" @click="downloadAll"><Icon :icon="isPreparingDownload ? 'mdi:loading' : downloadMode === 'zip' ? 'mdi:folder-zip-outline' : 'mdi:folder-download-outline'" class="size-5" :class="{ 'animate-spin': isPreparingDownload }" />{{ isPreparingDownload ? 'Menyiapkan...' : downloadMode === 'zip' ? 'Download semua ZIP' : 'Download langsung' }}</button><button type="button" class="grid size-12 place-items-center rounded-xl bg-rose-600 text-white hover:bg-rose-700" aria-label="Hapus semua file" @click="showDeleteConfirmation = true"><Icon icon="mdi:trash-can-outline" class="size-5" /></button></div>
              </div>
              <ToolTransferActions source-tool-key="compress-image" :files="transferableResults" :disabled="isPreparingDownload" />
            </div>
          </div>
        </section>

        <aside class="space-y-5">
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center gap-3"><span class="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Icon icon="mdi:tune-variant" class="size-5" /></span><div><h2 class="font-black text-slate-950 dark:text-white">Pengaturan kompresi</h2><p class="text-xs font-semibold text-slate-500">Atur sebelum memilih file</p></div></div>
            <div class="mt-5 grid grid-cols-2 gap-2">
              <button type="button" class="min-h-11 rounded-xl border px-3 text-sm font-bold transition" :class="compressionMode === 'quality' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" :disabled="items.length > 0" @click="compressionMode = 'quality'">Kualitas</button>
              <button type="button" class="min-h-11 rounded-xl border px-3 text-sm font-bold transition" :class="compressionMode === 'target-size' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" :disabled="items.length > 0" @click="compressionMode = 'target-size'">Target ukuran</button>
            </div>
            <template v-if="compressionMode === 'quality'">
              <div class="mt-5 flex items-center justify-between"><label for="compress-quality" class="text-sm font-bold">Kualitas encoder</label><span class="rounded-lg bg-violet-50 px-2.5 py-1 text-sm font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{{ quality }}%</span></div>
              <input id="compress-quality" v-model.number="quality" type="range" min="1" max="100" class="mt-3 w-full accent-violet-600" :disabled="items.length > 0" />
              <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Mengatur kualitas encoding tanpa menjanjikan ukuran file tertentu. Resolusi tetap dipertahankan.</p>
            </template>
            <template v-else>
              <label for="compress-target-size" class="mt-5 block text-sm font-bold">Ukuran maksimum per file (MB)</label>
              <input id="compress-target-size" v-model.number="targetSizeMb" type="number" min="0.01" max="25" step="0.1" class="mt-3 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950" :disabled="items.length > 0" />
              <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Encoder mencoba mencapai batas ini dan dapat menurunkan resolusi bila diperlukan.</p>
            </template>
            <p class="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-700 dark:text-emerald-300"><Icon icon="mdi:memory" class="mt-0.5 size-4 shrink-0" /> Kompresi dijalankan melalui Web Worker agar UI tetap responsif.</p>
          </section>
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:information-outline" class="size-5 text-violet-600" /> Cara kerja</h2><ul class="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400"><li>Format asli dipertahankan saat kompresi.</li><li>Crop kotak mengikuti format asli.</li><li>Crop lingkaran otomatis menjadi PNG agar area luar tetap transparan.</li><li>Metadata gambar tidak ikut disimpan untuk mengurangi ukuran dan menjaga privasi.</li></ul></section>
        </aside>
      </div>
    </main>

    <div v-if="editorItem" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="crop-title" @click.self="closeEditor()">
      <div class="grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div ref="cropContainer" class="relative grid min-h-[24rem] place-items-center overflow-hidden bg-slate-950 p-4 lg:min-h-[40rem]"><img ref="cropSourceImage" :src="editorItem.inputPreviewUrl" :alt="`Crop ${editorItem.file.name}`" class="block max-h-full max-w-full" @load="initializeCropper" /><div v-if="isCropperLoading" class="absolute inset-0 z-10 grid place-items-center bg-slate-950 text-white"><span class="inline-flex items-center gap-2 font-bold"><Icon icon="mdi:loading" class="size-6 animate-spin" /> Memuat editor...</span></div></div>
        <aside class="overflow-y-auto border-t border-slate-200 p-5 dark:border-slate-700 lg:border-l lg:border-t-0"><div class="flex items-start justify-between gap-3"><div><h2 id="crop-title" class="text-xl font-black text-slate-950 dark:text-white">Crop image</h2><p class="mt-1 text-xs font-semibold text-slate-500">Atur area dan bentuk hasil.</p></div><button type="button" class="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-label="Tutup editor" @click="closeEditor()"><Icon icon="mdi:close" class="size-5" /></button></div>
          <div class="mt-6"><p class="text-sm font-black">Bentuk crop</p><div class="mt-3 grid grid-cols-2 gap-2"><button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold" :class="cropShape === 'rectangle' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" @click="setCropShape('rectangle')"><Icon icon="mdi:crop-square" class="size-5" /> Kotak</button><button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold" :class="cropShape === 'circle' ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'" @click="setCropShape('circle')"><Icon icon="mdi:circle-outline" class="size-5" /> Lingkaran</button></div></div>
          <p v-if="cropShape === 'circle'" class="mt-4 rounded-xl bg-violet-50 p-3 text-xs font-semibold leading-5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">Hasil lingkaran disimpan sebagai PNG transparan.</p>
          <p v-if="cropErrorMessage" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ cropErrorMessage }}</p>
          <div class="mt-6 space-y-2"><button type="button" class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-bold text-white hover:bg-violet-700 disabled:opacity-50" :disabled="isCropperLoading || isApplyingCrop || !cropper" @click="saveCrop"><Icon :icon="isApplyingCrop ? 'mdi:loading' : 'mdi:check'" class="size-5" :class="{ 'animate-spin': isApplyingCrop }" />{{ isApplyingCrop ? 'Menerapkan...' : 'Terapkan crop' }}</button><button type="button" class="min-h-11 w-full rounded-xl border border-slate-200 font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300" :disabled="isApplyingCrop" @click="closeEditor()">Batal</button></div>
        </aside>
      </div>
    </div>

    <div v-if="previewImage" class="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" @click.self="previewImage = null"><div class="w-full max-w-5xl rounded-3xl bg-white p-4 shadow-2xl dark:bg-slate-900"><div class="mb-3 flex items-center justify-between gap-4"><div><h2 class="font-black text-slate-950 dark:text-white">{{ previewImage.title }}</h2><p class="text-sm text-slate-500">{{ previewImage.fileName }}</p></div><button type="button" class="grid size-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Tutup preview" @click="previewImage = null"><Icon icon="mdi:close" class="size-5" /></button></div><div class="grid max-h-[75vh] place-items-center overflow-auto rounded-2xl bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] p-3"><img :src="previewImage.url" :alt="previewImage.fileName" class="max-h-[70vh] max-w-full object-contain" /></div></div></div>

    <div v-if="showDeleteConfirmation" class="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title" @click.self="showDeleteConfirmation = false"><div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900"><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"><Icon icon="mdi:trash-can-outline" class="size-7" /></span><h2 id="delete-title" class="mt-4 text-xl font-black text-slate-950 dark:text-white">Hapus semua file?</h2><p class="mt-2 text-sm leading-6 text-slate-500">Gambar asli, hasil kompresi, dan crop akan dihapus dari antrean.</p><div class="mt-6 grid grid-cols-2 gap-3"><button type="button" class="min-h-11 rounded-xl border border-slate-200 font-bold dark:border-slate-700" @click="showDeleteConfirmation = false">Batal</button><button type="button" class="min-h-11 rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700" @click="showDeleteConfirmation = false; reset()">Hapus</button></div></div></div>
  </div>
</template>
