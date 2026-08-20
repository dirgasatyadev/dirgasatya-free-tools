import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { tools } from '@/data/tools'
import { useToolsStore } from '@/stores/tools'

describe('tools store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('menampilkan seluruh dummy tool saat pencarian kosong', () => {
    const store = useToolsStore()
    expect(store.filteredTools).toHaveLength(tools.length)
  })

  it('memfilter tool tanpa membedakan kapital', () => {
    const store = useToolsStore()
    store.query = 'DEVELOPER'
    expect(store.filteredTools.length).toBeGreaterThan(0)
    expect(store.filteredTools.every((tool) => tool.category === 'Developer')).toBe(true)
  })

  it('menghasilkan daftar kosong untuk pencarian yang tidak cocok', () => {
    const store = useToolsStore()
    store.query = 'tool-yang-tidak-ada'
    expect(store.filteredTools).toEqual([])
  })

  it('memfilter tool berdasarkan kategori', () => {
    const store = useToolsStore()
    store.selectedCategory = 'Teks'

    expect(store.filteredTools).toHaveLength(1)
    expect(store.filteredTools.every((tool) => tool.category === 'Teks')).toBe(true)
  })

  it('menggabungkan filter kategori dan pencarian', () => {
    const store = useToolsStore()
    store.selectedCategory = 'Developer'
    store.query = 'uuid'

    expect(store.filteredTools.map((tool) => tool.name)).toEqual(['Generator UUID'])
  })

  it('mereset seluruh filter', () => {
    const store = useToolsStore()
    store.selectedCategory = 'Gambar'
    store.query = 'kompres'

    store.resetFilters()

    expect(store.query).toBe('')
    expect(store.selectedCategory).toBe('Semua')
    expect(store.filteredTools).toHaveLength(tools.length)
  })
})
