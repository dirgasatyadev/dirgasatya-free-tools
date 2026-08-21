import { appendFile, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { evaluateBundleBudget } from './bundle-budget-policy.mjs'

const projectRoot = process.cwd()
const outputDirectory = path.join(projectRoot, 'dist')
const manifestPath = path.join(outputDirectory, '.vite', 'manifest.json')
const baselinePath = path.join(projectRoot, 'bundle-budget-baseline.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
const records = Object.entries(manifest)
const byFile = new Map(records.map(([key, value]) => [value.file, { key, ...value }]))
const fileSizeCache = new Map()

const absoluteBudgets = {
  initialGzipBytes: 250 * 1024,
  largestRouteGzipBytes: 600 * 1024,
}

if (baseline.schemaVersion !== 1
  || !Number.isFinite(baseline.regressionTolerance)
  || baseline.regressionTolerance < 0
  || !Number.isSafeInteger(baseline.metrics?.initialGzipBytes)
  || !Number.isSafeInteger(baseline.metrics?.largestRouteGzipBytes))
  throw new Error('bundle-budget-baseline.json tidak valid.')

async function sizeOf(file) {
  if (!fileSizeCache.has(file)) {
    const content = await readFile(path.join(outputDirectory, file))
    fileSizeCache.set(file, { rawBytes: content.byteLength, gzipBytes: gzipSync(content).byteLength })
  }
  return fileSizeCache.get(file)
}

function collectStaticGraph(entry, excluded = new Set()) {
  const files = new Set()
  const visit = (record) => {
    if (!record || files.has(record.file) || excluded.has(record.file)) return
    files.add(record.file)
    for (const imported of record.imports ?? []) visit(manifest[imported] ?? byFile.get(imported))
  }
  visit(entry)
  return files
}

async function summarizeFiles(files) {
  let rawBytes = 0
  let gzipBytes = 0
  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const size = await sizeOf(file)
    rawBytes += size.rawBytes
    gzipBytes += size.gzipBytes
  }
  return { rawBytes, gzipBytes, files: [...files].filter((file) => file.endsWith('.js')).sort() }
}

async function includeReferencedWorkers(files, outputFiles) {
  const expanded = new Set(files)
  const workerFiles = outputFiles.filter((file) => /\.worker-[^/]+\.js$/.test(file))
  const queue = [...expanded].filter((file) => file.endsWith('.js'))
  while (queue.length > 0) {
    const file = queue.pop()
    const content = await readFile(path.join(outputDirectory, file), 'utf8')
    for (const workerFile of workerFiles) {
      if (expanded.has(workerFile) || !content.includes(path.basename(workerFile))) continue
      expanded.add(workerFile)
      queue.push(workerFile)
    }
  }
  return expanded
}

function findSource(source) {
  return records.find(([, record]) => record.src === source)?.[1]
}

async function walk(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await walk(absolute))
    else output.push(path.relative(outputDirectory, absolute).replaceAll('\\', '/'))
  }
  return output
}

const entry = records.find(([, record]) => record.isEntry)?.[1]
if (!entry) throw new Error('Vite manifest tidak memiliki entry utama.')
const outputFiles = await walk(outputDirectory)
const initialFiles = await includeReferencedWorkers(collectStaticGraph(entry), outputFiles)
const initial = await summarizeFiles(initialFiles)
const routeDefinitions = [
  ['Image Studio', 'src/pages/ImageStudioPage.vue'],
  ['Code Formatter', 'src/pages/CodeFormatterPage.vue'],
  ['SVG Optimizer', 'src/pages/SvgOptimizerPage.vue'],
]
const routes = []
for (const [name, source] of routeDefinitions) {
  const record = findSource(source)
  if (!record) throw new Error(`Chunk route tidak ditemukan di manifest: ${source}`)
  const files = await includeReferencedWorkers(collectStaticGraph(record, initialFiles), outputFiles)
  routes.push({ name, source, ...await summarizeFiles(files) })
}
const pageRoutes = []
for (const [, record] of records.filter(([, value]) => value.src?.startsWith('src/pages/'))) {
  const files = await includeReferencedWorkers(collectStaticGraph(record, initialFiles), outputFiles)
  pageRoutes.push({ source: record.src, ...await summarizeFiles(files) })
}
pageRoutes.sort((left, right) => right.gzipBytes - left.gzipBytes)
const wasm = []
for (const file of outputFiles.filter((file) => file.endsWith('.wasm'))) {
  const size = await sizeOf(file)
  wasm.push({ file, rawBytes: size.rawBytes, gzipBytes: size.gzipBytes })
}
wasm.sort((left, right) => right.rawBytes - left.rawBytes)

const budgetResults = [
  evaluateBundleBudget({ name: 'Homepage JS', currentBytes: initial.gzipBytes, absoluteBudgetBytes: absoluteBudgets.initialGzipBytes, baselineBytes: baseline.metrics.initialGzipBytes, regressionTolerance: baseline.regressionTolerance }),
  evaluateBundleBudget({ name: 'Largest route', currentBytes: pageRoutes[0]?.gzipBytes ?? 0, absoluteBudgetBytes: absoluteBudgets.largestRouteGzipBytes, baselineBytes: baseline.metrics.largestRouteGzipBytes, regressionTolerance: baseline.regressionTolerance }),
]
const failures = budgetResults.filter((result) => result.status === 'FAIL')

const report = {
  generatedAt: new Date().toISOString(),
  note: 'Route gzip adalah biaya incremental di luar static graph initial homepage, termasuk worker JS dan tidak termasuk WASM. Budget absolut berlaku langsung; metrik legacy di atas budget hanya boleh tumbuh maksimal sesuai toleransi baseline.',
  budgets: absoluteBudgets,
  gate: {
    regressionTolerance: baseline.regressionTolerance,
    passed: failures.length === 0,
    results: budgetResults,
  },
  initial,
  routes,
  largestRoute: pageRoutes[0] ?? null,
  wasm,
}
const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`
const initialBudget = budgetResults[0]
const largestRouteBudget = budgetResults[1]
const rows = [
  ['Homepage JS', initial.rawBytes, initial.gzipBytes, initialBudget.absoluteBudgetBytes, initialBudget.gateBytes, initialBudget.status],
  ...routes.map((route) => [route.name, route.rawBytes, route.gzipBytes, null, null, 'INFO']),
]
if (report.largestRoute) rows.push([
  `Largest route (${report.largestRoute.source.replace('src/pages/', '')})`,
  report.largestRoute.rawBytes,
  report.largestRoute.gzipBytes,
  largestRouteBudget.absoluteBudgetBytes,
  largestRouteBudget.gateBytes,
  largestRouteBudget.status,
])
for (const asset of wasm) rows.push([asset.file, asset.rawBytes, asset.gzipBytes, null, null, 'TRACKED'])

const markdown = [
  '## Bundle size report',
  '',
  '| Bundle | Raw | Gzip | Target | Gate | Status |',
  '| --- | ---: | ---: | ---: | ---: | --- |',
  ...rows.map(([name, raw, gzip, budget, gate, rowStatus]) => `| ${name} | ${kib(raw)} | ${kib(gzip)} | ${budget ? kib(budget) : '—'} | ${gate ? kib(gate) : '—'} | ${rowStatus} |`),
  '',
  `Toleransi regresi baseline: ${(baseline.regressionTolerance * 100).toFixed(0)}%. Status BASELINE berarti ukuran masih di atas target absolut, tetapi belum melewati gate regresi.`,
  '',
  report.note,
  '',
].join('\n')

await writeFile(path.join(projectRoot, 'bundle-report.json'), `${JSON.stringify(report, null, 2)}\n`)
await writeFile(path.join(projectRoot, 'bundle-report.md'), markdown)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown)
process.stdout.write(`\n${markdown}`)
if (failures.length > 0) {
  for (const failure of failures)
    process.stderr.write(`Bundle budget gagal: ${failure.name} ${kib(failure.currentBytes)} > gate ${kib(failure.gateBytes)}.\n`)
  process.exitCode = 1
}
