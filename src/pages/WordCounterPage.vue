<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { analyzeText } from '@/composables/useUtilityTools'

const text = ref('')
const stats = computed(() => analyzeText(text.value))
const cards = computed(() => [
  ['Kata', stats.value.words], ['Karakter', stats.value.characters], ['Tanpa spasi', stats.value.charactersWithoutSpaces],
  ['Kalimat', stats.value.sentences], ['Paragraf', stats.value.paragraphs], ['Baris', stats.value.lines],
])
</script>

<template>
  <ToolPageShell title="Word Counter" description="Hitung kata, karakter, kalimat, paragraf, baris, dan estimasi waktu baca secara otomatis." icon="mdi:counter" category="Text">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"><article v-for="card in cards" :key="card[0]" class="rounded-2xl bg-indigo-50 p-4 text-center dark:bg-indigo-500/10"><strong class="block text-2xl font-black text-indigo-700 dark:text-indigo-300">{{ card[1] }}</strong><span class="mt-1 block text-xs font-bold text-slate-500">{{ card[0] }}</span></article></div>
    <label class="mt-5 block text-sm font-bold">Teks<textarea v-model="text" rows="18" autofocus class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 leading-7 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Ketik atau tempel teks di sini..."></textarea></label>
    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-500 dark:bg-slate-800"><span>Estimasi waktu baca: <strong class="text-slate-900 dark:text-white">{{ stats.readingMinutes }} menit</strong></span><button type="button" class="rounded-lg bg-white px-3 py-2 font-bold text-rose-600 dark:bg-slate-700" @click="text = ''">Bersihkan</button></div>
  </ToolPageShell>
</template>
