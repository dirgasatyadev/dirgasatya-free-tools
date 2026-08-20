<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'

const navigation = [
  { label: 'Beranda', to: '/' },
  { label: 'Free Tools', to: '/free-tools' },
  { label: 'About', to: '/about' },
]

const route = useRoute()
const isMenuOpen = ref(false)

function closeMenu() {
  isMenuOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu()
}

watch(
  () => route.fullPath,
  () => closeMenu(),
)

watch(isMenuOpen, (isOpen) => {
  document.body.classList.toggle('overflow-hidden', isOpen)
})

onMounted(() => document.addEventListener('keydown', handleKeydown))

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('overflow-hidden')
})
</script>

<template>
  <header class="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
    <nav class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Navigasi utama">
      <RouterLink to="/" class="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
        <span class="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Icon icon="mdi:toolbox-outline" class="size-5" aria-hidden="true" />
        </span>
        Dirgasatya Tools
      </RouterLink>

      <div class="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800 md:flex">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white sm:px-4"
          active-class="bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300"
          :exact="item.to === '/'"
        >
          {{ item.label }}
        </RouterLink>
      </div>

      <div class="flex items-center gap-2">
        <ThemeToggle class="hidden md:inline-flex" />
        <button
          type="button"
          class="grid size-11 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-indigo-300 md:hidden"
          aria-label="Buka menu navigasi"
          aria-controls="mobile-navigation"
          :aria-expanded="isMenuOpen"
          @click="isMenuOpen = true"
        >
          <Icon icon="mdi:menu" class="size-6" aria-hidden="true" />
        </button>
      </div>
    </nav>
  </header>

  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <button
        v-if="isMenuOpen"
        type="button"
        class="fixed inset-0 z-40 cursor-default bg-black/30 md:hidden"
        aria-label="Tutup menu navigasi"
        @click="closeMenu"
      ></button>
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="isMenuOpen"
        id="mobile-navigation"
        class="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,20rem)] flex-col bg-white p-5 shadow-2xl dark:bg-slate-900 md:hidden"
        aria-label="Menu navigasi mobile"
      >
        <div class="flex items-center justify-between border-b border-slate-200 pb-5 dark:border-slate-700">
          <RouterLink to="/" class="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950 dark:text-white" @click="closeMenu">
            <span class="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Icon icon="mdi:toolbox-outline" class="size-5" aria-hidden="true" />
            </span>
            Dirgasatya Tools
          </RouterLink>
          <button
            type="button"
            class="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Tutup menu navigasi"
            @click="closeMenu"
          >
            <Icon icon="mdi:close" class="size-6" aria-hidden="true" />
          </button>
        </div>

        <nav class="mt-6 flex flex-col gap-2" aria-label="Navigasi mobile">
          <RouterLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="flex items-center justify-between rounded-xl px-4 py-3.5 font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            active-class="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
            :exact="item.to === '/'"
            @click="closeMenu"
          >
            {{ item.label }}
            <Icon icon="mdi:chevron-right" class="size-5" aria-hidden="true" />
          </RouterLink>
        </nav>

        <div class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <ThemeToggle show-label class="w-full" />
        </div>

        <div class="mt-auto rounded-2xl bg-slate-950 p-4 text-white">
          <Icon icon="mdi:sparkles" class="size-6 text-indigo-300" aria-hidden="true" />
          <p class="mt-3 font-bold">Tool praktis, selalu gratis.</p>
          <p class="mt-1 text-sm leading-6 text-slate-400">Selesaikan pekerjaan kecil tanpa proses yang rumit.</p>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
