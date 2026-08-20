import { describe, expect, it } from 'vitest'
import { uniqueArchiveNames } from '@/composables/useZipTools'

describe('ZIP tool helpers', () => {
  it('membuat nama entry duplikat menjadi unik', () => {
    const files = [new File(['a'], 'report.txt'), new File(['b'], 'report.txt'), new File(['c'], 'report.txt')]
    expect(uniqueArchiveNames(files)).toEqual(['report.txt', 'report (2).txt', 'report (3).txt'])
  })
})
