export interface RouteSeoData {
  title: string
  description: string
  path: string
  applicationName?: string
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = content
}

export function toolSeoTitle(name: string) {
  if (name === 'Green Screen Remover') return 'Free Online Green Screen Remover'
  if (/\bto\b/i.test(name) && !/Converter/i.test(name)) return `${name} Converter`
  return name
}

export function updateRouteSeo(data: RouteSeoData) {
  const fullTitle = `${data.title} - Dearga Free Tools`
  const canonicalUrl = new URL(data.path, window.location.origin).href
  document.title = fullTitle
  setMeta('meta[name="description"]', 'name', 'description', data.description)
  setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle)
  setMeta('meta[property="og:description"]', 'property', 'og:description', data.description)
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl)
  setMeta('meta[property="og:type"]', 'property', 'og:type', 'website')
  setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary')
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle)
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', data.description)
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.append(canonical)
  }
  canonical.href = canonicalUrl
  let jsonLd = document.head.querySelector<HTMLScriptElement>('#route-json-ld')
  if (!jsonLd) {
    jsonLd = document.createElement('script')
    jsonLd.id = 'route-json-ld'
    jsonLd.type = 'application/ld+json'
    document.head.append(jsonLd)
  }
  jsonLd.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': data.applicationName ? 'WebApplication' : 'WebSite',
    name: data.applicationName ?? data.title,
    description: data.description,
    url: canonicalUrl,
    ...(data.applicationName ? { applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } } : {}),
  })
}
