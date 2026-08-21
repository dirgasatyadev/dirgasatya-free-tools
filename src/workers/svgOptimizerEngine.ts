import { optimize, type CustomPlugin, type XastElement } from 'svgo/browser'
import { hasUnsafeSvgUrl, isAllowedSvgResourceReference, validateSvgInputSize } from '@/composables/svgSecurity'
import type { SvgDimensions, SvgOptimizeOptions, SvgOptimizerResult } from '@/composables/useSvgOptimizer'

const blockedElements = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video', 'link'])

function localName(name: string) {
  const parts = name.toLocaleLowerCase('en').split(':')
  return parts[parts.length - 1] ?? ''
}

function numericDimension(value: string | undefined) {
  if (!value || value.endsWith('%')) return 0
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function dimensionsFromRoot(root: XastElement): SvgDimensions {
  const viewBox = root.attributes.viewBox?.trim().split(/[\s,]+/).map(Number)
  const viewBoxWidth = viewBox?.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2]! > 0 ? viewBox[2]! : 0
  const viewBoxHeight = viewBox?.length === 4 && Number.isFinite(viewBox[3]) && viewBox[3]! > 0 ? viewBox[3]! : 0
  const width = Math.round(numericDimension(root.attributes.width) || viewBoxWidth || 512)
  const height = Math.round(numericDimension(root.attributes.height) || viewBoxHeight || 512)
  return { width, height, ratio: width / height }
}

function sanitizePlugin(): CustomPlugin {
  return {
    name: 'deargaSanitizeSvg',
    fn: () => ({
      root: {
        enter(root) {
          const elements = root.children.filter((child): child is XastElement => child.type === 'element')
          if (elements.length !== 1 || localName(elements[0]!.name) !== 'svg')
            throw new Error('Root document harus berupa elemen <svg>.')
        },
      },
      element: {
        enter(node, parentNode) {
          const name = localName(node.name)
          if (blockedElements.has(name)) {
            parentNode.children = parentNode.children.filter((child) => child !== node)
            return
          }
          if (name === 'style') {
            const css = node.children
              .filter((child) => child.type === 'text' || child.type === 'cdata')
              .map((child) => child.value)
              .join('')
            if (/@import/i.test(css) || hasUnsafeSvgUrl(css)) {
              parentNode.children = parentNode.children.filter((child) => child !== node)
              return
            }
          }
          for (const [attributeName, rawValue] of Object.entries(node.attributes)) {
            const normalizedName = attributeName.toLocaleLowerCase('en')
            const value = rawValue.trim()
            if (normalizedName.startsWith('on')
              || (((normalizedName === 'href' || normalizedName.endsWith(':href')) && value && !isAllowedSvgResourceReference(value)))
              || hasUnsafeSvgUrl(value)) delete node.attributes[attributeName]
          }
        },
      },
    }),
  }
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.toString().replace(/^Error:\s*/, '')
  return 'SVG gagal diproses.'
}

export function processSvg(source: string, options?: SvgOptimizeOptions): SvgOptimizerResult {
  validateSvgInputSize(source)
  try {
    const sanitized = optimize(source, {
      multipass: false,
      plugins: [sanitizePlugin()],
      js2svg: { pretty: false },
    }).data
    if (!options) {
      let dimensions: SvgDimensions | undefined
      const result = optimize(sanitized, {
        multipass: false,
        plugins: [{
          name: 'captureDimensions',
          fn: () => ({ element: { enter(node) { if (localName(node.name) === 'svg' && !dimensions) dimensions = dimensionsFromRoot(node) } } }),
        }],
        js2svg: { pretty: false },
      })
      return { data: result.data, dimensions: dimensions ?? { width: 512, height: 512, ratio: 1 } }
    }
    let dimensions: SvgDimensions | undefined
    const result = optimize(sanitized, {
      multipass: true,
      plugins: [
        {
          name: 'preset-default' as const,
          params: {
            overrides: {
              removeComments: options.removeComments ? {} : false,
              removeMetadata: options.removeMetadata ? null : false,
              collapseGroups: options.removeGroups ? null : false,
              cleanupAttrs: options.simplifyAttributes ? {} : false,
              cleanupNumericValues: options.simplifyAttributes ? {} : false,
              convertColors: options.simplifyAttributes ? {} : false,
            },
          },
        },
        {
          name: 'captureDimensions',
          fn: () => ({ element: { enter(node) { if (localName(node.name) === 'svg' && !dimensions) dimensions = dimensionsFromRoot(node) } } }),
        },
      ],
      js2svg: { pretty: options.outputStyle === 'prettify', indent: 2 },
    })
    return { data: result.data, dimensions: dimensions ?? { width: 512, height: 512, ratio: 1 } }
  } catch (error) {
    throw new Error(formatError(error))
  }
}
