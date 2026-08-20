import type { RgbColor } from '@/composables/useGreenScreenRemover'

function abortError(message: string) {
  return new DOMException(message, 'AbortError')
}

export function createGreenScreenWorkerPayload(input: { source: Blob; tolerance: number; softness: number; keyColor: RgbColor; autoDetect: boolean; maxPixels: number }) {
  return {
    ...input,
    keyColor: { red: input.keyColor.red, green: input.keyColor.green, blue: input.keyColor.blue },
  }
}

export function processGreenScreenInWorker(input: { source: Blob; tolerance: number; softness: number; keyColor: RgbColor; autoDetect: boolean; maxPixels: number }, signal?: AbortSignal) {
  return new Promise<{ outputBlob: Blob; keyColor: RgbColor }>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/greenScreen.worker.ts', import.meta.url), { type: 'module' })
    const cleanup = () => worker.terminate()
    worker.onmessage = (event: MessageEvent<{ outputBlob?: Blob; keyColor?: RgbColor; error?: string }>) => {
      cleanup()
      if (event.data.error || !event.data.outputBlob || !event.data.keyColor) reject(new Error(event.data.error ?? 'Worker tidak menghasilkan PNG.'))
      else resolve({ outputBlob: event.data.outputBlob, keyColor: event.data.keyColor })
    }
    worker.onerror = () => { cleanup(); reject(new Error('Green screen worker tidak dapat dimuat.')) }
    signal?.addEventListener('abort', () => { cleanup(); reject(abortError('Pemrosesan green screen dibatalkan.')) }, { once: true })
    worker.postMessage(createGreenScreenWorkerPayload(input))
  })
}

export interface AvifWorkerClient {
  encode: (input: { source: Blob; quality: number; maxPixels: number }, signal?: AbortSignal) => Promise<ArrayBuffer>
  terminate: () => void
}

export function createAvifWorkerClient(): AvifWorkerClient {
  const worker = new Worker(new URL('../workers/avif.worker.ts', import.meta.url), { type: 'module' })
  let requestId = 0
  let stopped = false
  let pending: { id: number; resolve: (buffer: ArrayBuffer) => void; reject: (error: Error) => void; signal?: AbortSignal; abort?: () => void } | null = null

  const clearPending = () => {
    if (pending?.signal && pending.abort) pending.signal.removeEventListener('abort', pending.abort)
    pending = null
  }
  const terminate = () => {
    stopped = true
    worker.terminate()
    if (pending) {
      const reject = pending.reject
      clearPending()
      reject(abortError('Konversi AVIF dibatalkan.'))
    }
  }
  worker.onmessage = (event: MessageEvent<{ id?: number; buffer?: ArrayBuffer; error?: string }>) => {
    if (!pending || event.data.id !== pending.id) return
    const { resolve, reject } = pending
    clearPending()
    if (event.data.error || !event.data.buffer) reject(new Error(event.data.error ?? 'Worker tidak menghasilkan AVIF.'))
    else resolve(event.data.buffer)
  }
  worker.onerror = () => {
    if (!pending) return
    const reject = pending.reject
    clearPending()
    reject(new Error('AVIF worker tidak dapat dimuat.'))
  }

  return {
    encode(input, signal) {
      if (stopped) return Promise.reject(new Error('AVIF worker sudah dihentikan.'))
      if (pending) return Promise.reject(new Error('AVIF worker masih memproses gambar sebelumnya.'))
      if (signal?.aborted) return Promise.reject(abortError('Konversi AVIF dibatalkan.'))
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const id = ++requestId
        const abort = () => terminate()
        pending = { id, resolve, reject, signal, abort }
        signal?.addEventListener('abort', abort, { once: true })
        worker.postMessage({ id, ...input })
      })
    },
    terminate,
  }
}

export async function encodeAvifInWorker(input: { source: Blob; quality: number; maxPixels: number }, signal?: AbortSignal) {
  const client = createAvifWorkerClient()
  try { return await client.encode(input, signal) }
  finally { client.terminate() }
}

export function encodeWebpInWorker(input: { source: Blob; quality: number; maxPixels: number }, signal?: AbortSignal) {
  return new Promise<Blob>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/webp.worker.ts', import.meta.url), { type: 'module' })
    const cleanup = () => worker.terminate()
    worker.onmessage = (event: MessageEvent<{ outputBlob?: Blob; error?: string }>) => {
      cleanup()
      if (event.data.error || !event.data.outputBlob) reject(new Error(event.data.error ?? 'Worker tidak menghasilkan WebP.'))
      else resolve(event.data.outputBlob)
    }
    worker.onerror = () => { cleanup(); reject(new Error('WebP worker tidak dapat dimuat.')) }
    signal?.addEventListener('abort', () => { cleanup(); reject(abortError('Konversi WebP dibatalkan.')) }, { once: true })
    worker.postMessage(input)
  })
}
