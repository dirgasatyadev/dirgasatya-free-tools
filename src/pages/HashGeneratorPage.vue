<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import { digestText, type DigestAlgorithm } from '@/composables/useCryptoTools'

const props = defineProps<{ algorithm: DigestAlgorithm }>()

const inputText = ref('')
const hashResult = ref('')
const errorMessage = ref('')
const copied = ref(false)
const isHashing = ref(false)
let hashingRequest = 0

const bitLength = computed(() => (props.algorithm === 'SHA-256' ? 256 : 512))
const byteCount = computed(() => new TextEncoder().encode(inputText.value).length)

watch(
  () => [inputText.value, props.algorithm] as const,
  async () => {
    const requestId = ++hashingRequest
    isHashing.value = true
    errorMessage.value = ''
    copied.value = false
    try {
      const result = await digestText(inputText.value, props.algorithm)
      if (requestId === hashingRequest) hashResult.value = result
    } catch (error) {
      if (requestId === hashingRequest) {
        hashResult.value = ''
        errorMessage.value = error instanceof Error ? error.message : 'Hash tidak dapat dibuat.'
      }
    } finally {
      if (requestId === hashingRequest) isHashing.value = false
    }
  },
  { immediate: true },
)

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
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />
    <main class="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"><Icon icon="mdi:arrow-left" class="size-5" aria-hidden="true" /> Kembali ke Free Tools</RouterLink>

      <section class="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header class="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-8">
          <span class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Icon icon="mdi:fingerprint" class="size-4" aria-hidden="true" /> Security & Privacy</span>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{{ algorithm }} Generator</h1>
          <p class="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-400">Buat digest {{ bitLength }}-bit dari teks menggunakan Web Crypto API. Hasil diperbarui otomatis dan semua data tetap di browser.</p>
        </header>

        <div class="grid gap-6 p-5 sm:p-8 lg:grid-cols-2">
          <label class="block"><span class="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-700 dark:text-slate-300"><span>Teks input</span><span class="font-mono text-xs font-semibold text-slate-400">{{ inputText.length }} karakter · {{ byteCount }} byte</span></span><textarea v-model="inputText" rows="14" autofocus class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:bg-slate-950 dark:focus:ring-blue-500/15" placeholder="Ketik atau tempel teks di sini..."></textarea></label>

          <div><div class="mb-2 flex items-center justify-between gap-3"><p class="text-sm font-bold text-slate-700 dark:text-slate-300">Hasil {{ algorithm }}</p><button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hashResult || isHashing" @click="copyHash"><Icon :icon="copied ? 'mdi:check' : isHashing ? 'mdi:loading' : 'mdi:content-copy'" class="size-4" :class="{ 'animate-spin': isHashing }" aria-hidden="true" />{{ copied ? 'Tersalin' : 'Salin' }}</button></div><textarea :value="hashResult" readonly rows="14" class="w-full resize-none rounded-2xl border border-blue-200 bg-blue-50/60 p-4 font-mono text-sm leading-7 text-blue-950 outline-none dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-100"></textarea><p class="mt-3 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400"><Icon icon="mdi:information-outline" class="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" />SHA adalah fungsi satu arah. Perubahan satu karakter akan menghasilkan digest yang berbeda.</p></div>
        </div>

        <p v-if="errorMessage" role="alert" class="mx-5 mb-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 sm:mx-8 sm:mb-8"><Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ errorMessage }}</p>
      </section>
    </main>
  </div>
</template>
