import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { nextTick } from 'vue'
import FreeToolsPage from '@/pages/FreeToolsPage.vue'
import { useToolsStore } from '@/stores/tools'

let wrapper: VueWrapper | undefined
let pinia: Pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

afterEach(() => wrapper?.unmount())

function mountPage() {
  wrapper = mount(FreeToolsPage, {
    global: {
      plugins: [pinia],
      stubs: {
        SiteHeader: true,
        SearchableCategorySelect: true,
        RouterLink: {
          template: '<a><slot /></a>',
        },
        ToolCard: {
          props: ['tool', 'layout'],
          template: '<article :data-layout="layout">{{ tool.name }}</article>',
        },
      },
    },
  })
  return wrapper
}

describe('FreeToolsPage', () => {
  it('tidak menampilkan empty state ketika tool tersedia', () => {
    const page = mountPage()

    expect(page.text()).toContain('PNG to AVIF')
    expect(page.text()).toContain('Green Screen Remover')
    expect(page.text()).not.toContain('Tool tidak ditemukan')
  })

  it('menampilkan empty state ketika filter benar-benar kosong', async () => {
    const page = mountPage()
    useToolsStore().query = 'tool-yang-tidak-tersedia'
    await nextTick()

    expect(page.text()).toContain('Tool tidak ditemukan')
  })

  it('mengubah data antara tampilan grid, list, dan table', async () => {
    const page = mountPage()

    expect(page.findAll('[data-layout="grid"]')).toHaveLength(11)

    await page.get('[aria-label="Tampilan list"]').trigger('click')
    expect(page.findAll('[data-layout="list"]')).toHaveLength(11)

    await page.get('[aria-label="Tampilan table"]').trigger('click')
    expect(page.find('table').exists()).toBe(true)
    expect(page.findAll('tbody tr')).toHaveLength(11)
  })
})
