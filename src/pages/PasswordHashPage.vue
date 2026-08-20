<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import {
  defaultArgon2idOptions,
  encodeArgon2id,
  encodeBcrypt,
  verifyArgon2id,
  verifyBcrypt,
  type PasswordHashAlgorithm,
} from '@/composables/useCryptoTools'

const props = defineProps<{ algorithm: PasswordHashAlgorithm }>()

const mode = ref<'encode' | 'verify'>('encode')
const password = ref('')
const verifyPassword = ref('')
const verifyHash = ref('')
const generatedHash = ref('')
const costFactor = ref(10)
const memorySize = ref(defaultArgon2idOptions.memorySize)
const iterations = ref(defaultArgon2idOptions.iterations)
const parallelism = ref(defaultArgon2idOptions.parallelism)
const hashLength = ref(defaultArgon2idOptions.hashLength)
const isProcessing = ref(false)
const showPasswords = ref(false)
const errorMessage = ref('')
const verificationResult = ref<boolean | null>(null)
const copied = ref(false)

const isBcrypt = computed(() => props.algorithm === 'bcrypt')
const toolName = computed(() => (isBcrypt.value ? 'Bcrypt Encoder & Decoder' : 'Argon2id Encoder & Decoder'))
const toolIcon = computed(() => (isBcrypt.value ? 'mdi:shield-key-outline' : 'mdi:shield-lock-outline'))
const accentClasses = computed(() =>
  isBcrypt.value
    ? 'bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400'
    : 'bg-cyan-700 hover:bg-cyan-800 disabled:bg-cyan-500',
)

watch([mode, verifyPassword, verifyHash], () => {
  verificationResult.value = null
  errorMessage.value = ''
})

async function createHash() {
  if (isProcessing.value) return
  isProcessing.value = true
  errorMessage.value = ''
  generatedHash.value = ''
  copied.value = false

  try {
    generatedHash.value = isBcrypt.value
      ? await encodeBcrypt(password.value, costFactor.value)
      : await encodeArgon2id(password.value, {
          memorySize: memorySize.value,
          iterations: iterations.value,
          parallelism: parallelism.value,
          hashLength: hashLength.value,
        })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Hash tidak dapat dibuat.'
  } finally {
    isProcessing.value = false
  }
}

async function verifyHashValue() {
  if (isProcessing.value) return
  isProcessing.value = true
  errorMessage.value = ''
  verificationResult.value = null

  try {
    verificationResult.value = isBcrypt.value
      ? await verifyBcrypt(verifyPassword.value, verifyHash.value)
      : await verifyArgon2id(verifyPassword.value, verifyHash.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Hash tidak dapat diverifikasi.'
  } finally {
    isProcessing.value = false
  }
}

async function copyHash() {
  if (!generatedHash.value) return
  try {
    await navigator.clipboard.writeText(generatedHash.value)
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
          <span class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon :icon="toolIcon" class="size-4" aria-hidden="true" /> Security & Privacy</span>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{{ toolName }}</h1>
          <p class="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-400">Buat password hash dengan salt acak atau verifikasi kecocokan password terhadap encoded hash, seluruhnya langsung di browser.</p>
          <div class="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"><Icon icon="mdi:information-outline" class="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p>{{ isBcrypt ? 'Bcrypt' : 'Argon2id' }} adalah fungsi satu arah dan tidak dapat didekripsi. Mode Decoder di bawah melakukan verifikasi, bukan mengembalikan password asli.</p></div>
        </header>

        <div class="p-5 sm:p-8">
          <div class="grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800" role="tablist" aria-label="Mode password hash">
            <button type="button" role="tab" class="min-h-11 rounded-xl px-4 font-bold transition" :class="mode === 'encode' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'" :aria-selected="mode === 'encode'" @click="mode = 'encode'"><Icon icon="mdi:lock-plus-outline" class="mr-2 inline size-5" aria-hidden="true" />Encoder</button>
            <button type="button" role="tab" class="min-h-11 rounded-xl px-4 font-bold transition" :class="mode === 'verify' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'" :aria-selected="mode === 'verify'" @click="mode = 'verify'"><Icon icon="mdi:check-decagram-outline" class="mr-2 inline size-5" aria-hidden="true" />Decoder / Verify</button>
          </div>

          <form v-if="mode === 'encode'" class="mt-6 space-y-5" @submit.prevent="createHash">
            <label class="block"><span class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Password</span><span class="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-indigo-500/15"><input v-model="password" :type="showPasswords ? 'text' : 'password'" autocomplete="new-password" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="Masukkan password yang akan di-hash" /><button type="button" class="grid size-8 place-items-center text-slate-400 hover:text-indigo-600" :aria-label="showPasswords ? 'Sembunyikan password' : 'Tampilkan password'" @click="showPasswords = !showPasswords"><Icon :icon="showPasswords ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="size-5" aria-hidden="true" /></button></span></label>

            <div v-if="isBcrypt" class="grid gap-2 sm:max-w-xs"><label for="bcrypt-cost" class="text-sm font-bold text-slate-700 dark:text-slate-300">Cost factor</label><input id="bcrypt-cost" v-model.number="costFactor" type="number" min="4" max="14" step="1" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-violet-500/15" /><p class="text-xs text-slate-500 dark:text-slate-400">Rentang 4–14. Nilai lebih tinggi membutuhkan waktu lebih lama.</p></div>

            <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label class="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">Memory (KiB)<input v-model.number="memorySize" type="number" min="8" max="262144" step="1" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-cyan-500/15" /></label>
              <label class="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">Iterations<input v-model.number="iterations" type="number" min="1" max="20" step="1" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-cyan-500/15" /></label>
              <label class="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">Parallelism<input v-model.number="parallelism" type="number" min="1" max="8" step="1" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-cyan-500/15" /></label>
              <label class="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">Hash length<input v-model.number="hashLength" type="number" min="16" max="64" step="1" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-cyan-500/15" /></label>
            </div>

            <button type="submit" class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-bold text-white transition disabled:cursor-wait" :class="accentClasses" :disabled="isProcessing"><Icon :icon="isProcessing ? 'mdi:loading' : 'mdi:lock-outline'" class="size-5" :class="{ 'animate-spin': isProcessing }" aria-hidden="true" />{{ isProcessing ? 'Membuat hash...' : `Encode dengan ${isBcrypt ? 'Bcrypt' : 'Argon2id'}` }}</button>

            <div v-if="generatedHash" class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10"><div class="flex items-center justify-between gap-3"><p class="font-bold text-emerald-800 dark:text-emerald-300">Encoded hash</p><button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700" @click="copyHash"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-4" aria-hidden="true" />{{ copied ? 'Tersalin' : 'Salin' }}</button></div><textarea :value="generatedHash" readonly rows="4" class="mt-3 w-full resize-none rounded-xl border border-emerald-200 bg-white p-3 font-mono text-sm leading-6 text-slate-800 outline-none dark:border-emerald-500/25 dark:bg-slate-950 dark:text-slate-200"></textarea></div>
          </form>

          <form v-else class="mt-6 space-y-5" @submit.prevent="verifyHashValue">
            <label class="block"><span class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Password yang diuji</span><input v-model="verifyPassword" :type="showPasswords ? 'text' : 'password'" autocomplete="current-password" class="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-500/15" placeholder="Masukkan password" /></label>
            <label class="block"><span class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Encoded hash {{ isBcrypt ? 'Bcrypt' : 'Argon2id' }}</span><textarea v-model="verifyHash" rows="5" class="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-500/15" :placeholder="isBcrypt ? '$2a$10$...' : '$argon2id$v=19$...'"></textarea></label>
            <button type="submit" class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-bold text-white transition disabled:cursor-wait" :class="accentClasses" :disabled="isProcessing"><Icon :icon="isProcessing ? 'mdi:loading' : 'mdi:shield-check-outline'" class="size-5" :class="{ 'animate-spin': isProcessing }" aria-hidden="true" />{{ isProcessing ? 'Memverifikasi...' : 'Verifikasi password' }}</button>
            <div v-if="verificationResult !== null" role="status" class="flex items-center gap-3 rounded-2xl p-4 font-bold" :class="verificationResult ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'"><Icon :icon="verificationResult ? 'mdi:check-circle' : 'mdi:close-circle'" class="size-6 shrink-0" aria-hidden="true" />{{ verificationResult ? 'Password cocok dengan hash.' : 'Password tidak cocok dengan hash.' }}</div>
          </form>

          <p v-if="errorMessage" role="alert" class="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><Icon icon="mdi:alert-circle-outline" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ errorMessage }}</p>
        </div>
      </section>
    </main>
  </div>
</template>
