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
import { formatFileSize } from '@/composables/usePngToAvif'
import {
  createUniquePngFileName,
  getClampedSampleArea,
  maxGreenScreenFiles,
  normalizePngBaseName,
  normalizePngFileName,
  useGreenScreenRemover,
  type GreenScreenItem,
  type RgbColor,
} from '@/composables/useGreenScreenRemover'

const {
  items,
  adaptiveMaxPixels,
  tolerance,
  softness,
  isProcessing,
  processingMode,
  isDragging,
  errorMessage,
  completedCount,
  failedCount,
  processedCount,
  progressPercentage,
  hasProcessableItems,
  addFiles,
  removeItem,
  processAll,
  applyEditor,
  reset,
} = useGreenScreenRemover()

useIncomingToolTransfer('green-screen-remover', addFiles)

const isPreparingDownload = ref(false)
const downloadMode = ref<'zip' | 'direct'>('zip')
const showDeleteConfirmation = ref(false)
const confirmDeleteButton = ref<HTMLButtonElement | null>(null)
const previewImage = ref<{ url: string; title: string; fileName: string } | null>(null)
const editorItem = ref<GreenScreenItem | null>(null)
const editorMode = ref<'eyedropper' | 'crop'>('eyedropper')
const selectedKeyColor = ref<RgbColor>({ red: 0, green: 255, blue: 0 })
const samplingCanvas = ref<HTMLCanvasElement | null>(null)
const zoomCanvas = ref<HTMLCanvasElement | null>(null)
const zoomCoordinates = ref({ x: 0, y: 0 })
const isZoomReady = ref(false)
const cropContainer = ref<HTMLElement | null>(null)
const cropSourceImage = ref<HTMLImageElement | null>(null)
const isSamplingLoading = ref(false)
const isCropperLoading = ref(false)
const isApplyingEditor = ref(false)
const editorErrorMessage = ref('')
const editorCropChanged = ref(false)
const editorCropShape = ref<CropShape>('rectangle')
const editorHasSampled = ref(false)
let cropper: Cropper | null = null
let cropperInitialization = 0
let deleteTrigger: HTMLElement | null = null

const allFilesCompleted = computed(
  () => items.value.length > 0 && completedCount.value === items.value.length,
)
const transferableResults = computed(() => {
  const usedFileNames = new Set<string>()

  return items.value.flatMap((item) => {
    const sourceIsPng =
      item.file.type === 'image/png' || item.file.name.toLowerCase().endsWith('.png')
    if (!sourceIsPng || !item.outputBlob || item.status !== 'completed') return []
    return [
      {
        blob: item.outputBlob,
        fileName: createUniquePngFileName(item.outputBaseName, usedFileNames),
      },
    ]
  })
})
const directFolderDownloadSupported = computed(
  () => window.isSecureContext && typeof window.showDirectoryPicker === 'function',
)
const editorSourceUrl = computed(() =>
  editorItem.value?.editSourcePreviewUrl || editorItem.value?.inputPreviewUrl || '',
)
const selectedKeyColorHex = computed(() => {
  const values = [
    selectedKeyColor.value.red,
    selectedKeyColor.value.green,
    selectedKeyColor.value.blue,
  ]
  return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`
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

function normalizeItemFileName(item: GreenScreenItem) {
  item.outputBaseName = normalizePngBaseName(item.outputBaseName)
}

function downloadFileName(item: GreenScreenItem) {
  return normalizePngFileName(item.outputBaseName)
}

function openImagePreview(item: GreenScreenItem, variant: 'original' | 'result') {
  previewImage.value = {
    url: variant === 'original' ? item.inputPreviewUrl : item.outputPreviewUrl,
    title: variant === 'original' ? 'Gambar asli' : 'Hasil transparan',
    fileName: variant === 'original' ? item.file.name : downloadFileName(item),
  }
}

function closeImagePreview() {
  previewImage.value = null
}

async function createSourceCanvas(source: Blob) {
  const bitmap = await createImageBitmap(source)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Browser tidak dapat membaca gambar untuk editor.')
    context.drawImage(bitmap, 0, 0)
    return canvas
  } finally {
    bitmap.close()
  }
}

async function drawSamplingCanvas() {
  const item = editorItem.value
  const canvas = samplingCanvas.value
  if (!item || !canvas) return

  isSamplingLoading.value = true
  try {
    const sourceCanvas = await createSourceCanvas(item.editSourceBlob ?? item.file)
    if (editorItem.value?.id !== item.id || !samplingCanvas.value) return
    samplingCanvas.value.width = sourceCanvas.width
    samplingCanvas.value.height = sourceCanvas.height
    const context = samplingCanvas.value.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Eyedropper tidak dapat membaca gambar.')
    context.drawImage(sourceCanvas, 0, 0)
    drawEyedropperZoom(sourceCanvas.width / 2, sourceCanvas.height / 2)
  } catch (error) {
    editorErrorMessage.value =
      error instanceof Error ? error.message : 'Gambar tidak dapat dibuka di editor.'
  } finally {
    isSamplingLoading.value = false
  }
}

async function initializeEditorCropper() {
  const sourceImage = cropSourceImage.value
  const container = cropContainer.value
  const activeItemId = editorItem.value?.id
  if (!sourceImage || !container || !activeItemId) return

  const initializationId = ++cropperInitialization
  cropper?.destroy()
  cropper = null
  isCropperLoading.value = true

  try {
    const { default: CropperConstructor } = await import('cropperjs')
    if (
      initializationId !== cropperInitialization ||
      editorItem.value?.id !== activeItemId ||
      !cropSourceImage.value ||
      !cropContainer.value
    )
      return

    const initializedCropper = new CropperConstructor(cropSourceImage.value, {
      container: cropContainer.value,
    })
    const cropperImage = initializedCropper.getCropperImage()
    if (!cropperImage) throw new Error('Gambar tidak dapat dibuka di editor crop.')
    await cropperImage.$ready()
    if (initializationId !== cropperInitialization || editorItem.value?.id !== activeItemId) {
      initializedCropper.destroy()
      return
    }

    cropper = initializedCropper
    const canvas = initializedCropper.getCropperCanvas()
    if (canvas) {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }
    setEditorCropShape(editorCropShape.value, false)
  } catch (error) {
    editorErrorMessage.value =
      error instanceof Error ? error.message : 'Editor crop tidak dapat dimuat.'
  } finally {
    if (initializationId === cropperInitialization) isCropperLoading.value = false
  }
}

async function openEditor(item: GreenScreenItem) {
  if (isProcessing.value || isPreparingDownload.value) return
  editorItem.value = item
  editorMode.value = 'eyedropper'
  selectedKeyColor.value = { ...item.keyColor }
  editorCropChanged.value = false
  editorCropShape.value = 'rectangle'
  editorHasSampled.value = false
  editorErrorMessage.value = ''
  isSamplingLoading.value = true
  isCropperLoading.value = false
  await nextTick()
  void drawSamplingCanvas()
}

async function activateCropMode() {
  editorMode.value = 'crop'
  await nextTick()
  if (!cropper && cropSourceImage.value?.complete) void initializeEditorCropper()
}

function handleCropSourceLoad() {
  if (editorMode.value === 'crop') void initializeEditorCropper()
}

function closeEditor(force = false) {
  if (isApplyingEditor.value && !force) return
  cropperInitialization += 1
  cropper?.destroy()
  cropper = null
  editorItem.value = null
  editorErrorMessage.value = ''
  isSamplingLoading.value = false
  isCropperLoading.value = false
  isZoomReady.value = false
}

function getSamplingCoordinates(event: PointerEvent) {
  const canvas = samplingCanvas.value
  if (!canvas) return null
  const bounds = canvas.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return null
  return {
    x: Math.min(
      canvas.width - 1,
      Math.max(0, Math.floor(((event.clientX - bounds.left) / bounds.width) * canvas.width)),
    ),
    y: Math.min(
      canvas.height - 1,
      Math.max(0, Math.floor(((event.clientY - bounds.top) / bounds.height) * canvas.height)),
    ),
  }
}

function drawEyedropperZoom(centerX: number, centerY: number) {
  const sourceCanvas = samplingCanvas.value
  const previewCanvas = zoomCanvas.value
  if (!sourceCanvas || !previewCanvas) return
  const previewContext = previewCanvas.getContext('2d')
  if (!previewContext) return

  const area = getClampedSampleArea(sourceCanvas.width, sourceCanvas.height, centerX, centerY)
  previewCanvas.width = 200
  previewCanvas.height = 200
  previewContext.imageSmoothingEnabled = false
  previewContext.clearRect(0, 0, 200, 200)
  previewContext.drawImage(
    sourceCanvas,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    200,
    200,
  )
  previewContext.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  previewContext.lineWidth = 2
  previewContext.strokeRect(95, 95, 10, 10)
  previewContext.strokeStyle = 'rgba(15, 23, 42, 0.9)'
  previewContext.lineWidth = 1
  previewContext.strokeRect(96.5, 96.5, 7, 7)
  zoomCoordinates.value = { x: Math.round(centerX), y: Math.round(centerY) }
  isZoomReady.value = true
}

function updateEyedropperZoom(event: PointerEvent) {
  const coordinates = getSamplingCoordinates(event)
  if (!coordinates || isSamplingLoading.value) return
  drawEyedropperZoom(coordinates.x, coordinates.y)
}

function sampleKeyColor(event: PointerEvent) {
  const canvas = samplingCanvas.value
  const coordinates = getSamplingCoordinates(event)
  if (!canvas || !coordinates || isSamplingLoading.value) return
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return
  drawEyedropperZoom(coordinates.x, coordinates.y)

  const area = getClampedSampleArea(canvas.width, canvas.height, coordinates.x, coordinates.y)
  if (area.width <= 0 || area.height <= 0) return

  const pixels = context.getImageData(area.x, area.y, area.width, area.height).data
  let red = 0
  let green = 0
  let blue = 0
  let count = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if ((pixels[index + 3] ?? 0) === 0) continue
    red += pixels[index] ?? 0
    green += pixels[index + 1] ?? 0
    blue += pixels[index + 2] ?? 0
    count += 1
  }
  if (count === 0) return

  selectedKeyColor.value = {
    red: Math.round(red / count),
    green: Math.round(green / count),
    blue: Math.round(blue / count),
  }
  editorHasSampled.value = true
}

function updateKeyColorFromInput(event: Event) {
  const hex = (event.target as HTMLInputElement).value
  selectedKeyColor.value = {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  }
  editorHasSampled.value = true
}

function markCropChanged() {
  editorCropChanged.value = true
}

function setEditorCropShape(shape: CropShape, markChanged = true) {
  editorCropShape.value = shape
  if (markChanged) editorCropChanged.value = true

  const selection = cropper?.getCropperSelection()
  if (!selection) return

  selection.aspectRatio = getCropShapeAspectRatio(shape)
  selection.style.borderRadius = shape === 'circle' ? '50%' : ''

  if (shape === 'circle' && markChanged) {
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

async function createEditorOutputCanvas(item: GreenScreenItem) {
  if (!editorCropChanged.value) return createSourceCanvas(item.editSourceBlob ?? item.file)

  const selection = cropper?.getCropperSelection()
  const cropperImage = cropper?.getCropperImage()
  if (!selection || !cropperImage) throw new Error('Area crop belum siap.')
  const [scaleX = 0, scaleY = 0] = cropperImage.$getTransform()
  const displayedScale = Math.hypot(scaleX, scaleY)
  if (!Number.isFinite(displayedScale) || displayedScale <= 0) {
    throw new Error('Skala gambar crop tidak valid.')
  }

  const outputWidth = Math.max(1, Math.round(selection.width / displayedScale))
  const outputHeight = Math.max(1, Math.round(selection.height / displayedScale))
  if (outputWidth * outputHeight > adaptiveMaxPixels) {
    throw new Error(`Resolusi hasil crop melebihi batas adaptif ${Math.round(adaptiveMaxPixels / 1_000_000)} MP.`)
  }
  const canvas = await selection.$toCanvas({ width: outputWidth, height: outputHeight })
  return applyCanvasCropShape(canvas, editorCropShape.value)
}

async function saveEditor() {
  const item = editorItem.value
  if (!item || isApplyingEditor.value) return
  editorErrorMessage.value = ''
  isApplyingEditor.value = true

  try {
    const sourceCanvas = await createEditorOutputCanvas(item)
    const saved = await applyEditor(item.id, sourceCanvas, selectedKeyColor.value)
    if (!saved) {
      editorErrorMessage.value = item.errorMessage || 'Hasil edit tidak dapat disimpan.'
      return
    }
    closeEditor(true)
  } catch (error) {
    editorErrorMessage.value =
      error instanceof Error ? error.message : 'Hasil edit tidak dapat disimpan.'
  } finally {
    isApplyingEditor.value = false
  }
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

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (editorItem.value && !isApplyingEditor.value) {
    event.preventDefault()
    closeEditor()
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
    if (!item.outputBlob) throw new Error('Ada hasil PNG yang belum selesai.')
    return {
      blob: item.outputBlob,
      fileName: createUniquePngFileName(item.outputBaseName, usedFileNames),
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
  const zipBlob = await zipWriter.close()
  triggerBrowserDownload(zipBlob, 'green-screen-remover-results.zip')
}

async function downloadDirectly(files: ReturnType<typeof getCompletedFiles>) {
  if (directFolderDownloadSupported.value && window.showDirectoryPicker) {
    const directoryHandle = await window.showDirectoryPicker({
      id: 'green-screen-remover-downloads',
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
      error instanceof Error ? error.message : 'Hasil transparan tidak dapat diunduh.'
  } finally {
    isPreparingDownload.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />

    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
        <Icon icon="mdi:arrow-left" class="size-5" aria-hidden="true" />
        Kembali ke Free Tools
      </RouterLink>

      <div class="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Icon icon="mdi:account-box-outline" class="size-4" aria-hidden="true" />
                Background remover
              </span>
              <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Green Screen Remover</h1>
              <p class="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">Hapus latar hijau dari hingga 100 gambar dan dapatkan PNG transparan. Semua gambar diproses satu per satu langsung di browser Anda.</p>
            </div>
            <span class="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Icon icon="mdi:shield-check-outline" class="size-5" aria-hidden="true" />
              Tanpa upload
            </span>
          </div>

          <label class="mt-8 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-5 py-8 text-center transition" :class="isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-emerald-500 dark:hover:bg-emerald-500/5'" @dragenter.prevent="isDragging = true" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif" multiple class="sr-only" :disabled="isProcessing || isPreparingDownload || items.length >= maxGreenScreenFiles" @change="handleFileInput" />
            <span class="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Icon icon="mdi:image-plus-outline" class="size-8" aria-hidden="true" /></span>
            <p class="mt-4 text-lg font-bold text-slate-950 dark:text-white">{{ items.length ? 'Tambahkan gambar lainnya' : 'Pilih atau tarik gambar green screen ke sini' }}</p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ items.length }}/{{ maxGreenScreenFiles }} file · PNG, JPG, WebP, atau AVIF · maksimal 25 MB dan {{ Math.round(adaptiveMaxPixels / 1_000_000) }} MP adaptif</p>
          </label>

          <div v-if="errorMessage" role="alert" class="mt-4 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p class="text-sm font-medium">{{ errorMessage }}</p>
          </div>

          <div class="mt-7 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div class="grid gap-5 sm:grid-cols-2">
              <label class="block">
                <span class="flex items-center justify-between gap-3 font-bold text-slate-900 dark:text-white"><span>Toleransi hijau</span><output class="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{{ tolerance }}%</output></span>
                <input v-model.number="tolerance" type="range" min="1" max="100" step="1" class="mt-4 w-full accent-emerald-600" :disabled="isProcessing" />
                <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">Naikkan untuk menghapus lebih banyak variasi hijau.</span>
              </label>
              <label class="block">
                <span class="flex items-center justify-between gap-3 font-bold text-slate-900 dark:text-white"><span>Kelembutan tepi</span><output class="rounded-lg bg-indigo-50 px-2.5 py-1 text-sm text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{{ softness }}%</output></span>
                <input v-model.number="softness" type="range" min="0" max="100" step="1" class="mt-4 w-full accent-indigo-600" :disabled="isProcessing" />
                <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">Haluskan tepi subjek dan kurangi pantulan hijau.</span>
              </label>
            </div>
            <button v-if="items.length" type="button" class="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15" :disabled="isProcessing || isPreparingDownload" @click="processAll(true)">
              <Icon icon="mdi:auto-fix" class="size-5" aria-hidden="true" /> Terapkan pengaturan ke semua
            </button>
          </div>

          <div v-if="items.length && processedCount < items.length && isProcessing" class="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <p class="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300" role="status" aria-live="polite"><Icon icon="mdi:loading" class="size-4 animate-spin" aria-hidden="true" /> {{ processingMode === 'settings' ? 'Menerapkan pengaturan' : 'Memproses otomatis' }} {{ Math.min(processedCount + 1, items.length) }} dari {{ items.length }}...</p>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" :aria-valuenow="progressPercentage" aria-valuemin="0" aria-valuemax="100"><div class="h-full rounded-full bg-emerald-600 transition-[width] duration-300" :style="{ width: `${progressPercentage}%` }"></div></div>
          </div>

          <fieldset v-if="allFilesCompleted" class="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <legend class="px-1 font-bold text-slate-900 dark:text-white">Metode download semua</legend>
            <div class="mt-2 grid gap-3 sm:grid-cols-2">
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition" :class="downloadMode === 'zip' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'">
                <input v-model="downloadMode" type="radio" value="zip" class="mt-1 accent-emerald-600" :disabled="isPreparingDownload" />
                <span><span class="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Icon icon="mdi:folder-zip-outline" class="size-5 text-emerald-600 dark:text-emerald-400" /> ZIP</span><span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Satu ZIP berisi seluruh PNG transparan.</span></span>
              </label>
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition" :class="downloadMode === 'direct' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'">
                <input v-model="downloadMode" type="radio" value="direct" class="mt-1 accent-emerald-600" :disabled="isPreparingDownload" />
                <span><span class="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Icon icon="mdi:folder-download-outline" class="size-5 text-emerald-600 dark:text-emerald-400" /> Download langsung</span><span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Simpan semua PNG ke folder pilihan.</span></span>
              </label>
            </div>
            <p v-if="downloadMode === 'direct'" class="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400"><Icon icon="mdi:shield-key-outline" class="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" /> {{ directFolderDownloadSupported ? 'Browser akan meminta izin akses folder di localhost atau production HTTPS.' : 'Pemilih folder tidak didukung; browser mungkin meminta izin multiple downloads.' }}</p>
          </fieldset>

          <div v-if="allFilesCompleted" class="mt-6">
            <div class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" role="status"><Icon icon="mdi:check-circle" class="size-5" aria-hidden="true" /> Semua background hijau selesai dihapus</div>
            <div class="mt-3 flex gap-3">
              <button type="button" class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400" :disabled="isPreparingDownload" @click="downloadAll"><Icon :icon="isPreparingDownload ? 'mdi:loading' : downloadMode === 'zip' ? 'mdi:folder-zip-outline' : 'mdi:folder-download-outline'" class="size-5" :class="{ 'animate-spin': isPreparingDownload }" aria-hidden="true" /> {{ isPreparingDownload ? 'Menyiapkan hasil...' : downloadMode === 'zip' ? 'Download semua ZIP' : 'Download langsung' }}</button>
              <button type="button" class="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="isPreparingDownload" aria-label="Hapus semua file" title="Hapus semua" @click="openDeleteConfirmation"><Icon icon="mdi:trash-can-outline" class="size-5" aria-hidden="true" /></button>
            </div>
            <ToolTransferActions source-tool-key="green-screen-remover" :files="transferableResults" :disabled="isPreparingDownload" />
          </div>

          <div v-else-if="items.length && !isProcessing && hasProcessableItems && (failedCount || errorMessage)" class="mt-6 flex gap-3">
            <button type="button" class="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 font-bold text-white transition hover:bg-rose-700" @click="processAll()"><Icon icon="mdi:refresh" class="size-5" aria-hidden="true" /> Coba proses lagi</button>
            <button type="button" class="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700" aria-label="Hapus semua file" title="Hapus semua" @click="openDeleteConfirmation"><Icon icon="mdi:trash-can-outline" class="size-5" aria-hidden="true" /></button>
          </div>

          <div v-if="items.length" class="mt-8 space-y-4">
            <div class="flex items-end justify-between gap-4"><div><h2 class="text-xl font-black text-slate-950 dark:text-white">Preview file</h2><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Klik gambar untuk melihat preview berukuran besar.</p></div><span class="shrink-0 text-sm font-bold text-slate-500 dark:text-slate-400">{{ items.length }} file</span></div>
            <div class="grid max-h-[70vh] gap-4 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid-cols-2" role="region" aria-label="Daftar preview file" tabindex="0">
              <article v-for="item in items" :key="item.id" class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div class="grid" :class="item.outputPreviewUrl ? 'grid-cols-2' : 'grid-cols-1'">
                  <button type="button" class="group relative min-w-0 overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500" :aria-label="`Buka gambar asli ${item.file.name}`" @click="openImagePreview(item, 'original')"><figure class="relative grid aspect-4/3 place-items-center bg-slate-100 p-2 dark:bg-slate-800"><img :src="item.inputPreviewUrl" :alt="`Preview asli ${item.file.name}`" class="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105" /><figcaption class="absolute left-2 top-2 rounded-lg bg-black/65 px-2 py-1 text-[11px] font-bold text-white">Gambar asli</figcaption></figure></button>
                  <button v-if="item.outputPreviewUrl" type="button" class="group relative min-w-0 overflow-hidden border-l border-slate-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:border-slate-700" :aria-label="`Buka hasil transparan ${item.file.name}`" @click="openImagePreview(item, 'result')"><figure class="relative grid aspect-4/3 place-items-center bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-size-[20px_20px] p-2 dark:bg-[conic-gradient(#334155_25%,#0f172a_0_50%,#334155_0_75%,#0f172a_0)]"><img :src="item.outputPreviewUrl" :alt="`Hasil transparan ${item.file.name}`" class="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105" /><figcaption class="absolute left-2 top-2 rounded-lg bg-emerald-600/90 px-2 py-1 text-[11px] font-bold text-white">{{ item.isEdited ? 'Hasil edit' : 'Hasil transparan' }}</figcaption></figure></button>
                </div>
                <div class="p-4">
                  <div class="flex items-start justify-between gap-3"><p class="min-w-0 truncate font-bold text-slate-950 dark:text-white" :title="item.file.name">{{ item.file.name }}</p><span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold" :class="{ 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': item.status === 'queued', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300': item.status === 'processing' || item.status === 'completed', 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300': item.status === 'error' }">{{ statusLabels[item.status] }}</span></div>
                  <div class="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/70"><span class="font-semibold text-slate-500 dark:text-slate-400">Asli {{ formatFileSize(item.file.size) }}</span><span v-if="item.outputBlob" class="font-black text-emerald-700 dark:text-emerald-300">PNG {{ formatFileSize(item.outputBlob.size) }}</span></div>
                  <label class="mt-4 block"><span class="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300"><Icon icon="mdi:file-edit-outline" class="size-4" aria-hidden="true" /> Nama file hasil</span><span class="flex min-h-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950"><input v-model="item.outputBaseName" type="text" maxlength="180" class="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-900 outline-none disabled:opacity-60 dark:text-white" :disabled="isPreparingDownload" :aria-label="`Nama hasil ${item.file.name}, tanpa ekstensi`" @blur="normalizeItemFileName(item)" /><span class="flex items-center border-l border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">.png</span></span></label>
                  <p v-if="item.errorMessage" class="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{{ item.errorMessage }}</p>
                  <div class="mt-4 flex gap-2">
                    <a v-if="item.outputBlob && item.status === 'completed'" :href="item.outputPreviewUrl" :download="downloadFileName(item)" class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-700" @click="normalizeItemFileName(item)"><Icon icon="mdi:download" class="size-4" aria-hidden="true" /> Download PNG</a>
                    <button v-else type="button" class="inline-flex min-h-10 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-3 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400" disabled><Icon :icon="item.status === 'error' ? 'mdi:alert-circle-outline' : 'mdi:loading'" class="size-4" :class="{ 'animate-spin': item.status !== 'error' }" aria-hidden="true" /> {{ item.status === 'error' ? 'Proses gagal' : processingMode === 'settings' ? 'Menerapkan pengaturan...' : processingMode === 'editor' ? 'Menerapkan edit...' : 'Menghapus background...' }}</button>
                    <button type="button" class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10" :disabled="isProcessing || isPreparingDownload || item.status !== 'completed'" :aria-label="`Edit ${item.file.name}`" title="Edit gambar" @click="openEditor(item)"><Icon icon="mdi:image-edit-outline" class="size-5" aria-hidden="true" /><span class="hidden sm:inline">Edit</span></button>
                    <button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800" :disabled="isProcessing || isPreparingDownload" :aria-label="`Hapus ${item.file.name}`" @click="removeItem(item.id)"><Icon icon="mdi:delete-outline" class="size-5" aria-hidden="true" /></button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <aside class="space-y-5">
          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:information-outline" class="size-5 text-emerald-600" /> Detail proses</h2><ul class="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400"><li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Maksimal 100 gambar per antrean.</li><li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Mendukung PNG, JPG, WebP, dan AVIF.</li><li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Warna green screen dideteksi otomatis.</li><li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Hasil berupa PNG transparan.</li><li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> File tidak dikirim ke server.</li><li class="flex gap-3"><Icon icon="mdi:check-circle" class="mt-1 size-4 shrink-0 text-emerald-500" /> Tepi hijau dinetralkan otomatis.</li></ul></section>
          <section class="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10"><Icon icon="mdi:lightbulb-on-outline" class="size-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /><h2 class="mt-3 font-black text-emerald-950 dark:text-emerald-200">Tips hasil terbaik</h2><p class="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-300">Gunakan gambar dengan pencahayaan green screen yang merata. Naikkan toleransi sedikit demi sedikit jika masih ada area hijau.</p></section>
        </aside>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="editorItem" class="fixed inset-0 z-100 grid place-items-center p-4 sm:p-7">
        <button type="button" class="absolute inset-0 bg-black/75 backdrop-blur-sm disabled:cursor-wait" :disabled="isApplyingEditor" aria-label="Tutup editor gambar" @click="closeEditor()"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="image-editor-title" aria-describedby="image-editor-description" class="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header class="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
            <div class="min-w-0"><h2 id="image-editor-title" class="flex items-center gap-2 font-black text-slate-950 dark:text-white"><Icon icon="mdi:image-edit-outline" class="size-5 text-emerald-600" aria-hidden="true" /> Edit gambar</h2><p id="image-editor-description" class="truncate text-sm text-slate-500 dark:text-slate-400" :title="editorItem.file.name">Pilih warna background atau crop {{ editorItem.file.name }}</p></div>
            <button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="isApplyingEditor" aria-label="Tutup editor" @click="closeEditor()"><Icon icon="mdi:close" class="size-6" aria-hidden="true" /></button>
          </header>

          <div class="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_19rem] lg:overflow-hidden">
            <div class="min-h-0 bg-slate-950">
              <div v-show="editorMode === 'eyedropper'" class="relative grid min-h-80 place-items-center p-4 sm:h-[min(66vh,40rem)] sm:p-6">
                <canvas ref="samplingCanvas" class="max-h-[58vh] max-w-full cursor-crosshair object-contain shadow-2xl" aria-label="Gerakkan pointer untuk zoom dan klik area warna background" @pointermove="updateEyedropperZoom" @pointerdown="sampleKeyColor"></canvas>
                <div v-if="isSamplingLoading" class="absolute inset-0 grid place-items-center bg-slate-950 text-white" role="status"><span class="inline-flex items-center gap-2 font-bold"><Icon icon="mdi:loading" class="size-5 animate-spin" aria-hidden="true" /> Memuat eyedropper...</span></div>
              </div>
              <div v-show="editorMode === 'crop'" ref="cropContainer" class="relative h-[min(66vh,40rem)] min-h-80 overflow-hidden" @pointerdown="markCropChanged" @wheel="markCropChanged" @keydown="markCropChanged">
                <img ref="cropSourceImage" :src="editorSourceUrl" :alt="`Crop ${editorItem.file.name}`" class="block max-h-full max-w-full" @load="handleCropSourceLoad" />
                <div v-if="isCropperLoading" class="absolute inset-0 z-10 grid place-items-center bg-slate-950 text-white" role="status"><span class="inline-flex items-center gap-2 font-bold"><Icon icon="mdi:loading" class="size-5 animate-spin" aria-hidden="true" /> Memuat crop...</span></div>
              </div>
            </div>

            <aside class="flex flex-col border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 sm:p-5">
              <p class="text-xs font-black uppercase tracking-widest text-slate-400">Tools</p>
              <div class="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1" role="toolbar" aria-label="Tool editor">
                <button type="button" class="inline-flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-bold transition" :class="editorMode === 'eyedropper' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'" :aria-pressed="editorMode === 'eyedropper'" @click="editorMode = 'eyedropper'"><Icon icon="mdi:eyedropper-variant" class="size-5" aria-hidden="true" /> Eyedropper</button>
                <button type="button" class="inline-flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-bold transition" :class="editorMode === 'crop' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'" :aria-pressed="editorMode === 'crop'" @click="activateCropMode"><Icon icon="mdi:crop" class="size-5" aria-hidden="true" /> Crop</button>
              </div>

              <div v-if="editorMode === 'eyedropper'" class="mt-5 space-y-4">
                <div>
                  <div class="flex items-center justify-between gap-2"><p class="text-xs font-black uppercase tracking-widest text-slate-400">Zoom 20×20 px</p><span v-if="isZoomReady" class="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">{{ zoomCoordinates.x }}, {{ zoomCoordinates.y }}</span></div>
                  <div class="mt-2 overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-950 shadow-inner dark:border-slate-700"><canvas ref="zoomCanvas" width="200" height="200" class="block aspect-square w-full [image-rendering:pixelated]" aria-label="Zoom area eyedropper 20 kali 20 piksel"></canvas></div>
                </div>
                <label class="flex min-w-0 items-center gap-3">
                  <span class="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" :style="{ backgroundColor: selectedKeyColorHex }"><input type="color" :value="selectedKeyColorHex" class="absolute inset-0 cursor-pointer opacity-0" aria-label="Pilih warna background" @input="updateKeyColorFromInput" /><Icon icon="mdi:eyedropper-variant" class="size-5 text-white drop-shadow" aria-hidden="true" /></span>
                  <span class="min-w-0"><span class="block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Warna dihapus</span><span class="block font-black uppercase text-slate-950 dark:text-white">{{ selectedKeyColorHex }}</span><span class="block text-xs font-semibold text-slate-500 dark:text-slate-400">RGB {{ selectedKeyColor.red }}, {{ selectedKeyColor.green }}, {{ selectedKeyColor.blue }}</span></span>
                </label>
                <p class="rounded-xl bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><Icon icon="mdi:target" class="mr-1 inline size-4" aria-hidden="true" /> {{ editorHasSampled ? 'Warna diambil dari area 20×20 piksel.' : 'Arahkan pointer untuk zoom, lalu klik area background.' }}</p>
              </div>

              <div v-else class="mt-5 space-y-4">
                <fieldset>
                  <legend class="text-xs font-black uppercase tracking-widest text-slate-400">Bentuk crop</legend>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition" :class="editorCropShape === 'rectangle' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'" :aria-pressed="editorCropShape === 'rectangle'" :disabled="isCropperLoading || isApplyingEditor" @click="setEditorCropShape('rectangle')"><Icon icon="mdi:crop-square" class="size-5" aria-hidden="true" /> Kotak</button>
                    <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition" :class="editorCropShape === 'circle' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'" :aria-pressed="editorCropShape === 'circle'" :disabled="isCropperLoading || isApplyingEditor" @click="setEditorCropShape('circle')"><Icon icon="mdi:circle-outline" class="size-5" aria-hidden="true" /> Lingkaran</button>
                  </div>
                </fieldset>
                <div class="rounded-xl bg-indigo-50 p-3 text-sm leading-6 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"><Icon icon="mdi:crop" class="mr-1 inline size-4" aria-hidden="true" /> Geser dan ubah ukuran area crop. Bentuk lingkaran membuat bagian sudut transparan.</div>
              </div>

              <p v-if="editorErrorMessage" role="alert" class="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {{ editorErrorMessage }}</p>

              <div class="mt-auto grid gap-2 pt-5">
                <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-400" :disabled="isSamplingLoading || isApplyingEditor || (editorMode === 'crop' && isCropperLoading)" @click="saveEditor"><Icon :icon="isApplyingEditor ? 'mdi:loading' : 'mdi:check'" class="size-5" :class="{ 'animate-spin': isApplyingEditor }" aria-hidden="true" /> {{ isApplyingEditor ? 'Menerapkan edit...' : 'Terapkan edit' }}</button>
                <button type="button" class="min-h-11 rounded-xl border border-slate-200 px-5 font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="isApplyingEditor" @click="closeEditor()">Batal</button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="previewImage" class="fixed inset-0 z-100 grid place-items-center p-4 sm:p-7"><button type="button" class="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Tutup preview" @click="closeImagePreview"></button><section role="dialog" aria-modal="true" aria-labelledby="green-preview-title" class="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl"><header class="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5"><div class="min-w-0"><h2 id="green-preview-title" class="font-black text-white">{{ previewImage.title }}</h2><p class="truncate text-sm text-slate-400">{{ previewImage.fileName }}</p></div><button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20" aria-label="Tutup preview" @click="closeImagePreview"><Icon icon="mdi:close" class="size-6" aria-hidden="true" /></button></header><div class="grid min-h-0 flex-1 place-items-center overflow-auto bg-[conic-gradient(#334155_25%,#0f172a_0_50%,#334155_0_75%,#0f172a_0)] bg-size-[24px_24px] p-4 sm:p-6"><img :src="previewImage.url" :alt="`${previewImage.title} ${previewImage.fileName}`" class="max-h-[78vh] max-w-full object-contain" /></div></section></div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteConfirmation" class="fixed inset-0 z-100 grid place-items-center p-5"><button type="button" class="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Tutup konfirmasi" @click="closeDeleteConfirmation"></button><section role="alertdialog" aria-modal="true" aria-labelledby="green-delete-title" aria-describedby="green-delete-description" class="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7"><span class="grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"><Icon icon="mdi:trash-can-outline" class="size-7" aria-hidden="true" /></span><h2 id="green-delete-title" class="mt-5 text-2xl font-black text-slate-950 dark:text-white">Hapus semua file?</h2><p id="green-delete-description" class="mt-2 leading-7 text-slate-600 dark:text-slate-400">Seluruh gambar, preview, dan hasil transparan akan dihapus dari browser. Tindakan ini tidak dapat dibatalkan.</p><div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" class="min-h-11 rounded-xl border border-slate-200 px-5 font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeDeleteConfirmation">Batal</button><button ref="confirmDeleteButton" type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 font-bold text-white transition hover:bg-rose-700" @click="confirmDeleteAll"><Icon icon="mdi:trash-can-outline" class="size-5" aria-hidden="true" /> Hapus semua</button></div></section></div>
    </Teleport>
  </div>
</template>
