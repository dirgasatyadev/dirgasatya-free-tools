import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import SearchableCategorySelect from '@/components/SearchableCategorySelect.vue'

let wrapper: VueWrapper | undefined

afterEach(() => wrapper?.unmount())

function mountSelect() {
  wrapper = mount(SearchableCategorySelect, {
    attachTo: document.body,
    props: {
      modelValue: 'Semua',
      options: [
        { value: 'Semua', label: 'Semua (2)' },
        { value: 'Image', label: 'Image (2)' },
        { value: 'PDF', label: 'PDF (0)' },
      ],
    },
  })
  return wrapper
}

describe('SearchableCategorySelect', () => {
  it('menggunakan dropdown kustom tanpa select bawaan browser', async () => {
    const select = mountSelect()

    expect(select.find('select').exists()).toBe(false)
    await select.get('[role="combobox"]').trigger('click')
    expect(select.get('[role="combobox"]').attributes('aria-expanded')).toBe('true')
    expect(select.findAll('[role="option"]')).toHaveLength(3)
  })

  it('mencari dan meneruskan kategori yang dipilih', async () => {
    const select = mountSelect()
    await select.get('[role="combobox"]').trigger('click')
    await select.get('[role="searchbox"]').setValue('pdf')

    const options = select.findAll('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]?.text()).toContain('PDF')
    await options[0]?.trigger('click')

    const emittedValues = select.emitted('update:modelValue') ?? []
    expect(emittedValues[emittedValues.length - 1]).toEqual(['PDF'])
  })

  it('menampilkan pesan ketika kategori tidak ditemukan', async () => {
    const select = mountSelect()
    await select.get('[role="combobox"]').trigger('click')
    await select.get('[role="searchbox"]').setValue('kategori asing')

    expect(select.text()).toContain('Kategori tidak ditemukan')
  })
})
