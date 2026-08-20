import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

async function mountHeader() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/free-tools', component: { template: '<div />' } },
      { path: '/about', component: { template: '<div />' } },
    ],
  })

  await router.push('/')
  await router.isReady()

  wrapper = mount(SiteHeader, { global: { plugins: [createPinia(), router] } })
  return wrapper
}

describe('SiteHeader mobile navigation', () => {
  it('membuka sidebar dan menutupnya saat backdrop diklik', async () => {
    const header = await mountHeader()

    await header.get('button[aria-label="Buka menu navigasi"]').trigger('click')
    expect(document.querySelector('#mobile-navigation')).not.toBeNull()
    expect(document.body.classList.contains('overflow-hidden')).toBe(true)

    const backdrop = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Tutup menu navigasi"]',
    )
    backdrop?.click()
    await nextTick()

    expect(document.querySelector('#mobile-navigation')).toBeNull()
    expect(document.body.classList.contains('overflow-hidden')).toBe(false)
  })

  it('menutup sidebar dengan tombol Escape', async () => {
    const header = await mountHeader()

    await header.get('button[aria-label="Buka menu navigasi"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(document.querySelector('#mobile-navigation')).toBeNull()
  })
})
