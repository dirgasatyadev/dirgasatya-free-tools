<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SearchableCategorySelect from '@/components/SearchableCategorySelect.vue'
import SiteHeader from '@/components/SiteHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import { useTools } from '@/composables/useTools'
import { toolCategories, tools } from '@/data/tools'
import type { ToolFilterCategory, ToolViewMode } from '@/type/tool'

const {
  query,
  selectedCategory,
  filteredTools,
  visibleTools,
  hasMore,
  remainingCount,
  loadMore,
  resetFilters,
} = useTools()

const loadMoreTrigger = ref<HTMLElement | null>(null)
const viewMode = ref<ToolViewMode>('grid')
let loadMoreObserver: IntersectionObserver | undefined

const viewModeOptions: { value: ToolViewMode; label: string; icon: string }[] = [
  { value: 'list', label: 'Tampilan list', icon: 'mdi:view-list-outline' },
  { value: 'grid', label: 'Tampilan grid', icon: 'mdi:view-grid-outline' },
  { value: 'table', label: 'Tampilan table', icon: 'mdi:table' },
]

function observeLoadMoreTrigger(element: HTMLElement | null, previous?: HTMLElement | null) {
  if (!loadMoreObserver) return
  if (previous) loadMoreObserver.unobserve(previous)
  if (element) loadMoreObserver.observe(element)
}

watch(loadMoreTrigger, (element, previous) => observeLoadMoreTrigger(element, previous), {
  flush: 'post',
})

onMounted(() => {
  if (!('IntersectionObserver' in window)) return

  loadMoreObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) loadMore()
    },
    { rootMargin: '240px 0px' },
  )

  observeLoadMoreTrigger(loadMoreTrigger.value)
})

onBeforeUnmount(() => loadMoreObserver?.disconnect())

function getCategoryCount(category: ToolFilterCategory) {
  return category === 'Semua' ? tools.length : tools.filter((tool) => tool.category === category).length
}

const categoryOptions = (['Semua', ...toolCategories] satisfies ToolFilterCategory[]).map(
  (category) => ({
    value: category,
    label: `${category} (${getCategoryCount(category)})`,
  }),
)
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
        <div class="grid gap-3 md:grid-cols-[18rem_minmax(0,1fr)_auto]">
          <div class="order-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 md:contents">
            <SearchableCategorySelect v-model="selectedCategory" :options="categoryOptions" class="min-w-0 md:col-start-1 md:row-start-1" />

            <div class="flex justify-end md:col-start-3 md:row-start-1" role="group" aria-label="Mode tampilan daftar tool">
              <div class="inline-flex min-h-13 items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-800">
                <button v-for="mode in viewModeOptions" :key="mode.value" type="button" class="grid size-10 place-items-center rounded-xl transition" :class="viewMode === mode.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-300'" :aria-label="mode.label" :title="mode.label" :aria-pressed="viewMode === mode.value" @click="viewMode = mode.value"><Icon :icon="mode.icon" class="size-5" aria-hidden="true" /></button>
              </div>
            </div>
          </div>

          <label class="order-1 flex min-h-13 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100 md:col-start-2 md:row-start-1 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-slate-800 dark:focus-within:ring-indigo-500/15">
            <Icon icon="mdi:magnify" class="size-6 text-slate-400" aria-hidden="true" />
            <span class="sr-only">Cari free tool</span>
            <input v-model="query" type="search" placeholder="Cari nama atau kategori tool..." class="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500" />
            <button v-if="query" type="button" class="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white" aria-label="Hapus pencarian" @click="query = ''">
              <Icon icon="mdi:close" class="size-5" aria-hidden="true" />
            </button>
          </label>

        </div>
      </section>

      <div class="mt-8 flex items-center justify-between gap-4">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Menampilkan <span class="font-bold text-slate-900 dark:text-white">{{ visibleTools.length }}</span> dari
          <span class="font-bold text-slate-900 dark:text-white">{{ filteredTools.length }}</span> tool
          <span v-if="selectedCategory !== 'Semua'"> dalam kategori <span class="font-bold text-indigo-700 dark:text-indigo-400">{{ selectedCategory }}</span></span>
        </p>
        <button v-if="query || selectedCategory !== 'Semua'" type="button" class="text-sm font-semibold text-indigo-600 hover:text-indigo-800" @click="resetFilters">
          Reset filter
        </button>
      </div>

      <template v-if="filteredTools.length">
        <div v-if="viewMode === 'grid'" class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard v-for="tool in visibleTools" :key="tool.id" :tool="tool" layout="grid" />
        </div>

        <div v-else-if="viewMode === 'list'" class="mt-5 space-y-3">
          <ToolCard v-for="tool in visibleTools" :key="tool.id" :tool="tool" layout="list" />
        </div>

        <div v-else class="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table class="w-full min-w-175 border-collapse text-left">
            <thead class="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
              <tr><th class="px-5 py-4">Tool</th><th class="px-5 py-4">Kategori</th><th class="px-5 py-4">Status</th><th class="px-5 py-4 text-right">Aksi</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr v-for="tool in visibleTools" :key="tool.id" class="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td class="px-5 py-4"><div class="flex items-center gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon :icon="tool.icon" class="size-5" aria-hidden="true" /></span><span><span class="block font-bold text-slate-950 dark:text-white">{{ tool.name }}</span><span class="mt-0.5 block max-w-xl text-sm text-slate-500 dark:text-slate-400">{{ tool.description }}</span></span></div></td>
                <td class="px-5 py-4"><span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{{ tool.category }}</span></td>
                <td class="px-5 py-4"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="tool.status === 'available' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'">{{ tool.status === 'available' ? 'Tersedia' : 'Segera' }}</span></td>
                <td class="px-5 py-4 text-right"><RouterLink :to="tool.path" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700" :aria-disabled="tool.status === 'coming-soon'" @click="tool.status === 'coming-soon' && $event.preventDefault()">{{ tool.status === 'available' ? 'Buka' : 'Segera' }}<Icon icon="mdi:arrow-right" class="size-4" aria-hidden="true" /></RouterLink></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="hasMore" ref="loadMoreTrigger" class="mt-8 flex flex-col items-center gap-2 text-center">
          <button type="button" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400 dark:hover:border-indigo-500 dark:hover:bg-slate-800" @click="loadMore">
            <Icon icon="mdi:chevron-down-circle-outline" class="size-5" aria-hidden="true" />
            Muat {{ remainingCount }} tool berikutnya
          </button>
          <p class="text-xs text-slate-500 dark:text-slate-400">Scroll ke bawah untuk memuat otomatis</p>
        </div>

        <p v-else-if="filteredTools.length > 12" class="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Semua tool sudah ditampilkan
        </p>
      </template>

      <div v-else class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <Icon icon="mdi:database-search-outline" class="mx-auto size-10 text-slate-400" aria-hidden="true" />
        <p class="mt-4 text-lg font-bold text-slate-800 dark:text-white">Tool tidak ditemukan</p>
        <p class="mt-1 text-slate-500 dark:text-slate-400">Coba kata kunci atau kategori yang berbeda.</p>
        <button type="button" class="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700" @click="resetFilters">Reset filter</button>
      </div>
    </main>
  </div>
</template>
