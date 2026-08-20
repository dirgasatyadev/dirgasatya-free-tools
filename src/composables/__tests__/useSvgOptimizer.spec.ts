import { describe, expect, it } from 'vitest'
import {
  getSvgDimensions,
  optimizeSvg,
  svgDataUrl,
  svgOutputBaseName,
  svgSavings,
  validateAndSanitizeSvg,
} from '@/composables/useSvgOptimizer'

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

  it('mengoptimasi, minify, dan menghitung penghematan', () => {
    const result = optimizeSvg(source, { removeMetadata: true, removeComments: true, removeGroups: true, simplifyAttributes: true, outputStyle: 'minify' })
    expect(result.data).not.toContain('metadata')
    expect(result.data).not.toContain('note')
    expect(svgSavings(source, result.data).optimizedBytes).toBeLessThan(svgSavings(source, result.data).originalBytes)
  })

  it('membuat Data URL dan nama output yang bersih', () => {
    expect(svgDataUrl('<svg/>')).toMatch(/^data:image\/svg\+xml;base64,/)
    expect(svgOutputBaseName('brand.final.SVG')).toBe('brand.final')
  })
})
