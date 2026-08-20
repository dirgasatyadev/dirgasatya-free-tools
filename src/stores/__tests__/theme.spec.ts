import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useThemeStore } from '@/stores/theme'

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = ''
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('memuat tema yang tersimpan dari localStorage', () => {
    localStorage.setItem('dearga-theme', 'dark')
    const store = useThemeStore()

    store.initializeTheme()

    expect(store.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('mengikuti preferensi perangkat saat belum ada tema tersimpan', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const store = useThemeStore()

    store.initializeTheme()

    expect(store.theme).toBe('dark')
    expect(localStorage.getItem('dearga-theme')).toBe('dark')
  })

  it('mengganti tema dan menyimpan pilihan pengguna', () => {
    const store = useThemeStore()
    store.setTheme('light')

    store.toggleTheme()

    expect(store.theme).toBe('dark')
    expect(localStorage.getItem('dearga-theme')).toBe('dark')
  })
})
