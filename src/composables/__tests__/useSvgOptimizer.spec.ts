import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getSvgDimensions,
  runSvgOptimizerWorker,
  svgDataUrl,
  svgOutputBaseName,
  svgSavings,
  validateAndSanitizeSvg,
} from '@/composables/useSvgOptimizer'
import { processSvg } from '@/workers/svgOptimizerEngine'

describe('SVG optimizer helpers', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><!-- note --><metadata>editor</metadata><g><g><rect width="1920.000" height="1080.000" fill="#ff0000"/></g></g></svg>'

  it('memvalidasi root SVG dan membaca dimensi viewBox', () => {
    expect(getSvgDimensions(validateAndSanitizeSvg(source))).toEqual({ width: 1920, height: 1080, ratio: 16 / 9 })
    expect(() => validateAndSanitizeSvg('<html/>')).toThrow('Root document')
    expect(() => validateAndSanitizeSvg('<svg><path></svg>')).toThrow('SVG tidak valid')
  })

  it('menghapus konten aktif dan referensi eksternal sebelum preview', () => {
    const unsafe = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><style>@import "https://example.com/a.css"</style><foreignObject><div>unsafe</div></foreignObject><image href="https://example.com/tracker.png"/><rect style="fill:url(https://example.com/a.svg)"/></svg>'
    const sanitized = validateAndSanitizeSvg(unsafe)
    expect(sanitized).not.toMatch(/script|foreignObject|onload|https:\/\//)
  })

  it('menghapus url eksternal dari seluruh SVG attributes', () => {
    const unsafe = '<svg xmlns="http://www.w3.org/2000/svg"><rect clip-path="url(https://tracker.example/x.svg#clip)" mask="url(//tracker.example/mask.svg#m)" marker-start="url(https://tracker.example/marker.svg#start)" data-custom="url(https://tracker.example/custom)"/></svg>'
    const sanitized = validateAndSanitizeSvg(unsafe)
    expect(sanitized).not.toMatch(/clip-path|mask=|marker-start|data-custom|tracker\.example/)
  })

  it('hanya mempertahankan local fragment dan data image raster', () => {
    const sourceWithResources = '<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="safe"><rect width="1" height="1"/></clipPath></defs><rect clip-path="url(#safe)"/><image id="png" href="data:image/png;base64,AAAA"/><image id="nested-svg" href="data:image/svg+xml;base64,PHN2Zy8+"/></svg>'
    const sanitized = validateAndSanitizeSvg(sourceWithResources)
    expect(sanitized).toContain('clip-path="url(#safe)"')
    expect(sanitized).toContain('data:image/png;base64,AAAA')
    expect(sanitized).not.toContain('data:image/svg+xml')
  })

  it('mengoptimasi, minify, dan menghitung penghematan', () => {
    const result = processSvg(source, { removeMetadata: true, removeComments: true, removeGroups: true, simplifyAttributes: true, outputStyle: 'minify' })
    expect(result.data).not.toContain('metadata')
    expect(result.data).not.toContain('note')
    expect(svgSavings(source, result.data).optimizedBytes).toBeLessThan(svgSavings(source, result.data).originalBytes)
  })

  it('menjalankan sanitizer keamanan yang sama di engine worker', () => {
    const result = processSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><rect clip-path="url(https://tracker.example/x.svg#clip)"/><image href="data:image/svg+xml;base64,PHN2Zy8+"/></svg>')
    expect(result.data).not.toMatch(/onload|script|tracker\.example|data:image\/svg\+xml/)
  })

  it('membuat Data URL dan nama output yang bersih', () => {
    expect(svgDataUrl('<svg/>')).toMatch(/^data:image\/svg\+xml;base64,/)
    expect(svgOutputBaseName('brand.final.SVG')).toBe('brand.final')
  })
})

describe('SVG optimizer worker client', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('terminate worker ketika timeout', async () => {
    vi.useFakeTimers()
    const terminate = vi.fn<() => void>()
    class HangingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: (() => void) | null = null
      terminate = terminate
      postMessage() {}
    }
    vi.stubGlobal('Worker', HangingWorker)
    const operation = runSvgOptimizerWorker('<svg/>', undefined, undefined, 25)
    const settled = operation.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(25)
    await expect(settled).resolves.toEqual(expect.objectContaining({ message: expect.stringContaining('dihentikan setelah') }))
    expect(terminate).toHaveBeenCalledOnce()
  })

  it('terminate worker ketika dibatalkan', async () => {
    const terminate = vi.fn<() => void>()
    class HangingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: (() => void) | null = null
      terminate = terminate
      postMessage() {}
    }
    vi.stubGlobal('Worker', HangingWorker)
    const controller = new AbortController()
    const operation = runSvgOptimizerWorker('<svg/>', undefined, controller.signal)
    controller.abort()
    await expect(operation).rejects.toMatchObject({ name: 'AbortError' })
    expect(terminate).toHaveBeenCalledOnce()
  })
})
