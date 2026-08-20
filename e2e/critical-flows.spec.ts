import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function uploadPng(page: Page, path: string, expectedText: string) {
  await page.goto(path)
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    const context = canvas.getContext('2d')!
    context.fillStyle = '#00ff00'
    context.fillRect(0, 0, 4, 4)
    return canvas.toDataURL('image/png')
  })
  const png = Buffer.from(dataUrl.split(',')[1]!, 'base64')
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'smoke.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByText(expectedText, { exact: false })).toBeVisible({ timeout: 90_000 })
}

test('homepage dan katalog dapat dimuat', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Selesaikan tugas kecil')
  await page.getByRole('link', { name: 'Jelajahi Free Tools' }).click()
  await expect(page.getByRole('heading', { name: 'Free Tools' })).toBeVisible()
})

test('direct route tool dapat dimuat dan memiliki SEO title', async ({ page }) => {
  await page.goto('/tools/cron-expression-builder')
  await expect(page.getByRole('heading', { name: 'Cron Expression Builder' })).toBeVisible()
  await expect(page).toHaveTitle('Cron Expression Builder - Dearga Free Tools')
})

test('PNG ke AVIF menghasilkan file', async ({ page }) => {
  await uploadPng(page, '/tools/png-to-avif', 'Semua file selesai dikonversi')
  await expect(page.getByText('Download AVIF', { exact: false })).toBeVisible()
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
