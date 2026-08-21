import type { JsonPathMatch } from '@/composables/useJsonExplorer'
import type { JsonToTypeScriptOptions } from '@/composables/useJsonToTypeScript'

export type DataProcessingWorkerRequest =
  | { action: 'jsonpath'; json: unknown; expression: string }
  | { action: 'json-to-typescript'; source: string; options: JsonToTypeScriptOptions }

type DataProcessingWorkerResult = JsonPathMatch[] | string

export function runDataProcessingWorker(
  request: Extract<DataProcessingWorkerRequest, { action: 'jsonpath' }>,
  signal?: AbortSignal,
  timeoutMs?: number,
): Promise<JsonPathMatch[]>
export function runDataProcessingWorker(
  request: Extract<DataProcessingWorkerRequest, { action: 'json-to-typescript' }>,
  signal?: AbortSignal,
  timeoutMs?: number,
): Promise<string>
export function runDataProcessingWorker(
  request: DataProcessingWorkerRequest,
  signal?: AbortSignal,
  timeoutMs = 2_000,
) {
  if (signal?.aborted)
    return Promise.reject(new DOMException('Pemrosesan data dibatalkan.', 'AbortError'))
  return new Promise<DataProcessingWorkerResult>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/dataProcessing.worker.ts', import.meta.url), { type: 'module' })
    const abort = () => {
      cleanup()
      reject(new DOMException('Pemrosesan data dibatalkan.', 'AbortError'))
    }
    const cleanup = () => {
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      worker.terminate()
    }
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Pemrosesan data dihentikan setelah ${timeoutMs.toLocaleString('id-ID')} ms untuk mencegah UI freeze.`))
    }, timeoutMs)
    worker.onmessage = (event: MessageEvent<{ result?: DataProcessingWorkerResult; error?: string }>) => {
      cleanup()
      if (event.data.error || event.data.result === undefined)
        reject(new Error(event.data.error ?? 'Worker data tidak memberikan hasil.'))
      else resolve(event.data.result)
    }
    worker.onerror = () => {
      cleanup()
      reject(new Error('Web Worker data tidak dapat dijalankan.'))
    }
    signal?.addEventListener('abort', abort, { once: true })
    try {
      worker.postMessage(request)
    } catch (error) {
      cleanup()
      reject(error instanceof Error ? error : new Error('Payload data tidak dapat dikirim ke worker.'))
    }
  })
}
