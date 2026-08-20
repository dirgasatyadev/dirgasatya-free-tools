import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import $ from 'jquery'
import SearchableCategorySelect from '@/components/SearchableCategorySelect.vue'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

describe('SearchableCategorySelect', () => {
  it('mengaktifkan pencarian Select2 dan meneruskan kategori yang dipilih', async () => {
    wrapper = mount(SearchableCategorySelect, {
      attachTo: document.body,
      props: {
        modelValue: 'Semua',
        options: [
          { value: 'Semua', label: 'Semua (14)' },
          { value: 'PDF', label: 'PDF (1)' },
        ],
      },
    })
    await flushPromises()

    expect(document.querySelector('.select2-container')).not.toBeNull()

    const nativeSelect = wrapper.get('select').element as HTMLSelectElement
    $(nativeSelect).select2('open')
    await flushPromises()
    expect(document.querySelector('.select2-search__field')).not.toBeNull()

    await wrapper.get('select').setValue('PDF')
    const emittedValues = wrapper.emitted('update:modelValue') ?? []
    expect(emittedValues[emittedValues.length - 1]).toEqual(['PDF'])
  })
})
