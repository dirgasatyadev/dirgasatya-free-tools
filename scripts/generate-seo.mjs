import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const distRoot = new URL('../dist/', import.meta.url)
const distPath = fileURLToPath(distRoot)
const source = await readFile(new URL('../src/data/tools.ts', import.meta.url), 'utf8')
const sourceFile = ts.createSourceFile('tools.ts', source, ts.ScriptTarget.Latest, true)
const aliasSource = await readFile(new URL('../src/data/toolAliases.ts', import.meta.url), 'utf8')
const aliasSourceFile = ts.createSourceFile('toolAliases.ts', aliasSource, ts.ScriptTarget.Latest, true)

function propertyText(object, name, file = sourceFile) {
  const property = object.properties.find((item) => ts.isPropertyAssignment(item) && item.name.getText(file).replaceAll(/["']/g, '') === name)
  return property && ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer) ? property.initializer.text : ''
}

function findArray(file, variableName) {
  let array
  file.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return
    for (const declaration of node.declarationList.declarations) {
      if (declaration.name.getText(file) === variableName && declaration.initializer && ts.isArrayLiteralExpression(declaration.initializer)) array = declaration.initializer
    }
  })
  return array
}

const registry = findArray(sourceFile, 'toolRegistry')
if (!registry) throw new Error('toolRegistry tidak ditemukan untuk generator SEO.')
const aliasRegistry = findArray(aliasSourceFile, 'codeFormatterAliases')
if (!aliasRegistry) throw new Error('codeFormatterAliases tidak ditemukan untuk generator SEO.')

function seoTitle(name) {
  if (name === 'Green Screen Remover') return 'Free Online Green Screen Remover'
  if (/\bto\b/i.test(name) && !/Converter/i.test(name)) return `${name} Converter`
  return name
}

const tools = registry.elements.filter(ts.isObjectLiteralExpression).map((object) => ({
  name: propertyText(object, 'name'),
  description: propertyText(object, 'description'),
  path: propertyText(object, 'path'),
})).filter((tool) => tool.name && tool.description && tool.path)
const aliases = aliasRegistry.elements.filter(ts.isObjectLiteralExpression).map((object) => ({
  name: propertyText(object, 'title', aliasSourceFile),
  title: propertyText(object, 'title', aliasSourceFile),
  description: propertyText(object, 'description', aliasSourceFile),
  path: propertyText(object, 'path', aliasSourceFile),
  applicationName: propertyText(object, 'title', aliasSourceFile),
})).filter((route) => route.title && route.description && route.path)

const routes = [
  { path: '/', title: 'Dearga Free Tools', description: 'Kumpulan free tool praktis untuk developer, kreator, dan pekerja digital.' },
  { path: '/free-tools', title: 'Free Online Tools', description: 'Jelajahi koleksi utility gratis untuk developer, teks, gambar, data, keamanan, dan produktivitas.' },
  { path: '/about', title: 'About', description: 'Tentang Dearga Free Tools dan prinsip pemrosesan data secara lokal di browser.' },
  { path: '/changelog', title: 'Changelog', description: 'Riwayat fitur, peningkatan, keamanan, dan perubahan Dearga Free Tools.' },
  ...tools.map((tool) => ({ ...tool, title: seoTitle(tool.name), applicationName: tool.name })),
  ...aliases,
]
const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://tools.dirgasatya.com').replace(/\/$/, '')
const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function render(route) {
  const title = route.title === 'Dearga Free Tools' ? route.title : `${route.title} - Dearga Free Tools`
  const url = `${siteUrl}${route.path === '/' ? '/' : route.path}`
  const schema = {
    '@context': 'https://schema.org',
    '@type': route.applicationName ? 'WebApplication' : 'WebSite',
    name: route.applicationName ?? route.title,
    description: route.description,
    url,
    ...(route.applicationName ? { applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } } : {}),
  }
  const tags = `<link rel="canonical" href="${escapeHtml(url)}"><meta name="robots" content="${route.robots ?? 'index, follow'}"><meta property="og:url" content="${escapeHtml(url)}"><script id="route-json-ld" type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`
  return template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(route.description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(route.description)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(route.description)}">`)
    .replace('</head>', `${tags}</head>`)
    .replace('<div id="app"></div>', `<div id="app"><main><h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p></main></div>`)
}

const notFoundRoute = { path: '/404', title: 'Halaman Tidak Ditemukan', description: 'Halaman yang Anda cari tidak tersedia di Dearga Free Tools.', robots: 'noindex, nofollow' }

for (const route of routes) {
  const output = route.path === '/' ? new URL('../dist/index.html', import.meta.url) : new URL(`../dist${route.path}/index.html`, import.meta.url)
  await mkdir(dirname(fileURLToPath(output)), { recursive: true })
  await writeFile(fileURLToPath(output), render(route), 'utf8')
}

await writeFile(join(distPath, '404.html'), render(notFoundRoute), 'utf8')

const today = new Date().toISOString().slice(0, 10)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${siteUrl}${route.path === '/' ? '/' : route.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`
await writeFile(join(distPath, 'sitemap.xml'), sitemap, 'utf8')
await writeFile(join(distPath, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8')
console.log(`Generated SEO HTML for ${routes.length} routes and 404 page.`)
