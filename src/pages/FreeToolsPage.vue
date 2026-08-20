<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import { useTools } from '@/composables/useTools'
import { tools } from '@/data/tools'
import type { ToolFilterCategory } from '@/type/tool'

const { query, selectedCategory, filteredTools, resetFilters } = useTools()

const categoryOptions: { label: ToolFilterCategory; icon: string }[] = [
  { label: 'Semua', icon: 'mdi:view-grid-outline' },
  { label: 'Developer', icon: 'mdi:code-tags' },
  { label: 'Teks', icon: 'mdi:text-box-outline' },
  { label: 'Gambar', icon: 'mdi:image-outline' },
  { label: 'Produktivitas', icon: 'mdi:lightning-bolt-outline' },
]

function getCategoryCount(category: ToolFilterCategory) {
  return category === 'Semua' ? tools.length : tools.filter((tool) => tool.category === category).length
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />

    <main class="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div class="max-w-2xl">
        <p class="font-bold text-indigo-600 dark:text-indigo-400">Koleksi utilitas</p>
        <h1 class="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Free Tools</h1>
        <p class="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-400">
          Temukan alat bantu gratis untuk kebutuhan developer, teks, gambar, dan produktivitas.
        </p>
      </div>

      <section class="mt-10 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5" aria-label="Filter free tools">
        <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-slate-800 dark:focus-within:ring-indigo-500/15">
          <Icon icon="mdi:magnify" class="size-6 text-slate-400" aria-hidden="true" />
          <span class="sr-only">Cari free tool</span>
          <input v-model="query" type="search" placeholder="Cari nama atau kategori tool..." class="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500" />
          <button v-if="query" type="button" class="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white" aria-label="Hapus pencarian" @click="query = ''">
            <Icon icon="mdi:close" class="size-5" aria-hidden="true" />
          </button>
        </label>

        <div class="mt-4 flex items-center gap-3 overflow-x-auto pb-1" role="group" aria-label="Filter kategori">
          <button
            v-for="category in categoryOptions"
            :key="category.label"
            type="button"
            class="inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition"
            :class="selectedCategory === category.label ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-950/50' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-indigo-300'"
            :aria-pressed="selectedCategory === category.label"
            @click="selectedCategory = category.label"
          >
            <Icon :icon="category.icon" class="size-5" aria-hidden="true" />
            {{ category.label }}
            <span class="rounded-md px-1.5 py-0.5 text-xs" :class="selectedCategory === category.label ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'">
              {{ getCategoryCount(category.label) }}
            </span>
          </button>
        </div>
      </section>

      <div class="mt-8 flex items-center justify-between gap-4">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Menampilkan <span class="font-bold text-slate-900 dark:text-white">{{ filteredTools.length }}</span> tool
          <span v-if="selectedCategory !== 'Semua'"> dalam kategori <span class="font-bold text-indigo-700 dark:text-indigo-400">{{ selectedCategory }}</span></span>
        </p>
        <button v-if="query || selectedCategory !== 'Semua'" type="button" class="text-sm font-semibold text-indigo-600 hover:text-indigo-800" @click="resetFilters">
          Reset filter
        </button>
      </div>

      <div v-if="filteredTools.length" class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" />
      </div>

      <div v-else class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <Icon icon="mdi:database-search-outline" class="mx-auto size-10 text-slate-400" aria-hidden="true" />
        <p class="mt-4 text-lg font-bold text-slate-800 dark:text-white">Tool tidak ditemukan</p>
        <p class="mt-1 text-slate-500 dark:text-slate-400">Coba kata kunci atau kategori yang berbeda.</p>
        <button type="button" class="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700" @click="resetFilters">Reset filter</button>
      </div>
    </main>
  </div>
</template>
