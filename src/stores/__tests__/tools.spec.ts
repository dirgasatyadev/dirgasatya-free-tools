import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { tools } from '@/data/tools'
import { useToolsStore } from '@/stores/tools'

describe('tools store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('menampilkan seluruh tool aktif saat pencarian kosong', () => {
    const store = useToolsStore()
    expect(store.filteredTools).toHaveLength(tools.length)
  })

  it('menampilkan 12 tool pertama sebelum lazy load', () => {
    const store = useToolsStore()

    expect(store.visibleTools.map((tool) => tool.name)).toEqual([
      'PNG to AVIF',
      'Green Screen Remover',
      'Bcrypt Hash Generator & Verifier',
      'Argon2id Hash Generator & Verifier',
      'SHA-256 Generator',
      'SHA-512 Generator',
      'JWT Generator',
      'PNG to WebP',
      'Compress Image',
      'SVG Maker',
      'Favicon Generator',
      'JSON Formatter & Validator',
    ])
    expect(store.hasMore).toBe(true)
    expect(store.remainingCount).toBe(Math.min(store.pageSize, tools.length - store.pageSize))
  })

  it('menambah setiap halaman tool melalui lazy load', () => {
    const store = useToolsStore()

    store.loadMore()
    expect(store.visibleTools).toHaveLength(Math.min(tools.length, store.pageSize * 2))

    while (store.hasMore) store.loadMore()

    expect(store.visibleTools).toHaveLength(tools.length)
    expect(store.hasMore).toBe(false)
    expect(store.remainingCount).toBe(0)
  })

  it('memfilter tool tanpa membedakan kapital', () => {
    const store = useToolsStore()
    store.query = 'avif'
    expect(store.filteredTools.map((tool) => tool.name)).toEqual(['PNG to AVIF'])
  })

  it('menghasilkan daftar kosong untuk pencarian yang tidak cocok', () => {
    const store = useToolsStore()
    store.query = 'tool-yang-tidak-ada'
    expect(store.filteredTools).toEqual([])
  })

  it('memfilter tool berdasarkan kategori', () => {
    const store = useToolsStore()
    store.selectedCategory = 'Image'

    expect(store.filteredTools).toHaveLength(4)
    expect(store.filteredTools.every((tool) => tool.category === 'Image')).toBe(true)
  })

  it('mengosongkan hasil saat kategori tidak mempunyai tool aktif', () => {
    const store = useToolsStore()
    store.selectedCategory = 'PDF'

    expect(store.filteredTools).toEqual([])
  })

  it('menggabungkan filter kategori dan pencarian', () => {
    const store = useToolsStore()
    store.selectedCategory = 'Image'
    store.query = 'avif'

    expect(store.filteredTools.map((tool) => tool.name)).toEqual(['PNG to AVIF'])
  })

  it('mereset seluruh filter', () => {
    const store = useToolsStore()
    store.selectedCategory = 'Image'
    store.query = 'png'

    store.resetFilters()

    expect(store.query).toBe('')
    expect(store.selectedCategory).toBe('Semua')
    expect(store.filteredTools).toHaveLength(tools.length)
  })

  it('mengarah ke halaman konverter yang tersedia', () => {
    expect(tools[0]).toMatchObject({
      category: 'Image',
      path: '/tools/png-to-avif',
      status: 'available',
    })
  })
})
