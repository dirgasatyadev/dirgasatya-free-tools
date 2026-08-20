import type { RgbColor } from '@/composables/useGreenScreenRemover'

function abortError(message: string) {
  return new DOMException(message, 'AbortError')
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
    worker.postMessage(input)
  })
}

export function encodeAvifInWorker(input: { source: Blob; quality: number; maxPixels: number }, signal?: AbortSignal) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/avif.worker.ts', import.meta.url), { type: 'module' })
    const cleanup = () => worker.terminate()
    worker.onmessage = (event: MessageEvent<{ buffer?: ArrayBuffer; error?: string }>) => {
      cleanup()
      if (event.data.error || !event.data.buffer) reject(new Error(event.data.error ?? 'Worker tidak menghasilkan AVIF.'))
      else resolve(event.data.buffer)
    }
    worker.onerror = () => { cleanup(); reject(new Error('AVIF worker tidak dapat dimuat.')) }
    signal?.addEventListener('abort', () => { cleanup(); reject(abortError('Konversi AVIF dibatalkan.')) }, { once: true })
    worker.postMessage(input)
  })
}
