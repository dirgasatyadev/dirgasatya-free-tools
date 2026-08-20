<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import { changelog } from '@/data/changelog'
import type { ChangeType, ChangelogScope } from '@/type/changelog'

const badgeClasses: Record<ChangeType, string> = {
  Baru: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Peningkatan: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  Infrastruktur: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Keamanan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
}

const scopeClasses: Record<ChangelogScope, string> = {
  Platform: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'PNG to AVIF': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  'Green Screen Remover':
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'PNG to WebP': 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'Compress Image': 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'SVG Maker': 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
  'Favicon Generator': 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'Developer, Text & Data Tools': 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  'Security & Developer':
    'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'Calculator, Cron & Checksum Tools':
    'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  'File, Data & Text Tools':
    'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'Security & Performance':
    'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  'Correctness & Platform':
    'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  'Reliability & Browser Testing':
    'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />

    <main>
      <section class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
          <span class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Icon icon="mdi:history" class="size-4" aria-hidden="true" />
            Perjalanan project
          </span>
          <h1 class="mt-5 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Changelog</h1>
          <p class="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Catatan perkembangan, fitur baru, dan peningkatan yang telah ditambahkan ke Dearga Free Tools.
          </p>
        </div>
      </section>

      <section class="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <div class="relative space-y-8 before:absolute before:bottom-8 before:left-[1.18rem] before:top-8 before:w-px before:bg-slate-200 dark:before:bg-slate-800 sm:before:left-[1.43rem]">
          <article v-for="entry in changelog" :key="entry.version" class="relative grid grid-cols-[2.5rem_1fr] gap-4 sm:grid-cols-[3rem_1fr] sm:gap-6">
            <div class="relative z-10 mt-1 grid size-10 place-items-center rounded-full border-4 border-slate-50 bg-indigo-600 text-white shadow-sm dark:border-slate-950 sm:size-12">
              <Icon :icon="entry.icon" class="size-5" aria-hidden="true" />
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{{ entry.version }}</span>
                    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" :class="scopeClasses[entry.scope]"><Icon :icon="entry.icon" class="size-3.5" aria-hidden="true" /> {{ entry.scope }}</span>
                    <span v-if="entry.latest" class="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">Terbaru</span>
                  </div>
                  <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{{ entry.title }}</h2>
                </div>
                <time class="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">{{ entry.date }}</time>
              </div>

              <p class="mt-3 leading-7 text-slate-600 dark:text-slate-400">{{ entry.description }}</p>

              <ul class="mt-6 space-y-3">
                <li v-for="change in entry.changes" :key="change.text" class="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/70 sm:flex-row sm:items-start">
                  <span class="w-fit shrink-0 rounded-lg px-2 py-1 text-xs font-bold" :class="badgeClasses[change.type]">{{ change.type }}</span>
                  <span class="leading-6 text-slate-700 dark:text-slate-300">{{ change.text }}</span>
                </li>
              </ul>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>
