import { describe, expect, it } from 'vitest'
import { updateRouteSeo } from '@/composables/useRouteSeo'

describe('route SEO', () => {
  it('tidak menggandakan nama situs pada title homepage', () => {
    updateRouteSeo({ title: 'Dearga Free Tools', description: 'Free tools.', path: '/' })
    expect(document.title).toBe('Dearga Free Tools')
  })

  it('menambahkan nama situs pada title tool', () => {
    updateRouteSeo({ title: 'Cron Expression Builder', description: 'Build cron.', path: '/tools/cron-expression-builder', applicationName: 'Cron Expression Builder' })
    expect(document.title).toBe('Cron Expression Builder - Dearga Free Tools')
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(`${window.location.origin}/tools/cron-expression-builder`)
  })
})
