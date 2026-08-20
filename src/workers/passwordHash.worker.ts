import { encodeArgon2id, encodeBcrypt, verifyArgon2id, verifyBcrypt, type Argon2idHashOptions, type PasswordHashAlgorithm } from '@/composables/useCryptoTools'

export interface PasswordHashWorkerRequest {
  action: 'encode' | 'verify'
  algorithm: PasswordHashAlgorithm
  password: string
  hash?: string
  costFactor?: number
  argon2Options?: Argon2idHashOptions
}

self.onmessage = async (event: MessageEvent<PasswordHashWorkerRequest>) => {
  try {
    const request = event.data
    const result = request.action === 'encode'
      ? request.algorithm === 'bcrypt'
        ? await encodeBcrypt(request.password, request.costFactor)
        : await encodeArgon2id(request.password, request.argon2Options)
      : request.algorithm === 'bcrypt'
        ? await verifyBcrypt(request.password, request.hash ?? '')
        : await verifyArgon2id(request.password, request.hash ?? '')
    self.postMessage({ result })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Operasi password hash gagal.' })
  }
}
