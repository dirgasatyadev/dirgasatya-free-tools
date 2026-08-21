import { describe, expect, it } from 'vitest'
import { canMinifySqlDialect, codeByteSize, codeFileExtension, codeSavings, minifySql, sqlDialectOptions } from '@/composables/useCodeFormatter'

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

  it('menonaktifkan minify pada dialect yang belum memiliki parser minify aman', () => {
    for (const dialect of sqlDialectOptions) {
      expect(canMinifySqlDialect(dialect.value)).toBe(false)
      expect(() => minifySql('SELECT 1;', dialect.value)).toThrow(`Minify belum tersedia untuk ${dialect.label}`)
    }
  })

  it('tidak mencoba mengubah PostgreSQL dollar-quoted body', () => {
    const source = 'CREATE FUNCTION x() RETURNS void AS $body$\nBEGIN\n  -- isi body\n  RAISE NOTICE \'hello   world\';\nEND\n$body$ LANGUAGE plpgsql;'
    expect(() => minifySql(source, 'postgresql')).toThrow('Minify belum tersedia untuk PostgreSQL')
  })
})
