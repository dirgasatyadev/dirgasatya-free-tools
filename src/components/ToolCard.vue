<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { FreeTool, ToolViewMode } from '@/type/tool'

withDefaults(
  defineProps<{
    tool: FreeTool
    layout?: Exclude<ToolViewMode, 'table'>
  }>(),
  { layout: 'grid' },
)
</script>

<template>
  <article v-if="layout === 'list'" class="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50 sm:flex-row sm:items-center">
    <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
      <Icon :icon="tool.icon" class="size-6" aria-hidden="true" />
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-lg font-bold text-slate-950 dark:text-white">{{ tool.name }}</h2>
        <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{{ tool.category }}</span>
        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="tool.status === 'available' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'">{{ tool.status === 'available' ? 'Tersedia' : 'Segera' }}</span>
      </div>
      <p class="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">{{ tool.description }}</p>
    </div>
    <RouterLink :to="tool.path" class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700" :aria-disabled="tool.status === 'coming-soon'" @click="tool.status === 'coming-soon' && $event.preventDefault()">
      {{ tool.status === 'available' ? 'Buka tool' : 'Segera' }}
      <Icon icon="mdi:arrow-right" class="size-4" aria-hidden="true" />
    </RouterLink>
  </article>

  <article v-else class="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-950/30">
    <div class="flex items-start justify-between gap-4">
      <span class="grid size-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
        <Icon :icon="tool.icon" class="size-6" aria-hidden="true" />
      </span>
      <span
        class="rounded-full px-2.5 py-1 text-xs font-semibold"
        :class="tool.status === 'available' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'"
      >
        {{ tool.status === 'available' ? 'Tersedia' : 'Segera' }}
      </span>
    </div>

    <p class="mt-5 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{{ tool.category }}</p>
    <h2 class="mt-2 text-xl font-bold text-slate-950 dark:text-white">{{ tool.name }}</h2>
    <p class="mt-2 grow leading-7 text-slate-600 dark:text-slate-400">{{ tool.description }}</p>

    <RouterLink
      :to="tool.path"
      class="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-500/25"
      :aria-disabled="tool.status === 'coming-soon'"
      @click="tool.status === 'coming-soon' && $event.preventDefault()"
    >
      {{ tool.status === 'available' ? 'Buka tool' : 'Dalam pengembangan' }}
      <Icon icon="mdi:arrow-right" class="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </RouterLink>
  </article>
</template>
