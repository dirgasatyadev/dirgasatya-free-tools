export type PasswordHashAlgorithm = 'bcrypt' | 'argon2id'
export type DigestAlgorithm = 'SHA-256' | 'SHA-512'
export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512'

export interface Argon2idHashOptions {
  memorySize: number
  iterations: number
  parallelism: number
  hashLength: number
}

export const defaultArgon2idOptions: Argon2idHashOptions = {
  memorySize: 19_456,
  iterations: 2,
  parallelism: 1,
  hashLength: 32,
}

export function createRandomSalt(length = 16) {
  if (!Number.isInteger(length) || length < 8 || length > 64) {
    throw new Error('Panjang salt harus antara 8 dan 64 byte.')
  }
  return crypto.getRandomValues(new Uint8Array(length))
}

export async function encodeBcrypt(password: string, costFactor = 10) {
  if (!password) throw new Error('Password tidak boleh kosong.')
  if (!Number.isInteger(costFactor) || costFactor < 4 || costFactor > 14) {
    throw new Error('Cost factor Bcrypt harus antara 4 dan 14.')
  }

  const { bcrypt } = await import('hash-wasm')
  const result = await bcrypt({
    password,
    salt: createRandomSalt(16),
    costFactor,
    outputType: 'encoded',
  })
  if (typeof result !== 'string') throw new Error('Hash Bcrypt tidak dapat dibuat.')
  return result
}

export async function verifyBcrypt(password: string, hash: string) {
  if (!password || !hash.trim()) throw new Error('Password dan hash Bcrypt wajib diisi.')
  if (!/^\$2[aby]\$/.test(hash.trim())) throw new Error('Format hash Bcrypt tidak valid.')
  const { bcryptVerify } = await import('hash-wasm')
  return bcryptVerify({ password, hash: hash.trim() })
}

export async function encodeArgon2id(
  password: string,
  options: Argon2idHashOptions = defaultArgon2idOptions,
) {
  if (!password) throw new Error('Password tidak boleh kosong.')
  if (!Number.isInteger(options.memorySize) || options.memorySize < 8 || options.memorySize > 262_144) {
    throw new Error('Memory Argon2id harus antara 8 dan 262144 KiB.')
  }
  if (!Number.isInteger(options.iterations) || options.iterations < 1 || options.iterations > 20) {
    throw new Error('Iterations Argon2id harus antara 1 dan 20.')
  }
  if (!Number.isInteger(options.parallelism) || options.parallelism < 1 || options.parallelism > 8) {
    throw new Error('Parallelism Argon2id harus antara 1 dan 8.')
  }
  if (!Number.isInteger(options.hashLength) || options.hashLength < 16 || options.hashLength > 64) {
    throw new Error('Panjang hash Argon2id harus antara 16 dan 64 byte.')
  }
  if (options.memorySize < 8 * options.parallelism) {
    throw new Error('Memory Argon2id minimal 8 KiB untuk setiap parallelism.')
  }

  const { argon2id } = await import('hash-wasm')
  const result = await argon2id({
    password,
    salt: createRandomSalt(16),
    parallelism: options.parallelism,
    iterations: options.iterations,
    memorySize: options.memorySize,
    hashLength: options.hashLength,
    outputType: 'encoded',
  })
  if (typeof result !== 'string') throw new Error('Hash Argon2id tidak dapat dibuat.')
  return result
}

export async function verifyArgon2id(password: string, hash: string) {
  if (!password || !hash.trim()) throw new Error('Password dan hash Argon2id wajib diisi.')
  if (!hash.trim().startsWith('$argon2id$')) throw new Error('Format hash Argon2id tidak valid.')
  const { argon2Verify } = await import('hash-wasm')
  return argon2Verify({ password, hash: hash.trim() })
}

export async function digestText(value: string, algorithm: DigestAlgorithm) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest(algorithm, data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function parseJsonObject(value: string, label: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${label} harus berupa JSON yang valid.`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} harus berupa object JSON.`)
  }
  return parsed as Record<string, unknown>
}

function encodeBase64Url(data: Uint8Array) {
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function encodeJsonSegment(value: Record<string, unknown>) {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)))
}

const jwtHashAlgorithms: Record<JwtAlgorithm, 'SHA-256' | 'SHA-384' | 'SHA-512'> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

export async function generateJwt(
  headerJson: string,
  payloadJson: string,
  secret: string,
  algorithm: JwtAlgorithm,
) {
  if (!secret) throw new Error('Secret JWT tidak boleh kosong.')
  const header = { ...parseJsonObject(headerJson, 'Header'), typ: 'JWT', alg: algorithm }
  const payload = parseJsonObject(payloadJson, 'Payload')
  const unsignedToken = `${encodeJsonSegment(header)}.${encodeJsonSegment(payload)}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: jwtHashAlgorithms[algorithm] },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsignedToken))
  return `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`
}
