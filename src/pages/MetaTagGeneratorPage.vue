<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { generateMetaTags, type MetaTagConfig } from '@/composables/useUtilityTools'

const config = reactive<MetaTagConfig>({
  title: 'Dearga Free Tools',
  description: 'Kumpulan free tools yang berjalan langsung di browser.',
  url: 'https://example.com',
  imageUrl: 'https://example.com/og.png',
  siteName: 'Dearga',
  author: 'Dearga',
  keywords: 'free tools, developer tools',
  robots: 'index, follow',
  twitterCard: 'summary_large_image',
})
const code = computed(() => generateMetaTags(config))
const copied = ref(false)

async function copyCode() {
  await navigator.clipboard.writeText(code.value)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1_500)
}
</script>

<template>
  <ToolPageShell title="Meta Tag Generator" description="Buat meta tag SEO, Open Graph, dan Twitter Card dengan preview serta kode siap salin." icon="mdi:tag-text-outline" category="Web">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div class="grid gap-4 sm:grid-cols-2"><label class="text-sm font-bold sm:col-span-2">Judul halaman<input v-model="config.title" maxlength="120" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold sm:col-span-2">Deskripsi<textarea v-model="config.description" maxlength="300" rows="3" class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label><label class="text-sm font-bold sm:col-span-2">URL halaman<input v-model="config.url" type="url" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold sm:col-span-2">URL gambar sosial<input v-model="config.imageUrl" type="url" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Nama website<input v-model="config.siteName" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Author<input v-model="config.author" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold sm:col-span-2">Keywords<input v-model="config.keywords" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><label class="text-sm font-bold">Robots<select v-model="config.robots" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none dark:border-slate-700 dark:bg-slate-950"><option>index, follow</option><option>noindex, follow</option><option>index, nofollow</option><option>noindex, nofollow</option></select></label><label class="text-sm font-bold">Twitter card<select v-model="config.twitterCard" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none dark:border-slate-700 dark:bg-slate-950"><option value="summary_large_image">Large image</option><option value="summary">Summary</option></select></label></div><div><div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><p class="text-xs font-black uppercase tracking-wider text-slate-400">Social preview</p><div class="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div class="aspect-[1.91/1] bg-slate-100 dark:bg-slate-800"><img v-if="config.imageUrl" :src="config.imageUrl" alt="Preview meta image" class="h-full w-full object-cover" /></div><div class="p-4"><p class="text-xs font-bold uppercase text-slate-400">{{ config.siteName || 'Website' }}</p><h2 class="mt-1 text-lg font-black">{{ config.title || 'Judul halaman' }}</h2><p class="mt-1 line-clamp-2 text-sm text-slate-500">{{ config.description || 'Deskripsi halaman' }}</p></div></div></div><div class="mt-4 rounded-2xl bg-slate-950 p-4"><div class="flex items-center justify-between"><span class="text-xs font-black uppercase tracking-wider text-slate-400">HTML</span><button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-bold text-white" @click="copyCode"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-4" /> {{ copied ? 'Tersalin' : 'Salin kode' }}</button></div><pre class="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-all text-xs leading-6 text-emerald-300">{{ code }}</pre></div></div></div>
  </ToolPageShell>
</template>
