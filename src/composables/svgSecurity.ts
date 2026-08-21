export const maxSvgInputBytes = 2 * 1024 * 1024

export function isAllowedSvgResourceReference(value: string) {
  const reference = value.trim()
  return /^#[A-Za-z_][\w:.-]*$/.test(reference)
    || /^data:image\/(?:png|jpeg|webp|gif)(?:;[^,]*)?,/i.test(reference)
}

export function hasUnsafeSvgUrl(value: string) {
  if (!/url\s*\(/i.test(value)) return false
  let unsafe = false
  let matches = 0
  const withoutParsedUrls = value.replace(
    /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi,
    (_match, doubleQuoted: string | undefined, singleQuoted: string | undefined, bare: string | undefined) => {
      matches += 1
      if (!isAllowedSvgResourceReference(doubleQuoted ?? singleQuoted ?? bare ?? '')) unsafe = true
      return ''
    },
  )
  return unsafe || matches === 0 || /url\s*\(/i.test(withoutParsedUrls)
}

export function validateSvgInputSize(source: string) {
  if (!source.trim()) throw new Error('Masukkan SVG terlebih dahulu.')
  if (new TextEncoder().encode(source).length > maxSvgInputBytes)
    throw new Error('Input SVG maksimal 2 MB.')
}
