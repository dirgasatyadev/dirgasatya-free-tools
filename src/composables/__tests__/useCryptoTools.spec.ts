import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  digestFile,
  digestText,
  encodeArgon2id,
  encodeBcrypt,
  generateJwt,
  parseJsonObject,
  verifyArgon2id,
  verifyBcrypt,
} from '@/composables/useCryptoTools'

beforeAll(() => vi.stubGlobal('crypto', webcrypto))

describe('crypto tool helpers', () => {
  it('menghasilkan MD5, SHA-256, SHA-384, dan SHA-512 yang benar', async () => {
    await expect(digestText('abc', 'MD5')).resolves.toBe('900150983cd24fb0d6963f7d28e17f72')
    await expect(digestText('abc', 'SHA-256')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    await expect(digestText('abc', 'SHA-384')).resolves.toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    )
    await expect(digestText('abc', 'SHA-512')).resolves.toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    )
  })

  it('menghitung checksum file secara bertahap', async () => {
    const progress: number[] = []
    await expect(digestFile(new Blob(['abc']), 'SHA-256', (value) => progress.push(value))).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(progress).toEqual([0, 1])
  })

  it('membuat dan memverifikasi hash Bcrypt', async () => {
    const hash = await encodeBcrypt('password-uji', 4)
    await expect(verifyBcrypt('password-uji', hash)).resolves.toBe(true)
    await expect(verifyBcrypt('password-salah', hash)).resolves.toBe(false)
  })

  it('membuat dan memverifikasi hash Argon2id', async () => {
    const hash = await encodeArgon2id('password-uji', {
      memorySize: 32,
      iterations: 1,
      parallelism: 1,
      hashLength: 16,
    })
    await expect(verifyArgon2id('password-uji', hash)).resolves.toBe(true)
    await expect(verifyArgon2id('password-salah', hash)).resolves.toBe(false)
  })

  it('membuat JWT HMAC dengan header algorithm yang konsisten', async () => {
    const token = await generateJwt('{}', '{"sub":"123"}', 'secret-uji', 'HS256')
    const segments = token.split('.')
    expect(segments).toHaveLength(3)
    expect(JSON.parse(Buffer.from(segments[0] ?? '', 'base64url').toString())).toMatchObject({
      alg: 'HS256',
      typ: 'JWT',
    })
  })

  it('menolak JSON non-object', () => {
    expect(() => parseJsonObject('[]', 'Payload')).toThrow('object JSON')
    expect(() => parseJsonObject('{', 'Payload')).toThrow('JSON yang valid')
  })
})
