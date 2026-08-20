import type { RegexMatchResult } from '@/composables/useUtilityTools'

export interface RegexEvaluation {
  matches: RegexMatchResult[]
  replacedText: string
  errorMessage: string
}

export function evaluateRegexInWorker(
  input: { pattern: string; flags: string; text: string; replacement: string },
  timeoutMs = 500,
  signal?: AbortSignal,
) {
  return new Promise<RegexEvaluation>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/regex.worker.ts', import.meta.url), { type: 'module' })
    const timeout = window.setTimeout(() => {
      worker.terminate()
      reject(new Error(`Evaluasi regex dihentikan setelah ${timeoutMs} ms untuk mencegah UI freeze.`))
    }, timeoutMs)
    const cleanup = () => {
      window.clearTimeout(timeout)
      worker.terminate()
    }
    worker.onmessage = (event: MessageEvent<RegexEvaluation>) => {
      cleanup()
      resolve(event.data)
    }
    worker.onerror = () => {
      cleanup()
      reject(new Error('Web Worker regex tidak dapat dijalankan.'))
    }
    signal?.addEventListener('abort', () => {
      cleanup()
      reject(new DOMException('Evaluasi regex dibatalkan.', 'AbortError'))
    }, { once: true })
    worker.postMessage(input)
  })
}
