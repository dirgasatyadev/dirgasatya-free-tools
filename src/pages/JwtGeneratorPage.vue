<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import { generateJwt, type JwtAlgorithm } from '@/composables/useCryptoTools'

const algorithm = ref<JwtAlgorithm>('HS256')
const algorithms: JwtAlgorithm[] = ['HS256', 'HS384', 'HS512']
const headerJson = ref('{\n  "typ": "JWT"\n}')
const payloadJson = ref(`{\n  "sub": "1234567890",\n  "name": "Dearga User",\n  "iat": ${Math.floor(Date.now() / 1000)}\n}`)
const secret = ref('')
const token = ref('')
const showSecret = ref(false)
const isGenerating = ref(false)
const errorMessage = ref('')
const copied = ref(false)

async function createToken() {
  if (isGenerating.value) return
  isGenerating.value = true
  errorMessage.value = ''
  token.value = ''
  copied.value = false
  try {
    token.value = await generateJwt(headerJson.value, payloadJson.value, secret.value, algorithm.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'JWT tidak dapat dibuat.'
  } finally {
    isGenerating.value = false
  }
}

async function copyToken() {
  if (!token.value) return
  try {
    await navigator.clipboard.writeText(token.value)
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
    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"><Icon icon="mdi:arrow-left" class="size-5" aria-hidden="true" /> Kembali ke Free Tools</RouterLink>

      <section class="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header class="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-8"><span class="inline-flex items-center gap-2 rounded-full bg-fuchsia-50 px-3 py-1.5 text-sm font-bold text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300"><Icon icon="mdi:key-chain-variant" class="size-4" aria-hidden="true" /> Developer</span><h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">JWT Generator</h1><p class="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-400">Buat JSON Web Token bertanda tangan HMAC langsung di browser. Header, payload, secret, dan token tidak dikirim ke server.</p></header>

        <form class="p-5 sm:p-8" @submit.prevent="createToken">
          <fieldset><legend class="text-sm font-bold text-slate-700 dark:text-slate-300">Algoritma HMAC</legend><div class="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800"><button v-for="item in algorithms" :key="item" type="button" class="min-h-11 rounded-xl px-3 font-bold transition" :class="algorithm === item ? 'bg-fuchsia-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-700'" :aria-pressed="algorithm === item" @click="algorithm = item">{{ item }}</button></div></fieldset>

          <div class="mt-6 grid gap-5 lg:grid-cols-2">
            <label class="block"><span class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Header JSON</span><textarea v-model="headerJson" rows="8" spellcheck="false" class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-fuchsia-500/15"></textarea><span class="mt-2 block text-xs text-slate-500 dark:text-slate-400">Nilai <code>alg</code> dan <code>typ</code> disesuaikan otomatis.</span></label>
            <label class="block"><span class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Payload JSON</span><textarea v-model="payloadJson" rows="8" spellcheck="false" class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-fuchsia-500/15"></textarea><span class="mt-2 block text-xs text-slate-500 dark:text-slate-400">Tambahkan claim seperti <code>exp</code>, <code>iss</code>, atau <code>aud</code> sesuai kebutuhan.</span></label>
          </div>

          <label class="mt-5 block"><span class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Secret</span><span class="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-fuchsia-500 focus-within:ring-4 focus-within:ring-fuchsia-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-fuchsia-500/15"><input v-model="secret" :type="showSecret ? 'text' : 'password'" autocomplete="off" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="Masukkan secret untuk menandatangani token" /><button type="button" class="grid size-8 place-items-center text-slate-400 hover:text-fuchsia-600" :aria-label="showSecret ? 'Sembunyikan secret' : 'Tampilkan secret'" @click="showSecret = !showSecret"><Icon :icon="showSecret ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="size-5" aria-hidden="true" /></button></span></label>

          <button type="submit" class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 font-bold text-white transition hover:bg-fuchsia-700 disabled:cursor-wait disabled:bg-fuchsia-400" :disabled="isGenerating"><Icon :icon="isGenerating ? 'mdi:loading' : 'mdi:key-plus'" class="size-5" :class="{ 'animate-spin': isGenerating }" aria-hidden="true" />{{ isGenerating ? 'Membuat token...' : 'Generate JWT' }}</button>

          <p v-if="errorMessage" role="alert" class="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ errorMessage }}</p>

          <div v-if="token" class="mt-6 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/10"><div class="flex items-center justify-between gap-3"><p class="font-bold text-fuchsia-800 dark:text-fuchsia-300">Generated JWT</p><button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-fuchsia-600 px-3 text-sm font-bold text-white hover:bg-fuchsia-700" @click="copyToken"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-4" aria-hidden="true" />{{ copied ? 'Tersalin' : 'Salin' }}</button></div><textarea :value="token" readonly rows="7" class="mt-3 w-full resize-y break-all rounded-xl border border-fuchsia-200 bg-white p-3 font-mono text-sm leading-6 text-slate-800 outline-none dark:border-fuchsia-500/25 dark:bg-slate-950 dark:text-slate-200"></textarea><p class="mt-3 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400"><Icon icon="mdi:shield-alert-outline" class="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />JWT hanya ditandatangani, bukan dienkripsi. Jangan masukkan data rahasia ke dalam payload.</p></div>
        </form>
      </section>
    </main>
  </div>
</template>
