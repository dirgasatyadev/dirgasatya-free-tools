<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { decodeJwt, getJwtTimeStatus, verifyJwt, type DecodedJwt } from '@/composables/useUtilityTools'

const token = ref('')
const secret = ref('')
const decoded = ref<DecodedJwt | null>(null)
const verification = ref<'idle' | 'valid' | 'invalid'>('idle')
const errorMessage = ref('')
const isVerifying = ref(false)
const timeStatus = computed(() => decoded.value ? getJwtTimeStatus(decoded.value.payload) : null)

function decode() {
  try {
    decoded.value = decodeJwt(token.value)
    verification.value = 'idle'
    errorMessage.value = ''
  } catch (error) {
    decoded.value = null
    errorMessage.value = error instanceof Error ? error.message : 'JWT tidak valid.'
  }
}

async function verify() {
  isVerifying.value = true
  errorMessage.value = ''
  try {
    decoded.value = decodeJwt(token.value)
    verification.value = await verifyJwt(token.value, secret.value) ? 'valid' : 'invalid'
  } catch (error) {
    verification.value = 'idle'
    errorMessage.value = error instanceof Error ? error.message : 'JWT gagal diverifikasi.'
  } finally {
    isVerifying.value = false
  }
}
</script>

<template>
  <ToolPageShell title="JWT Decoder & Verifier" description="Decode header dan payload JWT serta verifikasi signature HMAC HS256, HS384, atau HS512 secara lokal." icon="mdi:key-chain" category="Developer">
    <label class="block text-sm font-bold">JWT token<textarea v-model="token" rows="7" spellcheck="false" class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" placeholder="eyJhbGciOiJIUzI1NiJ9..."></textarea></label>
    <div class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><input v-model="secret" type="password" autocomplete="off" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Secret untuk verifikasi (opsional saat decode)" /><button type="button" class="min-h-12 rounded-xl border border-indigo-200 px-5 font-bold text-indigo-700 dark:border-indigo-500/30 dark:text-indigo-300" @click="decode">Decode</button><button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50" :disabled="isVerifying" @click="verify"><Icon :icon="isVerifying ? 'mdi:loading' : 'mdi:shield-check-outline'" class="size-5" :class="{ 'animate-spin': isVerifying }" /> Verify</button></div>
    <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
    <div v-if="decoded" class="mt-5 space-y-4"><div v-if="verification !== 'idle'" class="flex items-center gap-2 rounded-xl p-3 font-bold" :class="verification === 'valid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'"><Icon :icon="verification === 'valid' ? 'mdi:check-decagram' : 'mdi:close-octagon-outline'" class="size-5" /> Signature {{ verification === 'valid' ? 'valid' : 'tidak valid' }}</div><div v-if="timeStatus?.isExpired || timeStatus?.isNotActive" class="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{{ timeStatus.isExpired ? 'Token sudah kedaluwarsa.' : 'Token belum aktif berdasarkan claim nbf.' }}</div><div class="grid gap-4 lg:grid-cols-2"><div><p class="mb-2 text-sm font-bold">Header</p><pre class="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-emerald-300">{{ JSON.stringify(decoded.header, null, 2) }}</pre></div><div><p class="mb-2 text-sm font-bold">Payload</p><pre class="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-sky-300">{{ JSON.stringify(decoded.payload, null, 2) }}</pre></div></div></div>
  </ToolPageShell>
</template>
