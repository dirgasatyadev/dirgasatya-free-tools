<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { convertTextCases, type CaseResultKey } from '@/composables/useTextDataTools'

const input = ref('dearga free tools example')
const copied = ref<CaseResultKey | ''>('')
const results = computed(() => convertTextCases(input.value))
const labels: { key: CaseResultKey; description: string }[] = [
  { key: 'camelCase', description: 'JavaScript variable dan property' }, { key: 'PascalCase', description: 'Class dan component' },
  { key: 'snake_case', description: 'Database dan Python' }, { key: 'kebab-case', description: 'URL dan CSS class' },
  { key: 'CONSTANT_CASE', description: 'Konstanta dan environment variable' },
]
async function copy(key: CaseResultKey) { await navigator.clipboard.writeText(results.value[key]); copied.value = key; window.setTimeout(() => (copied.value = ''), 1_500) }
</script>

<template>
  <ToolPageShell title="Case Converter" description="Ubah teks menjadi camelCase, PascalCase, snake_case, kebab-case, dan CONSTANT_CASE sekaligus." icon="mdi:format-letter-case" category="Text">
    <label class="block text-sm font-bold">Teks input<textarea v-model="input" rows="6" autofocus class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-lg leading-7 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Ketik atau tempel teks..."></textarea></label>
    <div class="mt-6 grid gap-3 sm:grid-cols-2"><article v-for="item in labels" :key="item.key" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="text-xs font-black uppercase tracking-wider text-slate-400">{{ item.key }}</p><code class="mt-2 block break-all text-base font-bold text-slate-950 dark:text-white">{{ results[item.key] || '—' }}</code><p class="mt-2 text-xs text-slate-400">{{ item.description }}</p></div><button type="button" class="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 dark:bg-indigo-500/10 dark:text-indigo-300" :disabled="!results[item.key]" :aria-label="`Salin ${item.key}`" @click="copy(item.key)"><Icon :icon="copied === item.key ? 'mdi:check' : 'mdi:content-copy'" class="size-5" /></button></div></article></div>
  </ToolPageShell>
</template>
