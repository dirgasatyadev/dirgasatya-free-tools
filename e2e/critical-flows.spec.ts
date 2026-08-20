import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function uploadPng(page: Page, path: string, expectedText: string, fileCount = 1, width = 4, height = 4) {
  await page.goto(path)
  const dataUrl = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')!
    context.fillStyle = '#00ff00'
    context.fillRect(0, 0, width, height)
    return canvas.toDataURL('image/png')
  }, { width, height })
  const png = Buffer.from(dataUrl.split(',')[1]!, 'base64')
  await page.locator('input[type="file"]').first().setInputFiles(Array.from({ length: fileCount }, (_, index) => ({ name: `smoke-${index + 1}.png`, mimeType: 'image/png', buffer: png })))
  if (expectedText) await expect(page.getByText(expectedText, { exact: false })).toBeVisible({ timeout: 90_000 })
}

test('homepage dan katalog dapat dimuat', async ({ page }) => {
  const remoteIconRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('api.iconify.design')) remoteIconRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Selesaikan tugas kecil')
  await page.getByRole('link', { name: 'Jelajahi Free Tools' }).click()
  await expect(page.getByRole('heading', { name: 'Free Tools' })).toBeVisible()
  expect(remoteIconRequests).toEqual([])
})

test('direct route tool dapat dimuat dan memiliki SEO title', async ({ page }) => {
  await page.goto('/tools/cron-expression-builder')
  await expect(page.getByRole('heading', { name: 'Cron Expression Builder' })).toBeVisible()
  await expect(page).toHaveTitle('Cron Expression Builder - Dearga Free Tools')
})

test('navigasi SPA ke URL invalid menampilkan halaman 404', async ({ page }) => {
  await page.goto('/ini-tidak-ada')
  await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
})

test('PNG ke AVIF menghasilkan file', async ({ page }) => {
  await uploadPng(page, '/tools/png-to-avif', 'Semua file selesai dikonversi', 2)
  await expect(page.getByText('Download AVIF', { exact: false })).toHaveCount(2)
})

test('PNG ke WebP menghasilkan file lewat worker atau fallback', async ({ page }) => {
  await uploadPng(page, '/tools/png-to-webp', 'Semua file selesai dikonversi')
  await expect(page.getByText('Download WebP', { exact: false })).toBeVisible()
})

test('Green Screen menghasilkan PNG transparan', async ({ page }) => {
  await uploadPng(page, '/tools/green-screen-remover', 'Semua background hijau selesai dihapus')
  await expect(page.getByText('Download PNG', { exact: false })).toBeVisible()
})

test('Compress Image menghasilkan output', async ({ page }) => {
  await uploadPng(page, '/tools/compress-image', 'Semua file selesai dikompres')
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible()
})

test('ZIP dapat dibuat lalu dibaca kembali', async ({ page }) => {
  await page.goto('/tools/zip-creator-extractor')
  await page.locator('input[type="file"]').setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('hello ZIP') })
  await page.getByRole('button', { name: 'Buat ZIP', exact: true }).last().click()
  const resultLink = page.locator('a[download$=".zip"]')
  await expect(resultLink).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await resultLink.click()
  const download = await downloadPromise
  const zipPath = await download.path()
  expect(zipPath).not.toBeNull()
  await page.getByRole('button', { name: 'Ekstrak ZIP', exact: true }).click()
  await page.locator('input[type="file"]').setInputFiles({ name: 'archive.zip', mimeType: 'application/zip', buffer: await readFile(zipPath!) })
  await expect(page.getByText('hello.txt', { exact: true })).toBeVisible()
})

test('Regex catastrophic dihentikan oleh timeout worker', async ({ page }) => {
  await page.goto('/tools/regex-tester')
  await page.getByText('Pattern').locator('input').fill('(a+)+$')
  await page.getByText('Teks uji').locator('textarea').fill(`${'a'.repeat(100_000)}!`)
  await expect(page.getByText(/dihentikan setelah 500 ms/)).toBeVisible({ timeout: 10_000 })
})

test('Bcrypt worker membuat hash dan menolak cost eksternal di luar budget', async ({ page }) => {
  await page.goto('/tools/bcrypt-encoder-decoder')
  await page.getByLabel('Password', { exact: true }).fill('password-smoke')
  await page.getByLabel('Cost factor').fill('4')
  await page.getByRole('button', { name: 'Encode dengan Bcrypt' }).click()
  await expect(page.getByText('Encoded hash', { exact: true })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('tab', { name: 'Decoder / Verify' }).click()
  await page.getByLabel('Password yang diuji').fill('password-smoke')
  await page.getByLabel('Encoded hash Bcrypt').fill(`$2b$15$${'a'.repeat(53)}`)
  await page.getByRole('button', { name: 'Verifikasi password' }).click()
  await expect(page.getByRole('alert')).toContainText('antara 4 dan 14')
})

test('Image Resizer memproses batch lewat shared worker', async ({ page }) => {
  await uploadPng(page, '/tools/image-resizer-cropper', '', 2, 128, 96)
  await page.getByRole('button', { name: 'Crop', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Crop image' })).toBeVisible()
  await page.getByRole('button', { name: 'Terapkan crop' }).click()
  await expect(page.getByText(/Crop \d+×\d+/)).toBeVisible()
  await page.getByRole('button', { name: 'Resize semua gambar' }).click()
  await expect(page.getByText('Output 1920×1080', { exact: false })).toHaveCount(2, { timeout: 90_000 })
  await expect(page.getByRole('button', { name: 'Download semua sebagai ZIP' })).toBeVisible()
})

test('Universal Image Converter menghasilkan JPEG dari PNG', async ({ page }) => {
  await page.goto('/tools/universal-image-converter')
  const dataUrl = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 4; canvas.height = 4; canvas.getContext('2d')!.fillRect(0, 0, 4, 4); return canvas.toDataURL('image/png') })
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'universal.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1]!, 'base64') })
  await page.getByText('JPEG', { exact: true }).click()
  await page.getByRole('button', { name: 'Konversi semua gambar' }).click()
  await expect(page.getByText('Output 4×4', { exact: false })).toBeVisible({ timeout: 90_000 })
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible()
})

test('JSON Explorer menjalankan JSONPath dan menampilkan tree', async ({ page }) => {
  await page.goto('/tools/json-explorer-jsonpath')
  await expect(page.getByText('Tree explorer', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Run JSONPath' }).click()
  await expect(page.getByText('2 hasil', { exact: true })).toBeVisible()
  await expect(page.getByTestId('jsonpath-result-json')).toContainText('a@example.com')
  await expect(page.getByTestId('jsonpath-result-json')).toContainText('b@example.com')
  await expect(page.getByTestId('jsonpath-result-json')).not.toContainText('c@example.com')
})

test('JSON ke TypeScript menginfer nested interface dan opsi output', async ({ page }) => {
  await page.goto('/tools/json-to-typescript-generator')
  await expect(page.getByRole('heading', { name: 'JSON → TypeScript Generator' })).toBeVisible()
  const output = page.locator('textarea[readonly]')
  await expect(output).toHaveValue(/export interface Root/)
  await expect(output).toHaveValue(/roles: string\[\]/)
  await expect(output).toHaveValue(/profile: Profile/)
  await page.getByLabel('Root type name').fill('API response')
  await page.getByText('Type', { exact: true }).click()
  await page.getByText('Optional fields', { exact: true }).click()
  await page.getByText('Readonly properties', { exact: true }).click()
  await page.getByRole('button', { name: 'Generate TypeScript' }).click()
  await expect(output).toHaveValue(/export type APIResponse/)
  await expect(output).toHaveValue(/readonly id\?: number/)
})

test('SVG Optimizer memvalidasi, mengoptimasi, dan export PNG', async ({ page }) => {
  await page.goto('/tools/svg-optimizer-converter')
  await expect(page.getByRole('heading', { name: 'SVG Optimizer & Converter' })).toBeVisible()
  await page.getByRole('button', { name: 'Optimize SVG' }).click()
  await expect(page.getByRole('heading', { name: 'Optimized SVG' })).toBeVisible()
  const optimized = await page.locator('textarea[readonly]').inputValue()
  expect(optimized).not.toContain('<metadata>')
  expect(optimized).not.toContain('Exported from')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.png$/)
})

test('Code Formatter memakai shared engine dan route SEO bahasa', async ({ page }) => {
  await page.goto('/tools/html-formatter')
  await expect(page).toHaveTitle('HTML Formatter & Minifier - Dearga Free Tools')
  await page.getByRole('button', { name: 'Minify' }).click()
  await expect(page.locator('textarea[readonly]')).not.toHaveValue('', { timeout: 30_000 })
  expect(await page.locator('textarea[readonly]').inputValue()).not.toContain('\n')

  await page.getByRole('link', { name: 'TypeScript' }).click()
  await page.getByRole('button', { name: 'Minify' }).click()
  await expect(page.locator('textarea[readonly]')).not.toHaveValue('', { timeout: 30_000 })
  const typescriptOutput = await page.locator('textarea[readonly]').inputValue()
  expect(typescriptOutput).not.toContain('interface Tool')

  await page.getByRole('link', { name: 'SQL' }).click()
  await page.getByRole('button', { name: 'Beautify' }).click()
  await expect(page.locator('textarea[readonly]')).toHaveValue(/SELECT/, { timeout: 30_000 })
})
