<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import { tools } from '@/data/tools'

const featuredTools = tools.slice(0, 3)

const categories = [
  { name: 'Developer', icon: 'mdi:code-tags', color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  { name: 'Teks', icon: 'mdi:text-box-outline', color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  { name: 'Gambar', icon: 'mdi:image-outline', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  { name: 'Produktivitas', icon: 'mdi:lightning-bolt-outline', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
]

const benefits = [
  { icon: 'mdi:account-off-outline', title: 'Tanpa akun', text: 'Langsung gunakan tool tanpa registrasi.' },
  { icon: 'mdi:shield-lock-outline', title: 'Privasi terjaga', text: 'Pekerjaan sederhana diproses langsung di browser.' },
  { icon: 'mdi:devices', title: 'Nyaman di mana saja', text: 'Responsif untuk desktop, tablet, dan ponsel.' },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors selection:bg-indigo-200 selection:text-indigo-950 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-indigo-800 dark:selection:text-white">
    <SiteHeader />

    <main>
      <section class="relative isolate overflow-hidden bg-slate-950 text-white">
        <div class="absolute -left-40 top-20 -z-10 size-96 rounded-full bg-indigo-600/25 blur-3xl"></div>
        <div class="absolute -right-32 -top-32 -z-10 size-[30rem] rounded-full bg-cyan-500/15 blur-3xl"></div>
        <div class="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"></div>

        <div class="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:py-32">
          <div>
            <span class="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1.5 text-sm font-semibold text-indigo-200">
              <span class="relative flex size-2">
                <span class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex size-2 rounded-full bg-emerald-400"></span>
              </span>
              Free tools untuk semua
            </span>
            <h1 class="mt-7 max-w-2xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Selesaikan tugas kecil.
              <span class="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">Lebih cepat.</span>
            </h1>
            <p class="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              Utilitas praktis untuk developer, kreator, dan pekerja digital. Ringkas, mudah digunakan, dan selalu gratis.
            </p>
            <div class="mt-9 flex flex-col gap-3 sm:flex-row">
              <RouterLink to="/free-tools" class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 font-bold text-slate-950 shadow-xl shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:bg-indigo-50">
                Jelajahi Free Tools
                <Icon icon="mdi:arrow-right" class="size-5" aria-hidden="true" />
              </RouterLink>
              <RouterLink to="/about" class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 font-bold text-white backdrop-blur transition hover:bg-white/10">
                <Icon icon="mdi:information-outline" class="size-5" aria-hidden="true" />
                Tentang project
              </RouterLink>
            </div>
            <div class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
              <span class="flex items-center gap-2"><Icon icon="mdi:check-circle" class="size-5 text-emerald-400" /> Tanpa biaya</span>
              <span class="flex items-center gap-2"><Icon icon="mdi:check-circle" class="size-5 text-emerald-400" /> Tanpa instalasi</span>
              <span class="flex items-center gap-2"><Icon icon="mdi:check-circle" class="size-5 text-emerald-400" /> Siap digunakan</span>
            </div>
          </div>

          <div class="relative mx-auto w-full max-w-lg lg:mx-0">
            <div class="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 blur-2xl"></div>
            <div class="relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div class="rounded-2xl bg-white p-5 text-slate-900 sm:p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Quick access</p>
                    <p class="mt-1 text-lg font-black">Mau mengerjakan apa?</p>
                  </div>
                  <span class="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                    <Icon icon="mdi:magnify" class="size-5" aria-hidden="true" />
                  </span>
                </div>

                <div class="mt-5 space-y-3">
                  <div v-for="tool in tools.slice(0, 3)" :key="tool.id" class="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-indigo-200 hover:bg-indigo-50/60">
                    <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
                      <Icon :icon="tool.icon" class="size-6" aria-hidden="true" />
                    </span>
                    <div class="min-w-0 grow">
                      <p class="font-bold text-slate-900">{{ tool.name }}</p>
                      <p class="truncate text-sm text-slate-500">{{ tool.category }}</p>
                    </div>
                    <Icon icon="mdi:chevron-right" class="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" aria-hidden="true" />
                  </div>
                </div>

                <div class="mt-5 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white">
                  <div class="flex items-center gap-3">
                    <span class="grid size-9 place-items-center rounded-lg bg-indigo-500"><Icon icon="mdi:sparkles" class="size-5" /></span>
                    <div>
                      <p class="text-sm font-bold">Tool baru rutin hadir</p>
                      <p class="text-xs text-slate-400">Koleksi terus bertumbuh</p>
                    </div>
                  </div>
                  <span class="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">Gratis</span>
                </div>
              </div>
            </div>
            <div class="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur sm:flex">
              <span class="grid size-9 place-items-center rounded-full bg-emerald-400/15 text-emerald-400"><Icon icon="mdi:shield-check" class="size-5" /></span>
              <div><p class="text-xs text-slate-400">Aman digunakan</p><p class="text-sm font-bold">Privasi utama</p></div>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-slate-200 px-5 py-8 dark:divide-slate-700 sm:px-8 md:grid-cols-4">
          <div class="px-4 text-center first:pl-0"><p class="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">6+</p><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Free tools</p></div>
          <div class="px-4 text-center"><p class="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">4</p><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Kategori</p></div>
          <div class="mt-6 border-l-0 px-4 text-center md:mt-0 md:border-l"><p class="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">100%</p><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Gratis</p></div>
          <div class="mt-6 px-4 text-center last:pr-0 md:mt-0"><p class="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">24/7</p><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Siap diakses</p></div>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div class="text-center">
          <p class="font-bold text-indigo-600 dark:text-indigo-400">Temukan lebih cepat</p>
          <h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Pilih berdasarkan kebutuhanmu</h2>
          <p class="mx-auto mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">Dari memformat kode sampai menjaga fokus, semuanya dikumpulkan dalam satu tempat.</p>
        </div>
        <div class="mt-9 grid grid-cols-2 gap-4 md:grid-cols-4">
          <RouterLink v-for="category in categories" :key="category.name" to="/free-tools" class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50">
            <span class="grid size-11 place-items-center rounded-xl" :class="category.color"><Icon :icon="category.icon" class="size-6" /></span>
            <p class="mt-4 font-bold text-slate-950 dark:text-white">{{ category.name }}</p>
            <p class="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">Lihat tools <Icon icon="mdi:arrow-right" class="size-4 transition group-hover:translate-x-1" /></p>
          </RouterLink>
        </div>
      </section>

      <section class="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div class="flex items-end justify-between gap-6">
          <div>
            <p class="font-bold text-indigo-600 dark:text-indigo-400">Pilihan populer</p>
              <h2 class="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Mulai dengan tool favorit</h2>
          </div>
            <RouterLink to="/free-tools" class="hidden items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 sm:flex">Lihat semua <Icon icon="mdi:arrow-right" class="size-4" /></RouterLink>
        </div>
        <div class="mt-8 grid gap-5 md:grid-cols-3">
          <ToolCard v-for="tool in featuredTools" :key="tool.id" :tool="tool" />
        </div>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div class="grid gap-5 md:grid-cols-3">
          <article v-for="benefit in benefits" :key="benefit.title" class="flex gap-4 rounded-2xl p-2">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon :icon="benefit.icon" class="size-6" /></span>
            <div><h2 class="font-bold text-slate-950 dark:text-white">{{ benefit.title }}</h2><p class="mt-1 leading-6 text-slate-600 dark:text-slate-400">{{ benefit.text }}</p></div>
          </article>
        </div>

        <div class="relative mt-16 overflow-hidden rounded-3xl bg-indigo-600 px-6 py-12 text-center text-white shadow-2xl shadow-indigo-200 dark:shadow-indigo-950/50 sm:px-12 sm:py-16">
          <div class="absolute -left-20 -top-20 size-64 rounded-full bg-white/10"></div>
          <div class="absolute -bottom-28 -right-16 size-72 rounded-full border-[40px] border-white/10"></div>
          <div class="relative">
            <span class="mx-auto grid size-12 place-items-center rounded-2xl bg-white/15"><Icon icon="mdi:rocket-launch-outline" class="size-7" /></span>
            <h2 class="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Siap membuat pekerjaan lebih ringan?</h2>
            <p class="mx-auto mt-3 max-w-xl text-lg leading-8 text-indigo-100">Pilih tool yang kamu perlukan dan selesaikan tugasmu sekarang juga.</p>
            <RouterLink to="/free-tools" class="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50">
              Lihat semua tool <Icon icon="mdi:arrow-right" class="size-5" />
            </RouterLink>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-7 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:px-8">
        <p class="font-semibold text-slate-700 dark:text-slate-200">Dirgasatya Free Tools</p>
        <p>Dibuat untuk membantu pekerjaan digital sehari-hari.</p>
      </div>
    </footer>
  </div>
</template>
