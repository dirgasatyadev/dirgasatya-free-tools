import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useToolTransferStore } from '@/stores/toolTransfer'

describe('tool transfer store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('mengirim file ke target dan hanya dapat diambil sekali', () => {
    const store = useToolTransferStore()
    const blob = new Blob(['avif'], { type: 'image/avif' })

    expect(
      store.queueTransfer('png-to-avif', 'green-screen-remover', [
        { blob, fileName: 'hasil.avif' },
      ]),
    ).toBe(true)
    expect(store.consumeTransfer('green-screen-remover')).toMatchObject([
      { name: 'hasil.avif', type: 'image/avif' },
    ])
    expect(store.consumeTransfer('green-screen-remover')).toEqual([])
  })

  it('tidak mengambil transfer milik tool lain', () => {
    const store = useToolTransferStore()
    store.queueTransfer('png-to-avif', 'green-screen-remover', [
      { blob: new Blob(['avif'], { type: 'image/avif' }), fileName: 'hasil.avif' },
    ])

    expect(store.consumeTransfer('png-to-avif')).toEqual([])
    expect(store.pendingTransfer?.targetToolKey).toBe('green-screen-remover')
  })
})
