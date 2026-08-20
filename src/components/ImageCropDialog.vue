<script setup lang="ts">
import type Cropper from 'cropperjs'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { validateImageDimensions } from '@/composables/image/imageValidation'

const props = defineProps<{ sourceUrl: string; fileName: string; maxPixels: number }>()
const emit = defineEmits<{ close: []; apply: [blob: Blob, width: number, height: number] }>()
const container = ref<HTMLElement | null>(null)
const image = ref<HTMLImageElement | null>(null)
const loading = ref(true)
const applying = ref(false)
const errorMessage = ref('')
const aspect = ref<'free' | '1:1' | '16:9' | '4:5'>('free')
let cropper: Cropper | null = null
let generation = 0

function aspectRatio(value = aspect.value) {
  if (value === '1:1') return 1
  if (value === '16:9') return 16 / 9
  if (value === '4:5') return 4 / 5
  return Number.NaN
}

async function initialize() {
  if (!image.value || !container.value) return
  const current = ++generation
  cropper?.destroy()
  cropper = null
  loading.value = true
  try {
    const { default: CropperConstructor } = await import('cropperjs')
    if (current !== generation || !image.value || !container.value) return
    const instance = new CropperConstructor(image.value, { container: container.value })
    const cropperImage = instance.getCropperImage()
    if (!cropperImage) throw new Error('Gambar tidak dapat dibuka di editor crop.')
    await cropperImage.$ready()
    if (current !== generation) { instance.destroy(); return }
    cropper = instance
    const canvas = instance.getCropperCanvas()
    if (canvas) { canvas.style.width = '100%'; canvas.style.height = '100%' }
    setAspect('free')
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Editor crop gagal dimuat.' }
  finally { if (current === generation) loading.value = false }
}

function setAspect(value: typeof aspect.value) {
  aspect.value = value
  const selection = cropper?.getCropperSelection()
  if (selection) selection.aspectRatio = aspectRatio(value)
}

async function applyCrop() {
  const selection = cropper?.getCropperSelection()
  const cropperImage = cropper?.getCropperImage()
  if (!selection || !cropperImage || applying.value) return
  applying.value = true
  errorMessage.value = ''
  try {
    const [scaleX = 0, scaleY = 0] = cropperImage.$getTransform()
    const scale = Math.hypot(scaleX, scaleY)
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('Skala gambar crop tidak valid.')
    const width = Math.max(1, Math.round(selection.width / scale))
    const height = Math.max(1, Math.round(selection.height / scale))
    const dimensionError = validateImageDimensions(width, height, props.maxPixels, 'crop')
    if (dimensionError) throw new Error(dimensionError)
    const canvas = await selection.$toCanvas({ width, height })
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(async (result) => {
      if (result) { resolve(result); return }
      try {
        const fallback = await fetch(canvas.toDataURL('image/png')).then((response) => response.blob())
        if (!fallback.size) throw new Error('Canvas crop kosong.')
        resolve(fallback)
      } catch { reject(new Error('Hasil crop tidak dapat dibuat.')) }
    }, 'image/png'))
    emit('apply', blob, width, height)
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Crop gagal diterapkan.' }
  finally { applying.value = false }
}

onMounted(async () => { await nextTick(); if (image.value?.complete) void initialize() })
onBeforeUnmount(() => { generation += 1; cropper?.destroy() })
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="image-crop-title" @click.self="emit('close')">
    <div class="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 lg:grid-cols-[1fr_18rem]">
      <div ref="container" class="relative grid min-h-[25rem] place-items-center overflow-hidden bg-slate-950 p-4 lg:min-h-[42rem]"><img ref="image" :src="sourceUrl" :alt="`Crop ${fileName}`" class="block max-h-full max-w-full" @load="initialize" /><div v-if="loading" class="absolute inset-0 z-10 grid place-items-center bg-slate-950 text-white"><span class="inline-flex items-center gap-2 font-bold"><Icon icon="mdi:loading" class="size-6 animate-spin" />Memuat editor...</span></div></div>
      <aside class="overflow-y-auto border-t border-slate-200 p-5 dark:border-slate-700 lg:border-l lg:border-t-0">
        <div class="flex items-start justify-between gap-3"><div><h2 id="image-crop-title" class="text-xl font-black">Crop image</h2><p class="mt-1 text-xs font-semibold text-slate-500">Pilih area yang ingin dipertahankan.</p></div><button type="button" class="grid size-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Tutup editor" @click="emit('close')"><Icon icon="mdi:close" class="size-5" /></button></div>
        <fieldset class="mt-6"><legend class="text-sm font-black">Aspect ratio crop</legend><div class="mt-3 grid grid-cols-2 gap-2"><button v-for="option in ['free', '1:1', '16:9', '4:5'] as const" :key="option" type="button" class="min-h-10 rounded-xl border text-sm font-bold" :class="aspect === option ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700'" @click="setAspect(option)">{{ option === 'free' ? 'Bebas' : option }}</button></div></fieldset>
        <p v-if="errorMessage" role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
        <div class="mt-6 space-y-2"><button type="button" class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white disabled:opacity-50" :disabled="loading || applying || !cropper" @click="applyCrop"><Icon :icon="applying ? 'mdi:loading' : 'mdi:crop'" class="size-5" :class="{ 'animate-spin': applying }" />{{ applying ? 'Menerapkan...' : 'Terapkan crop' }}</button><button type="button" class="min-h-11 w-full rounded-xl border border-slate-200 font-bold dark:border-slate-700" :disabled="applying" @click="emit('close')">Batal</button></div>
      </aside>
    </div>
  </div>
</template>
