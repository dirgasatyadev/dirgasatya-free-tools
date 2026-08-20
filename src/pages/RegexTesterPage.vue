<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { replaceRegex, testRegex } from '@/composables/useUtilityTools'

const pattern = ref('(dearga)\\s+(tools)')
const flags = ref('gi')
const testText = ref('Dearga Tools menyediakan banyak tools.\nDEARGA tools berjalan di browser.')
const replacement = ref('$2 by $1')
const evaluation = computed(() => {
  try {
    return {
      matches: testRegex(pattern.value, flags.value, testText.value),
      replacedText: replacement.value
        ? replaceRegex(pattern.value, flags.value, testText.value, replacement.value)
        : '',
      errorMessage: '',
    }
  } catch (error) {
    return {
      matches: [],
      replacedText: '',
      errorMessage: error instanceof Error ? error.message : 'Regex tidak valid.',
    }
  }
})
const matches = computed(() => evaluation.value.matches)
const replacedText = computed(() => evaluation.value.replacedText)
const errorMessage = computed(() => evaluation.value.errorMessage)
</script>

<template>
  <ToolPageShell title="Regex Tester" description="Uji pola JavaScript RegExp, lihat seluruh match dan capture group, serta preview hasil replace." icon="mdi:regex" category="Developer">
    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]"><label class="text-sm font-bold">Pattern<span class="mt-2 flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono focus-within:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"><span class="text-slate-400">/</span><input v-model="pattern" class="min-w-0 flex-1 bg-transparent px-1 outline-none" /><span class="text-slate-400">/</span></span></label><label class="text-sm font-bold">Flags<input v-model="flags" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" placeholder="gim" /></label></div>
    <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
    <div class="mt-5 grid gap-5 lg:grid-cols-2"><label class="text-sm font-bold">Teks uji<textarea v-model="testText" rows="14" class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label><div><div class="mb-2 flex items-center justify-between"><span class="text-sm font-bold">Matches</span><span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{{ matches.length }}</span></div><div class="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:divide-slate-800 dark:border-slate-700"><div v-if="!matches.length" class="p-5 text-center text-sm font-semibold text-slate-400">Tidak ada match.</div><article v-for="(match, index) in matches" :key="`${match.index}-${index}`" class="p-3"><div class="flex gap-3"><span class="text-xs font-black text-slate-400">#{{ index + 1 }}</span><code class="min-w-0 flex-1 break-all text-sm text-indigo-700 dark:text-indigo-300">{{ match.value || '(empty)' }}</code><span class="text-xs font-bold text-slate-400">index {{ match.index }}</span></div><div v-if="match.groups.length" class="mt-2 flex flex-wrap gap-1.5"><code v-for="(group, groupIndex) in match.groups" :key="groupIndex" class="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">${{ groupIndex + 1 }}: {{ group }}</code></div></article></div></div></div>
    <div class="mt-5 grid gap-4 lg:grid-cols-2"><label class="text-sm font-bold">Replacement<input v-model="replacement" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" placeholder="$1" /></label><div><p class="mb-2 text-sm font-bold">Preview replace</p><pre class="min-h-11 whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-sm leading-6 text-emerald-300">{{ replacedText }}</pre></div></div>
  </ToolPageShell>
</template>
