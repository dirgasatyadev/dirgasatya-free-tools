import type { PasswordHashWorkerRequest } from '@/workers/passwordHash.worker'

export function runPasswordHashWorker(request: PasswordHashWorkerRequest, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new DOMException('Operasi password hash dibatalkan.', 'AbortError'))
  return new Promise<string | boolean>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/passwordHash.worker.ts', import.meta.url), { type: 'module' })
    const abort = () => { cleanup(); reject(new DOMException('Operasi password hash dibatalkan.', 'AbortError')) }
    const cleanup = () => { signal?.removeEventListener('abort', abort); worker.terminate() }
    worker.onmessage = (event: MessageEvent<{ result?: string | boolean; error?: string }>) => {
      cleanup()
      if (event.data.error || event.data.result === undefined) reject(new Error(event.data.error ?? 'Worker password hash tidak memberikan hasil.'))
      else resolve(event.data.result)
    }
    worker.onerror = () => { cleanup(); reject(new Error('Worker password hash tidak dapat dimuat.')) }
    signal?.addEventListener('abort', abort, { once: true })
    worker.postMessage(request)
  })
}
