<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { generateSlug } from '@/composables/useTextDataTools'

const input = ref('Cara Membuat Website Cepat & SEO Friendly')
const separator = ref<'-' | '_'>('-')
const maxLength = ref(80)
const copied = ref(false)
const slug = computed(() => generateSlug(input.value, separator.value, maxLength.value))
async function copySlug() { await navigator.clipboard.writeText(slug.value); copied.value = true; window.setTimeout(() => (copied.value = false), 1_500) }
</script>

<template>
  <ToolPageShell title="Slug Generator" description="Buat slug URL yang bersih dan ramah SEO untuk website, CMS, artikel, dan produk." icon="mdi:link-variant-plus" category="Web">
    <label class="block text-sm font-bold">Judul atau teks<textarea v-model="input" rows="5" autofocus class="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-lg outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"></textarea></label>
    <div class="mt-5 grid gap-4 sm:grid-cols-2"><fieldset><legend class="text-sm font-bold">Separator</legend><div class="mt-2 grid grid-cols-2 gap-2"><label v-for="option in [{ v: '-', l: 'Hyphen (-)' }, { v: '_', l: 'Underscore (_)' }]" :key="option.v" class="cursor-pointer rounded-xl border p-3 text-sm font-bold" :class="separator === option.v ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'"><input v-model="separator" type="radio" :value="option.v" class="mr-2 accent-indigo-600" />{{ option.l }}</label></div></fieldset><label class="text-sm font-bold">Panjang maksimal: {{ maxLength }}<input v-model.number="maxLength" type="range" min="20" max="200" class="mt-4 w-full accent-indigo-600" /></label></div>
    <section class="mt-7 rounded-2xl bg-indigo-600 p-5 text-white"><p class="text-xs font-black uppercase tracking-wider text-indigo-200">Slug</p><div class="mt-2 flex items-center gap-3"><code class="min-w-0 flex-1 break-all text-xl font-black">{{ slug || 'slug-akan-tampil-di-sini' }}</code><button type="button" class="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-50" :disabled="!slug" aria-label="Salin slug" @click="copySlug"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-5" /></button></div><p class="mt-3 text-xs text-indigo-200">{{ slug.length }}/{{ maxLength }} karakter</p></section>
  </ToolPageShell>
</template>
