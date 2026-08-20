import { describe, expect, it } from 'vitest'
import { codeByteSize, codeFileExtension, codeSavings, minifySql } from '@/composables/useCodeFormatter'

describe('code formatter helpers', () => {
  it('menghitung byte dan savings berdasarkan UTF-8', () => {
    expect(codeByteSize('é')).toBe(2)
    expect(codeSavings('const value = 1;', 'const value=1;').savedPercentage).toBeGreaterThan(0)
  })

  it('menentukan extension output, termasuk transpile TypeScript', () => {
    expect(codeFileExtension('html', 'beautify')).toBe('html')
    expect(codeFileExtension('typescript', 'beautify')).toBe('ts')
    expect(codeFileExtension('typescript', 'minify')).toBe('js')
  })

  it('minify SQL tanpa merusak marker komentar di dalam string', () => {
    const source = "SELECT 'hello -- world' AS label, id /* internal */ FROM users -- trailing\n WHERE active = true;"
    const output = minifySql(source)
    expect(output).toBe("SELECT 'hello -- world' AS label,id FROM users WHERE active = true;")
  })

  it('menolak komentar blok dan string SQL yang tidak ditutup', () => {
    expect(() => minifySql('SELECT 1 /*')).toThrow('Komentar blok SQL tidak ditutup')
    expect(() => minifySql("SELECT 'broken")).toThrow('String SQL tidak ditutup')
  })
})
