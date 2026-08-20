<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useThemeStore } from '@/stores/theme'

defineProps<{
  showLabel?: boolean
}>()

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
</script>

<template>
  <button
    type="button"
    class="inline-flex min-h-11 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
    :aria-label="isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'"
    :title="isDark ? 'Mode terang' : 'Mode gelap'"
    @click="themeStore.toggleTheme"
  >
    <Icon :icon="isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'" class="size-5" aria-hidden="true" />
    <span v-if="showLabel" class="font-semibold">{{ isDark ? 'Mode terang' : 'Mode gelap' }}</span>
  </button>
</template>
