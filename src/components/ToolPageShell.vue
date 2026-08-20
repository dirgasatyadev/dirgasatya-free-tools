<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'

defineProps<{
  title: string
  description: string
  icon: string
  category: string
}>()
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />
    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <RouterLink to="/free-tools" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"><Icon icon="mdi:arrow-left" class="size-5" /> Kembali ke Free Tools</RouterLink>
      <section class="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header class="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-8"><span class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon :icon="icon" class="size-4" /> {{ category }}</span><h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{{ title }}</h1><p class="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-400">{{ description }}</p></header>
        <div class="p-5 sm:p-8"><slot /></div>
      </section>
    </main>
  </div>
</template>
