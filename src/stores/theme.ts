import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'

const storageKey = 'dearga-theme'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')
  const isDark = computed(() => theme.value === 'dark')

  function applyTheme(nextTheme: Theme) {
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    document.documentElement.style.colorScheme = nextTheme
  }

  function setTheme(nextTheme: Theme) {
    theme.value = nextTheme
    applyTheme(nextTheme)
    localStorage.setItem(storageKey, nextTheme)
  }

  function initializeTheme() {
    const savedTheme = localStorage.getItem(storageKey)
    const preferredTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'

    setTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : preferredTheme)
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { theme, isDark, initializeTheme, setTheme, toggleTheme }
})
