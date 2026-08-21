import { afterEach, describe, expect, it, vi } from 'vitest'
import { runDataProcessingWorker } from '@/composables/useDataProcessingWorker'

describe('data processing worker', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('menghentikan worker yang melewati timeout', async () => {
    vi.useFakeTimers()
    const terminate = vi.fn<() => void>()
    class HangingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: (() => void) | null = null
      terminate = terminate
      postMessage() {}
    }
    vi.stubGlobal('Worker', HangingWorker)

    const operation = runDataProcessingWorker(
      { action: 'jsonpath', json: { value: true }, expression: '$..*' },
      undefined,
      25,
    )
    const settled = operation.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(25)
    await expect(settled).resolves.toEqual(expect.objectContaining({ message: expect.stringContaining('dihentikan setelah 25 ms') }))
    expect(terminate).toHaveBeenCalledOnce()
  })
})
