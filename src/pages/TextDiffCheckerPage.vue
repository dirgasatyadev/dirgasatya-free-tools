<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { diffLines } from '@/composables/useTextDataTools'

const before = ref('Judul lama\nBaris yang sama\nTeks yang akan dihapus')
const after = ref('Judul baru\nBaris yang sama\nTeks tambahan')
const result = computed(() => {
  try { return { rows: diffLines(before.value.replace(/\r\n/g, '\n'), after.value.replace(/\r\n/g, '\n')), error: '' } }
  catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Diff tidak dapat dibuat.' } }
})
const summary = computed(() => ({
  added: result.value.rows.filter((row) => row.type === 'added').length,
  deleted: result.value.rows.filter((row) => row.type === 'deleted').length,
  changed: result.value.rows.filter((row) => row.type === 'changed').length,
}))
function swap() { const current = before.value; before.value = after.value; after.value = current }
const rowClass = { unchanged: '', added: 'bg-emerald-50 dark:bg-emerald-500/10', deleted: 'bg-rose-50 dark:bg-rose-500/10', changed: 'bg-amber-50 dark:bg-amber-500/10' }
</script>

<template>
  <ToolPageShell title="Text Diff Checker" description="Bandingkan dua teks secara side-by-side dengan highlight baris ditambahkan, dihapus, dan diubah." icon="mdi:file-compare" category="Text">
    <div class="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center"><label class="block text-sm font-bold">Teks lama<textarea v-model="before" rows="10" spellcheck="false" class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label><button type="button" class="grid size-11 place-items-center justify-self-center rounded-full border border-slate-200 text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-500/10" aria-label="Tukar teks" @click="swap"><Icon icon="mdi:swap-horizontal" class="size-6 lg:rotate-90" /></button><label class="block text-sm font-bold">Teks baru<textarea v-model="after" rows="10" spellcheck="false" class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label></div>
    <div class="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span class="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">+ {{ summary.added }} ditambahkan</span><span class="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">− {{ summary.deleted }} dihapus</span><span class="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">~ {{ summary.changed }} diubah</span></div>
    <section class="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><header class="grid grid-cols-2 border-b border-slate-200 bg-slate-100 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800"><span class="p-3">Teks lama</span><span class="border-l border-slate-200 p-3 dark:border-slate-700">Teks baru</span></header><div class="max-h-[36rem] overflow-auto"><div v-for="(row, index) in result.rows" :key="index" class="grid min-w-[44rem] grid-cols-2 border-b border-slate-100 font-mono text-sm last:border-0 dark:border-slate-800"><div class="flex min-w-0" :class="rowClass[row.type === 'added' ? 'unchanged' : row.type]"><span class="w-11 shrink-0 select-none border-r border-black/5 px-2 py-2 text-right text-xs text-slate-400">{{ row.leftNumber ?? '' }}</span><pre class="min-w-0 flex-1 whitespace-pre-wrap break-words px-3 py-2">{{ row.left }}</pre></div><div class="flex min-w-0 border-l border-slate-200 dark:border-slate-700" :class="rowClass[row.type === 'deleted' ? 'unchanged' : row.type]"><span class="w-11 shrink-0 select-none border-r border-black/5 px-2 py-2 text-right text-xs text-slate-400">{{ row.rightNumber ?? '' }}</span><pre class="min-w-0 flex-1 whitespace-pre-wrap break-words px-3 py-2">{{ row.right }}</pre></div></div></div></section>
    <p v-if="result.error" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{{ result.error }}</p>
  </ToolPageShell>
</template>
