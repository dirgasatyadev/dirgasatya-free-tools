<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ImageCropDialog from '@/components/ImageCropDialog.vue'
import ToolTransferActions from '@/components/ToolTransferActions.vue'
import { formatFileSize } from '@/composables/usePngToAvif'
import { useIncomingToolTransfer } from '@/composables/useToolTransfer'
import { imageTransformFormats, imageTransformPresets, maxImageTransformFiles, resolveImageTransformDimensions, useImageTransform, type ImageTransformItem, type ImageTransformSettings } from '@/composables/useImageTransform'

const props = defineProps<{ variant: 'resizer' | 'converter' }>()
const isResizer = computed(() => props.variant === 'resizer')
const targetToolKey = computed(() => isResizer.value
  ? 'image-resizer-cropper'
  : 'universal-image-converter')
function initialSettings(variant: typeof props.variant): ImageTransformSettings { return {
  resizeEnabled: variant === 'resizer',
  resizeMode: 'fit-within',
  width: 1920,
  height: 1080,
  percentage: 50,
  fit: 'contain',
  format: 'webp',
  quality: 85,
  stripMetadata: true,
} }
const settings = ref<ImageTransformSettings>(initialSettings(props.variant))
const lockAspectRatio = ref(true)
const cropItem = ref<ImageTransformItem | null>(null)
const isPreparingZip = ref(false)
const {
  items, isProcessing, isDragging, errorMessage, maxPixels, allCompleted,
  completedCount, failedCount, progressPercentage, hasProcessableItems,
  addFiles, invalidateOutputs, removeItem, applyCrop, resetCrop, processAll, cancelProcessing, reset,
} = useImageTransform(settings)

useIncomingToolTransfer(targetToolKey, addFiles)

const title = computed(() => isResizer.value ? 'Image Resizer & Cropper' : 'Universal Image Converter')
const description = computed(() => isResizer.value
  ? 'Resize dan crop PNG, JPEG, WebP, atau AVIF secara batch dengan preset dan kontrol aspect ratio.'
  : 'Konversikan PNG, JPEG, WebP, dan AVIF ke satu format pilihan tanpa membuat banyak tool pasangan.')
const icon = computed(() => isResizer.value ? 'mdi:resize' : 'mdi:image-sync-outline')
const firstSource = computed(() => items.value[0])
const transferableResults = computed(() => items.value.flatMap((item) =>
  item.status === 'completed' && item.outputBlob
    ? [{ blob: item.outputBlob, fileName: item.outputFileName }]
    : [],
))
const estimatedDimensions = computed(() => {
  const item = firstSource.value
  if (!item) return null
  try { return resolveImageTransformDimensions(item, settings.value) }
  catch { return null }
})

watch(settings, invalidateOutputs, { deep: true })
watch(() => props.variant, (variant) => { reset(); settings.value = initialSettings(variant); lockAspectRatio.value = true })

function handleFiles(fileList: FileList | null) { if (fileList) void addFiles(Array.from(fileList)) }
function handleInput(event: Event) { const input = event.target as HTMLInputElement; handleFiles(input.files); input.value = '' }
function handleDrop(event: DragEvent) { isDragging.value = false; handleFiles(event.dataTransfer?.files ?? null) }
function setPreset(width: number, height: number) { settings.value.resizeEnabled = true; if (settings.value.resizeMode === 'percentage') settings.value.resizeMode = 'fit-within'; settings.value.width = width; settings.value.height = height }
function updateWidth() {
  const item = firstSource.value
  if (!lockAspectRatio.value || !item || settings.value.resizeMode !== 'exact') return
  settings.value.height = Math.max(1, Math.round(settings.value.width * item.sourceHeight / item.sourceWidth))
}
function updateHeight() {
  const item = firstSource.value
  if (!lockAspectRatio.value || !item || settings.value.resizeMode !== 'exact') return
  settings.value.width = Math.max(1, Math.round(settings.value.height * item.sourceWidth / item.sourceHeight))
}
function previewUrl(item: ImageTransformItem) { return item.cropPreviewUrl || item.inputPreviewUrl }
function closeCrop() { cropItem.value = null }
function saveCrop(blob: Blob, width: number, height: number) { if (cropItem.value) applyCrop(cropItem.value.id, blob, width, height); closeCrop() }
function download(item: ImageTransformItem) {
  if (!item.outputPreviewUrl) return
  const link = document.createElement('a'); link.href = item.outputPreviewUrl; link.download = item.outputFileName; link.click()
}
async function downloadZip() {
  if (!allCompleted.value || isPreparingZip.value) return
  isPreparingZip.value = true
  errorMessage.value = ''
  try {
    const { BlobReader, BlobWriter, ZipWriter } = await import('@zip.js/zip.js')
    const blobWriter = new BlobWriter('application/zip')
    const writer = new ZipWriter(blobWriter)
    try { for (const item of items.value) if (item.outputBlob) await writer.add(item.outputFileName, new BlobReader(item.outputBlob)) }
    finally { await writer.close() }
    const blob = await blobWriter.getData()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `${isResizer.value ? 'resized-images' : 'converted-images'}.zip`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'ZIP hasil tidak dapat dibuat.' }
  finally { isPreparingZip.value = false }
}
</script>

<template>
  <ToolPageShell :title="title" :description="description" :icon="icon" category="Image">
    <label class="grid min-h-48 cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition" :class="isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950'" @dragenter.prevent="isDragging = true" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop"><input type="file" class="sr-only" accept="image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif" multiple @change="handleInput" /><span><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-600 text-white"><Icon icon="mdi:cloud-upload-outline" class="size-7" /></span><strong class="mt-4 block text-lg">Pilih atau drop gambar</strong><span class="mt-1 block text-sm text-slate-500">PNG, JPG/JPEG, WebP, AVIF · maksimal {{ maxImageTransformFiles }} file</span></span></label>

    <section class="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
      <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="font-black">Pengaturan output</h2><p v-if="firstSource" class="text-sm font-semibold text-slate-500">Original pertama: {{ firstSource.originalWidth }} × {{ firstSource.originalHeight }}</p></div>
      <label v-if="!isResizer" class="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-800"><span>Resize optional</span><input v-model="settings.resizeEnabled" type="checkbox" class="size-5 accent-indigo-600" :disabled="isProcessing" /></label>
      <div v-if="settings.resizeEnabled" class="mt-4 space-y-4">
        <fieldset><legend class="text-sm font-bold">Resize strategy</legend><div class="mt-2 grid gap-2 sm:grid-cols-3"><label v-for="strategy in [{ value: 'exact', label: 'Exact canvas', help: 'Semua output memakai canvas yang sama.' }, { value: 'fit-within', label: 'Fit within', help: 'Maksimal ukuran target, rasio tiap file tetap.' }, { value: 'percentage', label: 'Percentage', help: 'Skala dari ukuran asli setiap file.' }] as const" :key="strategy.value" class="cursor-pointer rounded-xl border p-3" :class="settings.resizeMode === strategy.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700'"><input v-model="settings.resizeMode" type="radio" :value="strategy.value" class="sr-only" :disabled="isProcessing" /><span class="block text-sm font-black">{{ strategy.label }}</span><span class="mt-1 block text-xs font-medium leading-5 text-slate-500">{{ strategy.help }}</span></label></div></fieldset>
        <div v-if="settings.resizeMode !== 'percentage'" class="grid gap-3" :class="settings.resizeMode === 'exact' ? 'sm:grid-cols-[1fr_auto_1fr]' : 'sm:grid-cols-2'"><label class="text-sm font-bold">{{ settings.resizeMode === 'fit-within' ? 'Max width' : 'Width' }}<input v-model.number="settings.width" type="number" min="1" :disabled="isProcessing" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950" @input="updateWidth" /></label><button v-if="settings.resizeMode === 'exact'" type="button" class="mt-7 grid size-12 place-items-center rounded-xl" :class="lockAspectRatio ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'" :aria-pressed="lockAspectRatio" aria-label="Lock aspect ratio" @click="lockAspectRatio = !lockAspectRatio"><Icon :icon="lockAspectRatio ? 'mdi:link-variant' : 'mdi:link-variant-off'" class="size-5" /></button><label class="text-sm font-bold">{{ settings.resizeMode === 'fit-within' ? 'Max height' : 'Height' }}<input v-model.number="settings.height" type="number" min="1" :disabled="isProcessing" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950" @input="updateHeight" /></label></div>
        <label v-else class="block text-sm font-bold">Scale: {{ settings.percentage }}%<input v-model.number="settings.percentage" type="range" min="1" max="200" class="mt-3 w-full accent-indigo-600" :disabled="isProcessing" /></label>
        <div v-if="settings.resizeMode !== 'percentage'"><p class="text-sm font-bold">Preset</p><div class="mt-2 flex flex-wrap gap-2"><button v-for="preset in imageTransformPresets" :key="preset.label" type="button" class="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold hover:border-indigo-500 dark:border-slate-700" :disabled="isProcessing" @click="setPreset(preset.width, preset.height)">{{ preset.width }}×{{ preset.height }}</button><span class="inline-flex min-h-9 items-center rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-500 dark:bg-slate-800">Custom</span></div></div>
        <fieldset v-if="settings.resizeMode === 'exact'"><legend class="text-sm font-bold">Canvas fit</legend><div class="mt-2 grid grid-cols-3 gap-2"><label v-for="fit in ['contain', 'cover', 'stretch'] as const" :key="fit" class="cursor-pointer rounded-xl border p-3 text-center text-sm font-bold" :class="settings.fit === fit ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700'"><input v-model="settings.fit" type="radio" :value="fit" class="sr-only" :disabled="isProcessing" />{{ fit }}</label></div></fieldset>
      </div>
      <fieldset class="mt-5"><legend class="text-sm font-bold">Format output</legend><div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><label v-for="format in imageTransformFormats" :key="format.value" class="cursor-pointer rounded-xl border p-3 text-center text-sm font-black" :class="settings.format === format.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700'"><input v-model="settings.format" type="radio" :value="format.value" class="sr-only" :disabled="isProcessing" />{{ format.label }}</label></div></fieldset>
      <label v-if="settings.format !== 'png'" class="mt-5 block text-sm font-bold">Quality: {{ settings.quality }}%<input v-model.number="settings.quality" type="range" min="1" max="100" class="mt-3 w-full accent-indigo-600" :disabled="isProcessing" /></label>
      <label v-if="!isResizer" class="mt-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-800"><span><span class="block">Strip metadata</span><span class="mt-1 block text-xs font-normal text-slate-500">Canvas re-encode menghapus EXIF dan metadata sumber.</span></span><input v-model="settings.stripMetadata" type="checkbox" class="size-5 accent-indigo-600" :disabled="isProcessing" /></label>
      <p v-if="estimatedDimensions" class="mt-4 text-xs font-semibold text-slate-500">Estimasi output pertama: {{ estimatedDimensions.width }} × {{ estimatedDimensions.height }} · budget perangkat {{ Math.round(maxPixels / 1_000_000) }} MP</p>
    </section>

    <section v-if="items.length" class="mt-6">
      <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="font-black">Batch · {{ items.length }} file</h2><button type="button" class="text-sm font-bold text-rose-600" :disabled="isProcessing" @click="reset">Hapus semua</button></div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><article v-for="item in items" :key="item.id" class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><div class="aspect-video bg-slate-100 dark:bg-slate-950"><img :src="item.outputPreviewUrl || previewUrl(item)" :alt="item.file.name" class="size-full object-contain" /></div><div class="p-4"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><p class="truncate font-bold" :title="item.file.name">{{ item.file.name }}</p><p class="mt-1 text-xs text-slate-500">Original {{ item.originalWidth }}×{{ item.originalHeight }} · {{ formatFileSize(item.file.size) }}</p><p v-if="item.cropped" class="mt-1 text-xs font-bold text-indigo-600">Crop {{ item.sourceWidth }}×{{ item.sourceHeight }}</p><p v-if="item.outputBlob" class="mt-1 text-xs font-bold text-emerald-600">Output {{ item.outputWidth }}×{{ item.outputHeight }} · {{ formatFileSize(item.outputBlob.size) }}</p></div><button type="button" class="text-slate-400 hover:text-rose-600" :disabled="isProcessing" aria-label="Hapus file" @click="removeItem(item.id)"><Icon icon="mdi:close" class="size-5" /></button></div><p v-if="item.errorMessage" class="mt-2 text-xs font-semibold text-rose-600">{{ item.errorMessage }}</p><div class="mt-4 grid grid-cols-2 gap-2"><button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 text-sm font-bold text-indigo-700 dark:border-indigo-500/30 dark:text-indigo-300" :disabled="isProcessing" @click="cropItem = item"><Icon icon="mdi:crop" class="size-4" />Crop</button><button v-if="item.cropped" type="button" class="min-h-10 rounded-xl border border-slate-200 text-sm font-bold dark:border-slate-700" :disabled="isProcessing" @click="resetCrop(item.id)">Reset crop</button><button v-else-if="item.outputBlob" type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white" @click="download(item)"><Icon icon="mdi:download" class="size-4" />Download</button></div><button v-if="item.cropped && item.outputBlob" type="button" class="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white" @click="download(item)"><Icon icon="mdi:download" class="size-4" />Download {{ item.outputFileName }}</button></div></article></div>
      <div class="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full bg-indigo-600 transition-[width]" :style="{ width: `${progressPercentage}%` }"></div></div><p class="mt-2 text-center text-xs font-bold text-slate-500">{{ completedCount }} selesai · {{ failedCount }} gagal · {{ progressPercentage }}%</p>
      <button type="button" class="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white disabled:opacity-50" :disabled="isProcessing || !hasProcessableItems" @click="processAll"><Icon :icon="isProcessing ? 'mdi:loading' : icon" class="size-5" :class="{ 'animate-spin': isProcessing }" />{{ isProcessing ? 'Memproses batch...' : isResizer ? 'Resize semua gambar' : 'Konversi semua gambar' }}</button><button v-if="isProcessing" type="button" class="mt-3 min-h-11 w-full rounded-xl bg-rose-50 font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" @click="cancelProcessing">Batalkan proses</button><button v-if="allCompleted" type="button" class="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white disabled:opacity-50" :disabled="isPreparingZip" @click="downloadZip"><Icon :icon="isPreparingZip ? 'mdi:loading' : 'mdi:folder-zip-outline'" class="size-5" :class="{ 'animate-spin': isPreparingZip }" />{{ isPreparingZip ? 'Menyiapkan ZIP...' : 'Download semua sebagai ZIP' }}</button>
      <ToolTransferActions v-if="allCompleted" :source-tool-key="targetToolKey" :files="transferableResults" :disabled="isPreparingZip" />
    </section>
    <p v-if="errorMessage" role="alert" class="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
    <ImageCropDialog v-if="cropItem" :source-url="previewUrl(cropItem)" :file-name="cropItem.file.name" :max-pixels="maxPixels" @close="closeCrop" @apply="saveCrop" />
  </ToolPageShell>
</template>
