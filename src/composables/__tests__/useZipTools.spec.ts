import { describe, expect, it } from 'vitest'
import { getZipEntrySafetyIssue, uniqueArchiveNames, validateZipSelection, type ZipEntryInfo } from '@/composables/useZipTools'

describe('ZIP tool helpers', () => {
  it('membuat nama entry duplikat menjadi unik', () => {
    const files = [new File(['a'], 'report.txt'), new File(['b'], 'report.txt'), new File(['c'], 'report.txt')]
    expect(uniqueArchiveNames(files)).toEqual(['report.txt', 'report (2).txt', 'report (3).txt'])
  })

  it('menolak entry dengan rasio kompresi ekstrem', () => {
    expect(getZipEntrySafetyIssue({ compressedSize: 1_000, uncompressedSize: 500_000, directory: false })).toContain('Rasio')
  })

  it('membatasi total hasil ekstraksi terpilih', () => {
    const entry: ZipEntryInfo = { index: 0, name: 'besar.bin', compressedSize: 10_000_000, uncompressedSize: 600 * 1024 * 1024, directory: false, safetyIssue: '' }
    expect(() => validateZipSelection([entry], [0])).toThrow('512 MB')
  })
})
