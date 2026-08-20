import { describe, expect, it } from 'vitest'
import { createUniqueFileName, normalizeImageBaseName } from '@/composables/image/fileNaming'
import { validateImageDimensions, validateImageFile } from '@/composables/image/imageValidation'

describe('shared image pipeline', () => {
  it('memvalidasi file dan budget pixel secara konsisten', () => {
    const rules = { mimeTypes: ['image/png'], extensions: ['png'], maxBytes: 10, maxPixels: 100 }
    expect(validateImageFile({ name: 'a.png', type: 'image/png', size: 10 }, rules)).toBeNull()
    expect(validateImageFile({ name: 'a.jpg', type: 'image/jpeg', size: 10 }, rules)).toContain('tidak didukung')
    expect(validateImageDimensions(10, 10, 100)).toBeNull()
    expect(validateImageDimensions(11, 10, 100)).toContain('melebihi')
  })

  it('menormalisasi dan membuat nama file unik', () => {
    expect(normalizeImageBaseName('folder/a:*?')).toBe('folder-a---')
    const used = new Set<string>()
    expect(createUniqueFileName('image', 'png', used)).toBe('image.png')
    expect(createUniqueFileName('image', 'png', used)).toBe('image-2.png')
  })
})
