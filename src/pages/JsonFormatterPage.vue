<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { formatJson, minifyJson } from '@/composables/useUtilityTools'

const input = ref('{"name":"Dearga","tools":["JSON","CSV"],"active":true}')
const output = ref('')
const indent = ref<2 | 4 | '\t'>(2)
const errorMessage = ref('')
const copied = ref(false)

function process(mode: 'format' | 'minify') {
  errorMessage.value = ''
  try {
    output.value = mode === 'format' ? formatJson(input.value, indent.value) : minifyJson(input.value)
  } catch (error) {
    output.value = ''
    errorMessage.value = error instanceof Error ? error.message : 'JSON tidak valid.'
  }
}

async function copyOutput() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1_500)
}
</script>

<template>
  <ToolPageShell title="JSON Formatter & Validator" description="Format, minify, dan validasi JSON dengan pesan error yang jelas. Data diproses sepenuhnya di browser." icon="mdi:code-json" category="Developer">
    <div class="flex flex-wrap items-center gap-2"><select v-model="indent" class="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"><option :value="2">Indent 2 spasi</option><option :value="4">Indent 4 spasi</option><option value="\t">Indent tab</option></select><button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white hover:bg-indigo-700" @click="process('format')"><Icon icon="mdi:format-align-left" class="size-5" /> Format & validasi</button><button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white dark:bg-white dark:text-slate-950" @click="process('minify')"><Icon icon="mdi:arrow-collapse-horizontal" class="size-5" /> Minify</button></div>
    <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" role="alert">{{ errorMessage }}</p>
    <div class="mt-5 grid gap-5 lg:grid-cols-2"><label class="block"><span class="mb-2 block text-sm font-bold">JSON input</span><textarea v-model="input" rows="18" spellcheck="false" class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label><div><div class="mb-2 flex items-center justify-between"><span class="text-sm font-bold">Hasil</span><button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-indigo-50 px-3 text-sm font-bold text-indigo-700 disabled:opacity-40 dark:bg-indigo-500/10 dark:text-indigo-300" :disabled="!output" @click="copyOutput"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-4" /> {{ copied ? 'Tersalin' : 'Salin' }}</button></div><textarea :value="output" rows="18" readonly class="w-full resize-y rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 font-mono text-sm leading-6 outline-none dark:border-indigo-500/25 dark:bg-indigo-500/10"></textarea></div></div>
  </ToolPageShell>
</template>
