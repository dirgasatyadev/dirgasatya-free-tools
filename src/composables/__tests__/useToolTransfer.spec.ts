import { computed, defineComponent, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acceptsTransferMimeType,
  getCompatibleTransferTargets,
  useIncomingToolTransfer,
} from '@/composables/useToolTransfer'
import { useToolTransferStore } from '@/stores/toolTransfer'

describe('tool transfer helpers', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('mendukung MIME spesifik dan wildcard', () => {
    expect(acceptsTransferMimeType(['image/avif'], 'image/avif')).toBe(true)
    expect(acceptsTransferMimeType(['image/*'], 'image/png')).toBe(true)
    expect(acceptsTransferMimeType(['image/png'], 'image/avif')).toBe(false)
  })

  it('menentukan tujuan dari format hasil secara dinamis', () => {
    const targets = getCompatibleTransferTargets('png-to-avif', [
      { blob: new Blob(['avif'], { type: 'image/avif' }), fileName: 'hasil.avif' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual(['green-screen-remover', 'image-resizer-cropper', 'universal-image-converter'])
  })

  it('menghubungkan hasil WebP ke Green Screen Remover', () => {
    const targets = getCompatibleTransferTargets('png-to-webp', [
      { blob: new Blob(['webp'], { type: 'image/webp' }), fileName: 'hasil.webp' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual([
      'green-screen-remover',
      'compress-image',
      'image-resizer-cropper',
      'universal-image-converter',
    ])
  })

  it('menawarkan kedua konverter untuk hasil PNG yang kompatibel', () => {
    const targets = getCompatibleTransferTargets('green-screen-remover', [
      { blob: new Blob(['png'], { type: 'image/png' }), fileName: 'hasil.png' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual([
      'png-to-avif',
      'png-to-webp',
      'compress-image',
      'favicon-generator',
      'image-resizer-cropper',
      'universal-image-converter',
    ])
  })

  it('menghubungkan hasil Compress Image ke tool yang menerima seluruh format hasil', () => {
    const targets = getCompatibleTransferTargets('compress-image', [
      { blob: new Blob(['png'], { type: 'image/png' }), fileName: 'satu.png' },
      { blob: new Blob(['jpg'], { type: 'image/jpeg' }), fileName: 'dua.jpg' },
    ])

    expect(targets.map((tool) => tool.toolKey)).toEqual(['green-screen-remover', 'image-resizer-cropper', 'universal-image-converter'])
  })

  it('menerima target key reaktif sesuai variant page saat mounted', () => {
    const store = useToolTransferStore()
    const receiveFiles = vi.fn<(files: File[]) => void>()
    const variant = ref<'resizer' | 'converter'>('converter')
    store.queueTransfer('png-to-webp', 'universal-image-converter', [
      { blob: new Blob(['webp'], { type: 'image/webp' }), fileName: 'hasil.webp' },
    ])

    mount(defineComponent({
      setup() {
        const targetKey = computed(() => variant.value === 'resizer'
          ? 'image-resizer-cropper'
          : 'universal-image-converter')
        useIncomingToolTransfer(targetKey, receiveFiles)
        return () => null
      },
    }))

    expect(receiveFiles).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'hasil.webp', type: 'image/webp' }),
    ])
    expect(store.pendingTransfer).toBeNull()
  })
})
