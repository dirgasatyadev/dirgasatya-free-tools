/// <reference lib="webworker" />

import { processSvg } from '@/workers/svgOptimizerEngine'
import type { SvgOptimizerWorkerRequest, SvgOptimizerWorkerResponse } from '@/composables/useSvgOptimizer'

self.onmessage = (event: MessageEvent<SvgOptimizerWorkerRequest>) => {
  const { id, source, options } = event.data
  try {
    const result = processSvg(source, options)
    self.postMessage({ id, result } satisfies SvgOptimizerWorkerResponse)
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'SVG gagal diproses.',
    } satisfies SvgOptimizerWorkerResponse)
  }
}
