import { describe, expect, it } from 'vitest'
import {
  acceptsTransferMimeType,
  getCompatibleTransferTargets,
} from '@/composables/useToolTransfer'

describe('tool transfer helpers', () => {
  it('mendukung MIME spesifik dan wildcard', () => {
    expect(acceptsTransferMimeType(['image/avif'], 'image/avif')).toBe(true)
    expect(acceptsTransferMimeType(['image/*'], 'image/png')).toBe(true)
    expect(acceptsTransferMimeType(['image/png'], 'image/avif')).toBe(false)
  })

  it('menentukan tujuan dari format hasil secara dinamis', () => {
    const targets = getCompatibleTransferTargets('png-to-avif', [
      { blob: new Blob(['avif'], { type: 'image/avif' }), fileName: 'hasil.avif' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual(['green-screen-remover'])
  })
})
