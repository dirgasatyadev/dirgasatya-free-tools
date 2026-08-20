<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type Cropper from 'cropperjs'
import SiteHeader from '@/components/SiteHeader.vue'
import ToolTransferActions from '@/components/ToolTransferActions.vue'
import {
  applyCanvasCropShape,
  getCropShapeAspectRatio,
  type CropShape,
} from '@/composables/useImageCrop'
import { useIncomingToolTransfer } from '@/composables/useToolTransfer'
import {
  calculateSavedPercentage,
  createUniqueAvifFileName,
  formatFileSize,
  maxPngFiles,
  normalizeAvifBaseName,
  normalizeAvifFileName,
  usePngToAvif,
  validateImageDimensions,
  type PngConversionItem,
} from '@/composables/usePngToAvif'

const {
  items,
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
  applyCrop,
  reset,
} = usePngToAvif()

useIncomingToolTransfer('png-to-avif', addFiles)

const isPreparingDownload = ref(false)
const downloadMode = ref<'zip' | 'direct'>('zip')
const showDeleteConfirmation = ref(false)
const confirmDeleteButton = ref<HTMLButtonElement | null>(null)
const previewImage = ref<{ url: string; title: string; fileName: string } | null>(null)
const cropItem = ref<PngConversionItem | null>(null)
const cropContainer = ref<HTMLElement | null>(null)
const cropSourceImage = ref<HTMLImageElement | null>(null)
const cropErrorMessage = ref('')
const cropShape = ref<CropShape>('rectangle')
const isCropperLoading = ref(false)
const isApplyingCrop = ref(false)
let cropper: Cropper | null = null
let cropperInitialization = 0
let deleteTrigger: HTMLElement | null = null
const allFilesCompleted = computed(
  () => items.value.length > 0 && completedCount.value === items.value.length,
)
const transferableResults = computed(() => {
  const usedFileNames = new Set<string>()

  return items.value.flatMap((item) => {
    if (!item.outputBlob || item.status !== 'completed') return []
    return [
      {
        blob: item.outputBlob,
        fileName: createUniqueAvifFileName(item.outputBaseName, usedFileNames),
      },
    ]
  })
})
const directFolderDownloadSupported = computed(
  () => window.isSecureContext && typeof window.showDirectoryPicker === 'function',
)

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

function savedPercentage(item: PngConversionItem) {
  if (!item.outputBlob) return null
  return calculateSavedPercentage(item.file.size, item.outputBlob.size)
}

function sizeDifferenceLabel(item: PngConversionItem) {
  const percentage = savedPercentage(item)
  if (percentage === null) return ''
  return percentage >= 0
    ? `${percentage}% lebih kecil`
    : `${Math.abs(percentage)}% lebih besar`
}

function outputIsSmaller(item: PngConversionItem) {
  const percentage = savedPercentage(item)
  return percentage !== null && percentage >= 0
}

function normalizeItemFileName(item: PngConversionItem) {
  item.outputBaseName = normalizeAvifBaseName(item.outputBaseName)
}

function downloadFileName(item: PngConversionItem) {
  return normalizeAvifFileName(item.outputBaseName)
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

function openImagePreview(item: PngConversionItem, variant: 'original' | 'result') {
  previewImage.value = {
    url: variant === 'original' ? item.inputPreviewUrl : item.outputPreviewUrl,
    title: variant === 'original' ? 'PNG asli' : 'Hasil AVIF',
    fileName: variant === 'original' ? item.file.name : downloadFileName(item),
  }
}

function closeImagePreview() {
  previewImage.value = null
}

async function openCropEditor(item: PngConversionItem) {
  if (isConverting.value || isPreparingDownload.value) return
  cropErrorMessage.value = ''
  cropShape.value = 'rectangle'
  cropItem.value = item
  isCropperLoading.value = true
  await nextTick()
  if (cropSourceImage.value?.complete) await initializeCropper()
}

async function initializeCropper() {
  const sourceImage = cropSourceImage.value
  const container = cropContainer.value
  const activeItemId = cropItem.value?.id
  if (!sourceImage || !container || !activeItemId) return

  const initializationId = ++cropperInitialization
  cropper?.destroy()
  cropper = null

  try {
    const { default: CropperConstructor } = await import('cropperjs')
    if (initializationId !== cropperInitialization || cropItem.value?.id !== activeItemId || !cropSourceImage.value || !cropContainer.value) return
    const initializedCropper = new CropperConstructor(cropSourceImage.value, {
      container: cropContainer.value,
    })
    const cropperImage = initializedCropper.getCropperImage()
    if (!cropperImage) throw new Error('Gambar tidak dapat dibuka di editor crop.')
    await cropperImage.$ready()
    if (initializationId !== cropperInitialization || cropItem.value?.id !== activeItemId) {
      initializedCropper.destroy()
      return
    }

    cropper = initializedCropper
    const canvas = initializedCropper.getCropperCanvas()
    if (canvas) {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }
    setCropShape(cropShape.value, false)
  } catch (error) {
    cropErrorMessage.value =
      error instanceof Error ? error.message : 'Editor crop tidak dapat dimuat.'
  } finally {
    if (initializationId === cropperInitialization) isCropperLoading.value = false
  }
}

function setCropShape(shape: CropShape, resizeSelection = true) {
  cropShape.value = shape
  const selection = cropper?.getCropperSelection()
  if (!selection) return

  selection.aspectRatio = getCropShapeAspectRatio(shape)
  selection.style.borderRadius = shape === 'circle' ? '50%' : ''

  if (shape === 'circle' && resizeSelection) {
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

function closeCropEditor(force = false) {
  if (isApplyingCrop.value && !force) return
  cropperInitialization += 1
  cropper?.destroy()
  cropper = null
  cropItem.value = null
  cropErrorMessage.value = ''
  isCropperLoading.value = false
}

async function saveCrop() {
  const item = cropItem.value
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

    const outputWidth = Math.max(1, Math.round(selection.width / displayedScale))
    const outputHeight = Math.max(1, Math.round(selection.height / displayedScale))
    const dimensionError = validateImageDimensions(outputWidth, outputHeight)
    if (dimensionError) throw new Error(dimensionError)

    const canvas = await selection.$toCanvas({ width: outputWidth, height: outputHeight })
    const saved = await applyCrop(item.id, applyCanvasCropShape(canvas, cropShape.value))
    if (!saved) {
      cropErrorMessage.value = item.errorMessage || 'Hasil crop tidak dapat disimpan.'
      return
    }
    closeCropEditor(true)
  } catch (error) {
    cropErrorMessage.value =
      error instanceof Error ? error.message : 'Hasil crop tidak dapat disimpan.'
  } finally {
    isApplyingCrop.value = false
  }
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (cropItem.value && !isApplyingCrop.value) {
    event.preventDefault()
    closeCropEditor()
    return
  }
  if (previewImage.value) {
    event.preventDefault()
    closeImagePreview()
    return
  }
  if (!showDeleteConfirmation.value) return
  event.preventDefault()
  void closeDeleteConfirmation()
}

onMounted(() => window.addEventListener('keydown', handleDialogKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleDialogKeydown)
  cropper?.destroy()
})

function getCompletedFiles() {
  const usedFileNames = new Set<string>()
  return items.value.map((item) => {
    if (!item.outputBlob) throw new Error('Ada hasil AVIF yang belum selesai.')
    return {
      blob: item.outputBlob,
      fileName: createUniqueAvifFileName(item.outputBaseName, usedFileNames),
    }
  })
}

async function downloadAsZip(files: ReturnType<typeof getCompletedFiles>) {
    const { BlobReader, BlobWriter, ZipWriter } = await import('@zip.js/zip.js')
    const zipWriter = new ZipWriter(new BlobWriter('application/zip'))

    for (const file of files) {
    await zipWriter.add(file.fileName, new BlobReader(file.blob), { level: 0 })
    }

    const zipBlob = await zipWriter.close()
    const downloadUrl = URL.createObjectURL(zipBlob)
    const downloadLink = document.createElement('a')
    downloadLink.href = downloadUrl
    downloadLink.download = 'png-to-avif-results.zip'
    document.body.append(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000)
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

async function downloadDirectly(files: ReturnType<typeof getCompletedFiles>) {
  if (directFolderDownloadSupported.value && window.showDirectoryPicker) {
    const directoryHandle = await window.showDirectoryPicker({
      id: 'png-to-avif-downloads',
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
    errorMessage.value =
      error instanceof Error ? error.message : 'Hasil AVIF tidak dapat diunduh.'
  } finally {
    isPreparingDownload.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />

    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
        <Icon icon="mdi:arrow-left" class="size-5" aria-hidden="true" />
        Kembali ke Free Tools
      </RouterLink>

      <div class="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Icon icon="mdi:image-sync-outline" class="size-4" aria-hidden="true" />
                Image converter
              </span>
              <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">PNG to AVIF</h1>
              <p class="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">
                Pilih hingga 100 PNG dan konversi akan dimulai otomatis. File diproses satu per satu secara lokal di browser Anda.
              </p>
            </div>
            <span class="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Icon icon="mdi:shield-check-outline" class="size-5" aria-hidden="true" />
              Tanpa upload
            </span>
          </div>

          <label
            class="mt-8 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-5 py-8 text-center transition"
            :class="isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5'"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <input type="file" accept="image/png,.png" multiple class="sr-only" :disabled="isConverting || isPreparingDownload || items.length >= maxPngFiles" @change="handleFileInput" />
            <span class="grid size-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Icon icon="mdi:cloud-upload-multiple-outline" class="size-8" aria-hidden="true" />
            </span>
            <p class="mt-4 text-lg font-bold text-slate-950 dark:text-white">
              {{ items.length ? 'Tambahkan file PNG lainnya' : 'Pilih atau tarik file PNG ke sini' }}
            </p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ items.length }}/{{ maxPngFiles }} file · otomatis dikonversi pada kualitas {{ quality }}%
            </p>
          </label>

          <div v-if="errorMessage" role="alert" class="mt-4 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p class="text-sm font-medium">{{ errorMessage }}</p>
          </div>

          <div class="mt-7 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div class="flex items-center justify-between gap-4">
              <label for="avif-quality" class="font-bold text-slate-900 dark:text-white">Kualitas AVIF</label>
              <output for="avif-quality" class="rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{{ quality }}%</output>
            </div>
            <input id="avif-quality" v-model.number="quality" type="range" min="1" max="100" step="1" class="mt-4 w-full accent-indigo-600" :disabled="isConverting" />
            <div class="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>File lebih kecil</span><span>Kualitas lebih tinggi</span></div>
          </div>

          <div v-if="items.length && processedCount < items.length && (isConverting || !errorMessage)" class="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <p class="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300" role="status" aria-live="polite">
              <Icon icon="mdi:loading" class="size-4 animate-spin" aria-hidden="true" />
              Memproses otomatis {{ Math.min(processedCount + 1, items.length) }} dari {{ items.length }}...
            </p>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" :aria-valuenow="progressPercentage" aria-valuemin="0" aria-valuemax="100">
              <div class="h-full rounded-full bg-indigo-600 transition-[width] duration-300" :style="{ width: `${progressPercentage}%` }"></div>
            </div>
          </div>

          <fieldset v-if="allFilesCompleted" class="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <legend class="px-1 font-bold text-slate-900 dark:text-white">Metode download semua</legend>
            <div class="mt-2 grid gap-3 sm:grid-cols-2">
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition" :class="downloadMode === 'zip' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'">
                <input v-model="downloadMode" type="radio" value="zip" class="mt-1 accent-indigo-600" :disabled="isPreparingDownload" />
                <span>
                  <span class="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Icon icon="mdi:folder-zip-outline" class="size-5 text-indigo-600 dark:text-indigo-400" /> ZIP</span>
                  <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Satu file ZIP berisi seluruh AVIF.</span>
                </span>
              </label>
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition" :class="downloadMode === 'direct' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'">
                <input v-model="downloadMode" type="radio" value="direct" class="mt-1 accent-indigo-600" :disabled="isPreparingDownload" />
                <span>
                  <span class="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Icon icon="mdi:folder-download-outline" class="size-5 text-indigo-600 dark:text-indigo-400" /> Download langsung</span>
                  <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Simpan semua AVIF langsung ke folder pilihan.</span>
                </span>
              </label>
            </div>
            <p v-if="downloadMode === 'direct'" class="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              <Icon icon="mdi:shield-key-outline" class="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              {{ directFolderDownloadSupported ? 'Browser akan meminta izin akses folder ketika tombol ditekan. Berlaku di localhost dan production HTTPS.' : 'Pemilih folder tidak didukung browser ini. Browser mungkin meminta izin multiple downloads.' }}
            </p>
          </fieldset>

          <div v-if="allFilesCompleted" class="mt-6">
            <div class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" role="status">
              <Icon icon="mdi:check-circle" class="size-5" aria-hidden="true" />
              Semua file selesai dikonversi
            </div>
            <div class="mt-3 flex gap-3">
              <button type="button" class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400" :disabled="isPreparingDownload" @click="downloadAll">
                <Icon :icon="isPreparingDownload ? 'mdi:loading' : downloadMode === 'zip' ? 'mdi:folder-zip-outline' : 'mdi:folder-download-outline'" class="size-5" :class="{ 'animate-spin': isPreparingDownload }" aria-hidden="true" />
                {{ isPreparingDownload ? downloadMode === 'zip' ? 'Menyiapkan ZIP...' : 'Menyimpan semua file...' : downloadMode === 'zip' ? 'Download semua ZIP' : 'Download langsung' }}
              </button>
              <button type="button" class="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-700" :disabled="isPreparingDownload" aria-label="Hapus semua file" title="Hapus semua" @click="openDeleteConfirmation">
                <Icon icon="mdi:trash-can-outline" class="size-5" aria-hidden="true" />
              </button>
            </div>
            <ToolTransferActions source-tool-key="png-to-avif" :files="transferableResults" :disabled="isPreparingDownload" />
          </div>

          <div v-else-if="items.length && !isConverting && hasProcessableItems && (failedCount || errorMessage)" class="mt-6 flex gap-3">
            <button type="button" class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 font-bold text-white transition hover:bg-rose-700" @click="convertAll">
              <Icon icon="mdi:refresh" class="size-5" aria-hidden="true" />
              Coba proses lagi
            </button>
            <button type="button" class="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700" aria-label="Hapus semua file" title="Hapus semua" @click="openDeleteConfirmation">
              <Icon icon="mdi:trash-can-outline" class="size-5" aria-hidden="true" />
            </button>
          </div>

          <div v-if="items.length" class="mt-8 space-y-4">
            <div class="flex items-end justify-between gap-4">
              <div>
                <h2 class="text-xl font-black text-slate-950 dark:text-white">Preview file</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">PNG yang dipilih langsung ditampilkan. Setelah selesai, preview AVIF muncul di sampingnya.</p>
              </div>
              <span class="shrink-0 text-sm font-bold text-slate-500 dark:text-slate-400">{{ items.length }} file</span>
            </div>

            <div class="grid max-h-[70vh] gap-4 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid-cols-2" role="region" aria-label="Daftar preview file" tabindex="0">
              <article v-for="item in items" :key="item.id" class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div class="grid" :class="item.outputPreviewUrl ? 'grid-cols-2' : 'grid-cols-1'">
                  <button type="button" class="group relative min-w-0 overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500" :aria-label="`Buka preview PNG asli ${item.file.name}`" @click="openImagePreview(item, 'original')">
                    <figure class="relative grid aspect-4/3 place-items-center bg-slate-100 p-2 dark:bg-slate-800">
                      <img :src="item.inputPreviewUrl" :alt="`Preview PNG ${item.file.name}`" class="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105" />
                      <figcaption class="absolute left-2 top-2 rounded-lg bg-black/65 px-2 py-1 text-[11px] font-bold text-white">PNG asli</figcaption>
                      <span class="absolute bottom-2 right-2 grid size-8 place-items-center rounded-lg bg-black/65 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true"><Icon icon="mdi:magnify-plus-outline" class="size-4" /></span>
                    </figure>
                  </button>
                  <button v-if="item.outputPreviewUrl" type="button" class="group relative min-w-0 overflow-hidden border-l border-slate-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:border-slate-700" :aria-label="`Buka preview hasil AVIF ${item.file.name}`" @click="openImagePreview(item, 'result')">
                    <figure class="relative grid aspect-4/3 place-items-center bg-slate-100 p-2 dark:bg-slate-800">
                      <img :src="item.outputPreviewUrl" :alt="`Preview AVIF ${item.file.name}`" class="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105" />
                      <figcaption class="absolute left-2 top-2 rounded-lg bg-emerald-600/90 px-2 py-1 text-[11px] font-bold text-white">{{ item.isCropped ? 'AVIF hasil crop' : 'Hasil AVIF' }}</figcaption>
                      <span class="absolute bottom-2 right-2 grid size-8 place-items-center rounded-lg bg-black/65 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true"><Icon icon="mdi:magnify-plus-outline" class="size-4" /></span>
                    </figure>
                  </button>
                </div>

                <div class="p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate font-bold text-slate-950 dark:text-white" :title="item.file.name">{{ item.file.name }}</p>
                    </div>
                    <span
                      class="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                      :class="{
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': item.status === 'queued',
                        'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300': item.status === 'processing',
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300': item.status === 'completed',
                        'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300': item.status === 'error',
                      }"
                    >{{ statusLabels[item.status] }}</span>
                  </div>
                  <dl v-if="item.outputBlob" class="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                    <div class="min-w-0 text-center">
                      <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">PNG</dt>
                      <dd class="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white">{{ formatFileSize(item.file.size) }}</dd>
                    </div>
                    <Icon icon="mdi:arrow-right" class="size-5 text-slate-400" aria-hidden="true" />
                    <div class="min-w-0 text-center">
                      <dt class="text-[11px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">AVIF</dt>
                      <dd class="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white">{{ formatFileSize(item.outputBlob.size) }}</dd>
                    </div>
                    <div class="col-span-3 mt-1 border-t border-slate-200 pt-2 text-center dark:border-slate-700">
                      <dt class="sr-only">Perubahan ukuran</dt>
                      <dd class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black" :class="outputIsSmaller(item) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'">
                        <Icon :icon="outputIsSmaller(item) ? 'mdi:trending-down' : 'mdi:trending-up'" class="size-4" aria-hidden="true" />
                        {{ sizeDifferenceLabel(item) }}
                      </dd>
                    </div>
                  </dl>
                  <p v-else class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">PNG · {{ formatFileSize(item.file.size) }}</p>
                  <label class="mt-4 block">
                    <span class="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <Icon icon="mdi:file-edit-outline" class="size-4" aria-hidden="true" />
                      Nama file hasil
                    </span>
                    <span class="flex min-h-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950">
                      <input v-model="item.outputBaseName" type="text" maxlength="180" class="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white" :disabled="isPreparingDownload" :aria-label="`Nama file hasil untuk ${item.file.name}, tanpa ekstensi`" @blur="normalizeItemFileName(item)" />
                      <span class="flex items-center border-l border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" aria-hidden="true">.avif</span>
                    </span>
                  </label>
                  <p v-if="item.errorMessage" class="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{{ item.errorMessage }}</p>
                  <div class="mt-4 flex gap-2">
                    <a v-if="item.outputBlob" :href="item.outputPreviewUrl" :download="downloadFileName(item)" class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-700" @click="normalizeItemFileName(item)">
                      <Icon icon="mdi:download" class="size-4" aria-hidden="true" />
                      Download AVIF
                    </a>
                    <button v-else type="button" class="inline-flex min-h-10 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-3 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400" disabled>
                      <Icon :icon="item.status === 'error' ? 'mdi:alert-circle-outline' : 'mdi:loading'" class="size-4" :class="{ 'animate-spin': item.status !== 'error' }" aria-hidden="true" />
                      {{ item.status === 'error' ? 'Konversi gagal' : item.status === 'queued' ? 'Menunggu konversi...' : 'Memproses AVIF...' }}
                    </button>
                    <button type="button" class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-200 px-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10" :disabled="isConverting || isPreparingDownload || item.status !== 'completed'" :aria-label="`Crop ${item.file.name}`" title="Crop gambar" @click="openCropEditor(item)">
                      <Icon icon="mdi:crop" class="size-5" aria-hidden="true" />
                      <span class="hidden sm:inline">Crop</span>
                    </button>
                    <button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400" :disabled="isConverting || isPreparingDownload" :aria-label="`Hapus ${item.file.name}`" @click="removeItem(item.id)">
                      <Icon icon="mdi:delete-outline" class="size-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <aside class="space-y-5">
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:information-outline" class="size-5 text-indigo-600 dark:text-indigo-400" /> Detail proses</h2>
            <ul class="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              <li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Maksimal 100 PNG per antrean.</li>
              <li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Konversi dimulai otomatis setelah file dipilih.</li>
              <li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Satu file diproses pada satu waktu.</li>
              <li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> File tidak dikirim ke server.</li>
              <li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Encoding memakai WebAssembly.</li>
              <li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Transparansi PNG tetap didukung.</li>
            </ul>
          </section>

          <section class="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/10">
            <Icon icon="mdi:memory" class="size-7 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h2 class="mt-3 font-black text-indigo-950 dark:text-indigo-200">Antrean ramah memori</h2>
            <p class="mt-2 text-sm leading-6 text-indigo-800 dark:text-indigo-300">Pemrosesan bertahap mencegah semua gambar dibuka dan dikonversi bersamaan di memori browser.</p>
          </section>
        </aside>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="previewImage" class="fixed inset-0 z-100 grid place-items-center p-4 sm:p-7">
        <button type="button" class="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Tutup preview gambar" @click="closeImagePreview"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="image-preview-title" class="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl">
          <header class="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
            <div class="min-w-0">
              <h2 id="image-preview-title" class="font-black text-white">{{ previewImage.title }}</h2>
              <p class="truncate text-sm text-slate-400" :title="previewImage.fileName">{{ previewImage.fileName }}</p>
            </div>
            <button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20" aria-label="Tutup preview gambar" @click="closeImagePreview">
              <Icon icon="mdi:close" class="size-6" aria-hidden="true" />
            </button>
          </header>
          <div class="grid min-h-0 flex-1 place-items-center overflow-auto p-4 sm:p-6">
            <img :src="previewImage.url" :alt="`${previewImage.title} ${previewImage.fileName}`" class="max-h-[78vh] max-w-full object-contain" />
          </div>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="cropItem" class="fixed inset-0 z-100 grid place-items-center p-4 sm:p-7">
        <button type="button" class="absolute inset-0 bg-black/75 backdrop-blur-sm disabled:cursor-wait" :disabled="isApplyingCrop" aria-label="Tutup editor crop" @click="closeCropEditor()"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title" aria-describedby="crop-dialog-description" class="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header class="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
            <div class="min-w-0">
              <h2 id="crop-dialog-title" class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:crop" class="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" /> Crop gambar</h2>
              <p id="crop-dialog-description" class="truncate text-sm text-slate-500 dark:text-slate-400" :title="cropItem.file.name">Geser dan ubah ukuran area crop pada {{ cropItem.file.name }}</p>
            </div>
            <button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="isApplyingCrop" aria-label="Tutup editor crop" @click="closeCropEditor()">
              <Icon icon="mdi:close" class="size-6" aria-hidden="true" />
            </button>
          </header>

          <fieldset class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
            <legend class="sr-only">Bentuk crop</legend>
            <span class="mr-1 text-xs font-black uppercase tracking-widest text-slate-400">Bentuk crop</span>
            <button type="button" class="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition" :class="cropShape === 'rectangle' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'" :aria-pressed="cropShape === 'rectangle'" :disabled="isCropperLoading || isApplyingCrop" @click="setCropShape('rectangle')"><Icon icon="mdi:crop-square" class="size-5" aria-hidden="true" /> Kotak</button>
            <button type="button" class="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition" :class="cropShape === 'circle' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'" :aria-pressed="cropShape === 'circle'" :disabled="isCropperLoading || isApplyingCrop" @click="setCropShape('circle')"><Icon icon="mdi:circle-outline" class="size-5" aria-hidden="true" /> Lingkaran</button>
          </fieldset>

          <div ref="cropContainer" class="relative h-[min(65vh,38rem)] min-h-72 overflow-hidden bg-slate-950">
            <img ref="cropSourceImage" :src="cropItem.inputPreviewUrl" :alt="`Crop ${cropItem.file.name}`" class="block max-h-full max-w-full" @load="initializeCropper" />
            <div v-if="isCropperLoading" class="absolute inset-0 z-10 grid place-items-center bg-slate-950 text-white" role="status">
              <span class="inline-flex items-center gap-2 font-bold"><Icon icon="mdi:loading" class="size-5 animate-spin" aria-hidden="true" /> Memuat editor...</span>
            </div>
          </div>

          <footer class="border-t border-slate-200 p-4 dark:border-slate-700 sm:px-5">
            <p v-if="cropErrorMessage" role="alert" class="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {{ cropErrorMessage }}</p>
            <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" class="min-h-11 rounded-xl border border-slate-200 px-5 font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="isApplyingCrop" @click="closeCropEditor()">Batal</button>
              <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400" :disabled="isCropperLoading || isApplyingCrop || !cropper" @click="saveCrop">
                <Icon :icon="isApplyingCrop ? 'mdi:loading' : 'mdi:crop'" class="size-5" :class="{ 'animate-spin': isApplyingCrop }" aria-hidden="true" />
                {{ isApplyingCrop ? 'Menyimpan crop...' : 'Terapkan crop' }}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteConfirmation" class="fixed inset-0 z-100 grid place-items-center p-5">
        <button type="button" class="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Tutup konfirmasi penghapusan" @click="closeDeleteConfirmation"></button>
        <section role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" class="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7">
          <span class="grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <Icon icon="mdi:trash-can-outline" class="size-7" aria-hidden="true" />
          </span>
          <h2 id="delete-dialog-title" class="mt-5 text-2xl font-black text-slate-950 dark:text-white">Hapus semua file?</h2>
          <p id="delete-dialog-description" class="mt-2 leading-7 text-slate-600 dark:text-slate-400">Seluruh antrean, preview, dan hasil AVIF yang belum diunduh akan dihapus dari browser. Tindakan ini tidak dapat dibatalkan.</p>
          <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" class="min-h-11 rounded-xl border border-slate-200 px-5 font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeDeleteConfirmation">Batal</button>
            <button ref="confirmDeleteButton" type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 font-bold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900" @click="confirmDeleteAll">
              <Icon icon="mdi:trash-can-outline" class="size-5" aria-hidden="true" />
              Hapus semua
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
