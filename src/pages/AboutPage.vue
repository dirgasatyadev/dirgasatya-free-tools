<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'

const values = [
  { icon: 'mdi:gift-outline', title: 'Gratis', text: 'Tool inti dapat digunakan tanpa biaya dan tanpa proses yang rumit.' },
  { icon: 'mdi:lightning-bolt-outline', title: 'Cepat', text: 'Pengalaman dibuat ringkas agar pekerjaan selesai dalam beberapa langkah.' },
  { icon: 'mdi:shield-check-outline', title: 'Privasi', text: 'Prioritas kami adalah memproses data secara aman dan transparan.' },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <SiteHeader />

    <main>
      <section class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Icon icon="mdi:information-outline" class="size-8" aria-hidden="true" />
          </span>
          <p class="mt-6 font-bold text-indigo-600 dark:text-indigo-400">Tentang project</p>
          <h1 class="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Alat bantu yang fokus pada hal penting.</h1>
          <p class="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Dearga Free Tools adalah kumpulan utilitas web praktis yang dapat langsung digunakan. Tool pemrosesan file dirancang berjalan di browser agar file tetap berada di perangkat Anda.
          </p>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div class="grid gap-5 md:grid-cols-3">
          <article v-for="value in values" :key="value.title" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Icon :icon="value.icon" class="size-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h2 class="mt-5 text-xl font-bold text-slate-950 dark:text-white">{{ value.title }}</h2>
            <p class="mt-2 leading-7 text-slate-600 dark:text-slate-400">{{ value.text }}</p>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>
