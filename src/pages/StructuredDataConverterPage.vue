<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { jsonToXml, jsonToYaml, xmlToJson, yamlToJson } from '@/composables/useTextDataTools'

const props = defineProps<{ type: 'yaml' | 'xml' }>()
const direction = ref<'to-json' | 'from-json'>('to-json')
const input = ref('')
const copied = ref(false)
const formatName = computed(() => props.type.toUpperCase())
const title = computed(() => `${formatName.value} ↔ JSON Converter`)
const sourceLabel = computed(() => direction.value === 'to-json' ? formatName.value : 'JSON')
const targetLabel = computed(() => direction.value === 'to-json' ? 'JSON' : formatName.value)
const result = computed(() => {
  try {
    const output = direction.value === 'to-json'
      ? props.type === 'yaml' ? yamlToJson(input.value) : xmlToJson(input.value)
      : props.type === 'yaml' ? jsonToYaml(input.value) : jsonToXml(input.value)
    return { output, error: '' }
  } catch (error) { return { output: '', error: error instanceof Error ? error.message : 'Konversi gagal.' } }
})
function sample() {
  input.value = direction.value === 'to-json'
    ? props.type === 'yaml' ? 'site: Dearga Free Tools\nactive: true\ntools:\n  - ZIP Creator\n  - YAML Converter\n' : '<site active="true">\n  <name>Dearga Free Tools</name>\n  <tool>ZIP Creator</tool>\n  <tool>XML Converter</tool>\n</site>'
    : props.type === 'yaml' ? '{\n  "site": "Dearga Free Tools",\n  "active": true,\n  "tools": ["ZIP Creator", "YAML Converter"]\n}' : '{\n  "site": {\n    "@active": "true",\n    "name": "Dearga Free Tools",\n    "tool": ["ZIP Creator", "XML Converter"]\n  }\n}'
}
function swap() { direction.value = direction.value === 'to-json' ? 'from-json' : 'to-json'; sample() }
async function copyOutput() { if (!result.value.output) return; await navigator.clipboard.writeText(result.value.output); copied.value = true; window.setTimeout(() => (copied.value = false), 1_500) }
function downloadOutput() {
  if (!result.value.output) return
  const extension = targetLabel.value.toLowerCase() === 'yaml' ? 'yaml' : targetLabel.value.toLowerCase()
  const url = URL.createObjectURL(new Blob([result.value.output], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = `converted.${extension}`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
watch(() => props.type, sample, { immediate: true })
</script>

<template>
  <ToolPageShell :title="title" :description="`Konversikan ${formatName} dan JSON dua arah dengan validasi otomatis, salin, dan download hasil.`" icon="mdi:file-swap-outline" category="Converter">
    <div class="flex flex-wrap items-center justify-between gap-3"><div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button type="button" class="min-h-10 rounded-lg px-4 text-sm font-bold" :class="direction === 'to-json' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'" @click="direction = 'to-json'; sample()">{{ formatName }} → JSON</button><button type="button" class="min-h-10 rounded-lg px-4 text-sm font-bold" :class="direction === 'from-json' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'" @click="direction = 'from-json'; sample()">JSON → {{ formatName }}</button></div><button type="button" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-slate-700" @click="swap"><Icon icon="mdi:swap-horizontal" class="size-5" />Tukar arah</button></div>
    <div class="mt-6 grid gap-5 lg:grid-cols-2"><label class="block"><span class="mb-2 flex items-center justify-between text-sm font-bold"><span>Input {{ sourceLabel }}</span><button type="button" class="text-xs text-indigo-600 dark:text-indigo-300" @click.prevent="sample">Isi contoh</button></span><textarea v-model="input" rows="19" spellcheck="false" class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label><div><div class="mb-2 flex items-center justify-between"><span class="text-sm font-bold">Output {{ targetLabel }}</span><div class="flex gap-1"><button type="button" class="grid size-9 place-items-center rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:hover:bg-indigo-500/10" :disabled="!result.output" aria-label="Salin output" @click="copyOutput"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-5" /></button><button type="button" class="grid size-9 place-items-center rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:hover:bg-indigo-500/10" :disabled="!result.output" aria-label="Download output" @click="downloadOutput"><Icon icon="mdi:download-outline" class="size-5" /></button></div></div><textarea :value="result.output" readonly rows="19" spellcheck="false" class="w-full resize-y rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 font-mono text-sm leading-6 outline-none dark:border-indigo-500/25 dark:bg-indigo-500/10"></textarea></div></div>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ result.error }}</p>
    <p v-if="type === 'xml'" class="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">Atribut XML ditulis sebagai <code>@nama</code>, teks campuran sebagai <code>#text</code>, dan elemen berulang sebagai array JSON.</p>
  </ToolPageShell>
</template>
