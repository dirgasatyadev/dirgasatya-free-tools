import { describe, expect, it } from 'vitest'
import { getAdaptiveZipCreateLimit, getAdaptiveZipExtractionLimit, getZipEntrySafetyIssue, uniqueArchiveNames, validateZipCreation, validateZipSelection, type ZipEntryInfo } from '@/composables/useZipTools'

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
    expect(() => validateZipSelection([entry], [0], 512 * 1024 * 1024)).toThrow('512 MB')
  })

  it('menerapkan budget adaptif untuk extract dan create', () => {
    expect(getAdaptiveZipExtractionLimit(2)).toBe(128 * 1024 * 1024)
    expect(getAdaptiveZipExtractionLimit(4)).toBe(256 * 1024 * 1024)
    expect(getAdaptiveZipExtractionLimit(8)).toBe(512 * 1024 * 1024)
    expect(getAdaptiveZipCreateLimit(2)).toBe(256 * 1024 * 1024)
    expect(() => validateZipCreation(Array.from({ length: 1_001 }, () => ({ size: 1 })))).toThrow('1.000 file')
    expect(() => validateZipCreation([{ size: 513 * 1024 * 1024 }], 512 * 1024 * 1024)).toThrow('budget memory')
  })
})
