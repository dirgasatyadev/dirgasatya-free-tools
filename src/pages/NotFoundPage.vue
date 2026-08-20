<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />
    <main class="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-5 py-16 text-center">
      <section>
        <span class="mx-auto grid size-20 place-items-center rounded-3xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon icon="mdi:map-marker-question-outline" class="size-10" /></span>
        <p class="mt-7 text-sm font-black uppercase tracking-[0.25em] text-indigo-600">Error 404</p>
        <h1 class="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Halaman tidak ditemukan</h1>
        <p class="mx-auto mt-4 max-w-xl leading-7 text-slate-500 dark:text-slate-400">URL mungkin salah atau halaman sudah dipindahkan. Gunakan katalog untuk menemukan tool yang tersedia.</p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><RouterLink to="/free-tools" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700"><Icon icon="mdi:tools" class="size-5" />Lihat Free Tools</RouterLink><RouterLink to="/" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 font-bold dark:border-slate-700"><Icon icon="mdi:home-outline" class="size-5" />Kembali ke beranda</RouterLink></div>
      </section>
    </main>
  </div>
</template>
