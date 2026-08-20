<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { FreeTool } from '@/type/tool'

defineProps<{
  tool: FreeTool
}>()
</script>

<template>
  <article class="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-950/30">
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

    <a
      :href="tool.path"
      class="mt-6 inline-flex items-center gap-2 font-semibold text-indigo-600 transition group-hover:gap-3 dark:text-indigo-400"
      :aria-disabled="tool.status === 'coming-soon'"
      @click="tool.status === 'coming-soon' && $event.preventDefault()"
    >
      {{ tool.status === 'available' ? 'Buka tool' : 'Dalam pengembangan' }}
      <Icon icon="mdi:arrow-right" class="size-5" aria-hidden="true" />
    </a>
  </article>
</template>
