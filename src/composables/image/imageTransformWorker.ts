import type { ImageFitMode, ImageTransformFormat } from '@/workers/imageTransform.worker'

export interface ImageTransformInput {
  source: Blob
  width: number
  height: number
  fit: ImageFitMode
  format: ImageTransformFormat
  quality: number
  maxPixels: number
}

export interface ImageTransformWorkerClient {
  transform: (input: ImageTransformInput, signal?: AbortSignal) => Promise<Blob>
  terminate: () => void
}

function abortError() { return new DOMException('Pemrosesan gambar dibatalkan.', 'AbortError') }

export function createImageTransformWorkerClient(): ImageTransformWorkerClient {
  const worker = new Worker(new URL('../../workers/imageTransform.worker.ts', import.meta.url), { type: 'module' })
  let requestId = 0
  let stopped = false
  let pending: { id: number; resolve: (blob: Blob) => void; reject: (error: Error) => void; signal?: AbortSignal; abort?: () => void } | null = null

  function clearPending() {
    if (pending?.signal && pending.abort) pending.signal.removeEventListener('abort', pending.abort)
    pending = null
  }
  function terminate() {
    stopped = true
    worker.terminate()
    if (!pending) return
    const reject = pending.reject
    clearPending()
    reject(abortError())
  }
  worker.onmessage = (event: MessageEvent<{ id: number; outputBlob?: Blob; error?: string }>) => {
    if (!pending || pending.id !== event.data.id) return
    const { resolve, reject } = pending
    clearPending()
    if (!event.data.outputBlob || event.data.error) reject(new Error(event.data.error ?? 'Worker tidak menghasilkan gambar.'))
    else resolve(event.data.outputBlob)
  }
  worker.onerror = () => {
    if (!pending) return
    const reject = pending.reject
    clearPending()
    reject(new Error('Image transform worker tidak dapat dimuat.'))
  }

  return {
    transform(input, signal) {
      if (stopped) return Promise.reject(new Error('Image transform worker sudah dihentikan.'))
      if (pending) return Promise.reject(new Error('Image transform worker masih sibuk.'))
      if (signal?.aborted) return Promise.reject(abortError())
      return new Promise<Blob>((resolve, reject) => {
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

export type { ImageFitMode, ImageTransformFormat }
