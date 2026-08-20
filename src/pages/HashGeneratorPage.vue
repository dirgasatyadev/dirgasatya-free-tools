<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import { digestFile, digestText, type DigestAlgorithm } from '@/composables/useCryptoTools'

const props = defineProps<{ algorithm: DigestAlgorithm }>()
const inputMode = ref<'text' | 'file'>('text')
const inputText = ref('')
const selectedFile = ref<File | null>(null)
const expectedChecksum = ref('')
const hashResult = ref('')
const errorMessage = ref('')
const copied = ref(false)
const isHashing = ref(false)
const isDragging = ref(false)
const progress = ref(0)
let hashingRequest = 0

const bitLengths: Record<DigestAlgorithm, number> = { MD5: 128, 'SHA-256': 256, 'SHA-384': 384, 'SHA-512': 512 }
const bitLength = computed(() => bitLengths[props.algorithm])
const byteCount = computed(() => new TextEncoder().encode(inputText.value).length)
const progressPercent = computed(() => Math.round(progress.value * 100))
const expectedNormalized = computed(() => expectedChecksum.value.trim().toLowerCase().replace(/^0x/, ''))
const expectedIsValid = computed(() => expectedNormalized.value.length === bitLength.value / 4 && /^[a-f0-9]+$/.test(expectedNormalized.value))
const comparison = computed<'empty' | 'invalid' | 'match' | 'mismatch'>(() => {
  if (!expectedNormalized.value) return 'empty'
  if (!expectedIsValid.value) return 'invalid'
  if (!hashResult.value || isHashing.value) return 'empty'
  return expectedNormalized.value === hashResult.value.toLowerCase() ? 'match' : 'mismatch'
})

watch(
  () => [inputMode.value, inputText.value, selectedFile.value, props.algorithm] as const,
  async ([mode, text, file]) => {
    const requestId = ++hashingRequest
    hashResult.value = ''
    errorMessage.value = ''
    copied.value = false
    progress.value = 0
    if (mode === 'file' && !file) {
      isHashing.value = false
      return
    }
    isHashing.value = true
    try {
      const result = mode === 'text'
        ? await digestText(text, props.algorithm)
        : await digestFile(file!, props.algorithm, (value) => {
            if (requestId === hashingRequest) progress.value = value
          })
      if (requestId === hashingRequest) hashResult.value = result
    } catch (error) {
      if (requestId === hashingRequest) errorMessage.value = error instanceof Error ? error.message : 'Checksum tidak dapat dibuat.'
    } finally {
      if (requestId === hashingRequest) isHashing.value = false
    }
  },
  { immediate: true },
)

function selectFile(file?: File) {
  if (!file) return
  selectedFile.value = file
  inputMode.value = 'file'
}
function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  selectFile(input.files?.[0])
  input.value = ''
}
function handleDrop(event: DragEvent) {
  isDragging.value = false
  selectFile(event.dataTransfer?.files[0])
}
function clearFile() {
  ++hashingRequest
  selectedFile.value = null
  hashResult.value = ''
  progress.value = 0
  isHashing.value = false
}
async function copyHash() {
  if (!hashResult.value) return
  try {
    await navigator.clipboard.writeText(hashResult.value)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1_500)
  } catch {
    errorMessage.value = 'Browser tidak mengizinkan penyalinan otomatis.'
  }
}
function downloadChecksum() {
  if (!hashResult.value) return
  const sourceName = selectedFile.value?.name ?? 'text'
  const algorithmName = props.algorithm.toLowerCase().replace('-', '')
  const blob = new Blob([`${hashResult.value}  ${sourceName}\n`], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sourceName}.${algorithmName}.txt`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1 }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />
    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"><Icon icon="mdi:arrow-left" class="size-5" /> Kembali ke Free Tools</RouterLink>
      <section class="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header class="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-8">
          <span class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Icon icon="mdi:fingerprint" class="size-4" /> Security & Privacy</span>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{{ algorithm }} Generator</h1>
          <p class="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-400">Hitung checksum {{ bitLength }}-bit dari teks atau file, lalu bandingkan dengan checksum yang diharapkan. Semua proses berjalan lokal di browser.</p>
        </header>
        <div class="p-5 sm:p-8">
          <div class="inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="Pilih jenis input">
            <button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition" :class="inputMode === 'text' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'" @click="inputMode = 'text'"><Icon icon="mdi:text-box-outline" class="size-5" /> Teks</button>
            <button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition" :class="inputMode === 'file' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'" @click="inputMode = 'file'"><Icon icon="mdi:file-outline" class="size-5" /> File</button>
          </div>

          <div class="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <label v-if="inputMode === 'text'" class="block">
                <span class="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-700 dark:text-slate-300"><span>Teks input</span><span class="font-mono text-xs font-semibold text-slate-400">{{ inputText.length }} karakter · {{ byteCount }} byte</span></span>
                <textarea v-model="inputText" rows="12" autofocus class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-500/15" placeholder="Ketik atau tempel teks di sini..."></textarea>
              </label>
              <div v-else>
                <p class="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">File input</p>
                <label class="grid min-h-72 cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition" :class="isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500'" @dragenter.prevent="isDragging = true" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
                  <input type="file" class="sr-only" @change="handleFileInput" />
                  <span v-if="!selectedFile"><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-950"><Icon icon="mdi:cloud-upload-outline" class="size-7" /></span><strong class="mt-4 block text-lg text-slate-950 dark:text-white">Pilih atau drop file</strong><span class="mt-1 block text-sm text-slate-500 dark:text-slate-400">Semua jenis dan ukuran file didukung</span></span>
                  <span v-else class="w-full min-w-0"><span class="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Icon icon="mdi:file-check-outline" class="size-7" /></span><strong class="mt-4 block truncate text-lg text-slate-950 dark:text-white" :title="selectedFile.name">{{ selectedFile.name }}</strong><span class="mt-1 block text-sm font-semibold text-slate-500">{{ formatFileSize(selectedFile.size) }}</span><span class="mt-4 inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800">Ganti file</span></span>
                </label>
                <button v-if="selectedFile" type="button" class="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10" @click="clearFile"><Icon icon="mdi:delete-outline" class="size-5" /> Hapus file</button>
              </div>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between gap-3"><p class="text-sm font-bold text-slate-700 dark:text-slate-300">Hasil {{ algorithm }}</p><span v-if="isHashing && inputMode === 'file'" class="text-xs font-bold text-blue-600 dark:text-blue-300">{{ progressPercent }}%</span></div>
              <div class="relative">
                <textarea :value="hashResult" readonly rows="7" aria-label="Hasil checksum" class="w-full resize-none rounded-2xl border border-blue-200 bg-blue-50/60 p-4 font-mono text-sm leading-7 text-blue-950 outline-none dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-100" :placeholder="isHashing ? 'Menghitung checksum...' : inputMode === 'file' && !selectedFile ? 'Pilih file untuk mulai menghitung.' : ''"></textarea>
                <div v-if="isHashing && inputMode === 'file'" class="absolute inset-x-4 bottom-4 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950"><div class="h-full rounded-full bg-blue-600 transition-[width]" :style="{ width: `${progressPercent}%` }"></div></div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-3">
                <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hashResult || isHashing" @click="copyHash"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-5" />{{ copied ? 'Tersalin' : 'Salin checksum' }}</button>
                <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" :disabled="!hashResult || isHashing" @click="downloadChecksum"><Icon icon="mdi:download-outline" class="size-5" /> Download .txt</button>
              </div>
              <label class="mt-6 block"><span class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Expected checksum</span><input v-model="expectedChecksum" type="text" spellcheck="false" autocomplete="off" class="min-h-12 w-full rounded-xl border bg-white px-4 font-mono text-sm outline-none transition focus:ring-4 dark:bg-slate-950" :class="comparison === 'match' ? 'border-emerald-500 focus:ring-emerald-100 dark:focus:ring-emerald-500/15' : comparison === 'mismatch' || comparison === 'invalid' ? 'border-rose-500 focus:ring-rose-100 dark:focus:ring-rose-500/15' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 dark:border-slate-700 dark:focus:ring-blue-500/15'" :placeholder="`Tempel checksum ${algorithm} (${bitLength / 4} karakter hex)`" /></label>
              <p v-if="comparison !== 'empty'" class="mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-bold" :class="comparison === 'match' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'" role="status"><Icon :icon="comparison === 'match' ? 'mdi:check-circle' : 'mdi:alert-circle'" class="size-5 shrink-0" />{{ comparison === 'match' ? 'Checksum cocok. File atau teks terverifikasi.' : comparison === 'invalid' ? `Format tidak valid. Masukkan ${bitLength / 4} karakter hexadecimal.` : 'Checksum tidak cocok.' }}</p>
            </div>
          </div>
          <p v-if="errorMessage" role="alert" class="mt-6 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-4 shrink-0" />{{ errorMessage }}</p>
          <p class="mt-6 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400"><Icon icon="mdi:shield-lock-outline" class="mt-0.5 size-4 shrink-0 text-blue-600" />File tidak diunggah ke server. {{ algorithm === 'MD5' ? 'MD5 cocok untuk pemeriksaan integritas, tetapi tidak aman untuk password atau penggunaan kriptografis.' : 'Checksum membantu memastikan isi tidak berubah selama penyimpanan atau pengiriman.' }}</p>
        </div>
      </section>
    </main>
  </div>
</template>
