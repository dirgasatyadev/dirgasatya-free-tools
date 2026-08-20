<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { decodeBase64, decodeUrl, encodeBase64, encodeUrl, type UrlEncodingMode } from '@/composables/useUtilityTools'

const props = defineProps<{ type: 'base64' | 'url' }>()
const input = ref('')
const output = ref('')
const urlMode = ref<UrlEncodingMode>('component')
const errorMessage = ref('')
const copied = ref(false)
const title = computed(() => props.type === 'base64' ? 'Base64 Encoder & Decoder' : 'URL Encoder & Decoder')
const description = computed(() => props.type === 'base64' ? 'Encode dan decode teks UTF-8 ke Base64 secara lokal.' : 'Encode atau decode URL lengkap maupun komponen URL secara aman.')

function transform(mode: 'encode' | 'decode') {
  errorMessage.value = ''
  try {
    output.value = props.type === 'base64'
      ? mode === 'encode' ? encodeBase64(input.value) : decodeBase64(input.value)
      : mode === 'encode' ? encodeUrl(input.value, urlMode.value) : decodeUrl(input.value, urlMode.value)
  } catch (error) {
    output.value = ''
    errorMessage.value = error instanceof Error ? error.message : 'Input tidak dapat diproses.'
  }
}

function swap() {
  const previous = input.value
  input.value = output.value
  output.value = previous
}

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1_500)
}
</script>

<template>
  <ToolPageShell :title="title" :description="description" :icon="type === 'base64' ? 'mdi:file-code-outline' : 'mdi:link-variant'" category="Developer">
    <div v-if="type === 'url'" class="mb-5 grid max-w-md grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800"><button v-for="mode in (['component', 'full'] as const)" :key="mode" type="button" class="min-h-10 rounded-lg text-sm font-bold" :class="urlMode === mode ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'" @click="urlMode = mode">{{ mode === 'component' ? 'Komponen URL' : 'URL lengkap' }}</button></div>
    <div class="grid gap-5 lg:grid-cols-2"><label><span class="mb-2 block text-sm font-bold">Input</span><textarea v-model="input" rows="15" class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Masukkan teks..."></textarea></label><div><div class="mb-2 flex items-center justify-between"><span class="text-sm font-bold">Output</span><button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-indigo-50 px-3 text-sm font-bold text-indigo-700 disabled:opacity-40 dark:bg-indigo-500/10 dark:text-indigo-300" :disabled="!output" @click="copyOutput"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-4" /> {{ copied ? 'Tersalin' : 'Salin' }}</button></div><textarea :value="output" rows="15" readonly class="w-full resize-y rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 font-mono text-sm leading-6 outline-none dark:border-indigo-500/25 dark:bg-indigo-500/10"></textarea></div></div>
    <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
    <div class="mt-5 grid gap-2 sm:grid-cols-3"><button type="button" class="min-h-12 rounded-xl bg-indigo-600 px-4 font-bold text-white hover:bg-indigo-700" @click="transform('encode')">Encode</button><button type="button" class="min-h-12 rounded-xl bg-slate-900 px-4 font-bold text-white dark:bg-white dark:text-slate-950" @click="transform('decode')">Decode</button><button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 font-bold dark:border-slate-700" :disabled="!output" @click="swap"><Icon icon="mdi:swap-horizontal" class="size-5" /> Tukar</button></div>
  </ToolPageShell>
</template>
