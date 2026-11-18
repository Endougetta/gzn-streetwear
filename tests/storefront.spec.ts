import { expect, test } from '@playwright/test'
import { createHmac, randomUUID } from 'node:crypto'

test('catalog, gallery, cart persistence and waitlist form', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2, name: 'Hoodies' })).toBeVisible()
  await expect(page.locator('.card')).toHaveCount(17)
  await page.getByRole('link', { name: 'Shadow Schwarz', exact: true }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Shadow' })).toBeVisible()
  const gallery = page.getByRole('region', { name: 'Produktgalerie' })
  await expect(gallery.getByAltText('Shadow · Vorderseite')).toBeVisible()
  await gallery.getByRole('button', { name: 'Nächstes Bild' }).press('ArrowRight')
  await expect(gallery.getByAltText('Shadow · Rückseite')).toBeVisible()
  await page.getByRole('radio', { name: 'L', exact: true }).check()
  await page.getByLabel('Anzahl').selectOption('2')
  await page.getByRole('button', { name: 'Zur Auswahl hinzufügen' }).click()
  await expect(page.getByRole('dialog')).toContainText('Schwarz · L')
  await page.keyboard.press('Escape')
  await page.reload()
  await page.getByRole('button', { name: 'Auswahl 2' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('E-Mail-Adresse')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Zur Vormerkung' }).click()
  await dialog.getByLabel('E-Mail-Adresse').fill('browser-test@example.com')
  const submission = page.waitForRequest(request => request.url().endsWith('/api/waitlist') && request.method() === 'POST')
  await dialog.getByRole('button', { name: 'Vormerkung absenden' }).click()
  const { requestId } = (await submission).postDataJSON()
  await expect(dialog.getByRole('status')).toContainText('Schau in dein Postfach')
  await dialog.getByRole('button', { name: 'Weiterstöbern' }).click()
  await expect(page.getByRole('button', { name: 'Auswahl 0' })).toBeVisible()
  const token = createHmac('sha256', 'gzn-test-only-secret-0123456789abcdef').update('verification/' + requestId).digest('hex')
  await page.goto('/bestaetigen#token=' + token)
  await page.getByRole('button', { name: 'E-Mail-Adresse bestätigen' }).click()
  await expect(page.getByRole('status')).toContainText('Deine Vormerkung ist bestätigt')
})

test('D1 persistence, idempotency, confirmation and protected export', async ({ request }) => {
  const origin = 'http://localhost:8788'
  const headers = { Origin: origin }
  const authorization = { Authorization: 'Bearer gzn-test-only-admin-0123456789abcdef' }
  const data = {
    email: 'api-test@example.com', requestId: randomUUID(),
    items: [{ productId: 'hoodies-shadow-schwarz', size: 'M', quantity: 1 }],
  }
  const base = '/api/waitlist'
  expect((await request.post(base, { data })).status()).toBe(400)
  expect((await request.post(base, { data: { ...data, items: [{ ...data.items[0], quantity: 0 }] }, headers })).status()).toBe(400)
  expect((await request.post(base, { data, headers })).status()).toBe(202)
  expect((await request.post(base, { data, headers })).status()).toBe(202)
  expect((await request.post(base, { data: { ...data, email: 'other@example.com' }, headers })).status()).toBe(409)
  expect((await request.get('/api/admin')).status()).toBe(404)
  expect(await (await request.get('/api/admin', { headers: authorization })).text()).not.toContain(data.email)
  const token = createHmac('sha256', 'gzn-test-only-secret-0123456789abcdef').update('verification/' + data.requestId).digest('hex')
  expect((await request.post('/api/confirm', { data: { token: '0'.repeat(64) }, headers })).status()).toBe(404)
  expect((await request.post('/api/confirm', { data: { token }, headers })).status()).toBe(200)
  expect((await request.post('/api/confirm', { data: { token }, headers })).status()).toBe(200)
  expect((await request.patch('/api/admin?id=' + data.requestId, { headers: authorization })).status()).toBe(200)
  const csv = await (await request.get('/api/admin', { headers: authorization })).text()
  expect(csv.split('\r\n').filter(line => line.includes(data.email))).toHaveLength(1)
  expect(csv).toContain('"Shadow","Schwarz","M","1"')
})

test('mobile layout has no horizontal overflow and product without flat images still opens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const product = page.getByRole('link', { name: 'GZN Monogram Weiß', exact: true }).first()
  await product.click()
  await expect(page.getByAltText('GZN Monogram · Vorderseite am Model')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})

test('campaign image loads and product cards zoom before the rear image fades in', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const campaign = page.locator('.hero-visual img')
  await expect(campaign).toHaveCount(1)
  await expect.poll(() => campaign.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1536)
  await expect(campaign).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('gzn-desktop.png') })

  const card = page.getByRole('link', { name: 'Shadow Schwarz', exact: true }).first()
  const front = card.locator('.card-photos')
  const back = card.locator('.card-back')
  await expect(back).toHaveCSS('opacity', '0')
  await card.hover()
  await expect(back).toHaveCSS('transition-delay', '0.18s')
  await expect(front).not.toHaveCSS('transform', 'none')
  await expect(back).toHaveCSS('opacity', '1')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(front).toHaveCSS('transform', 'none')
  await expect(back).toHaveCSS('transition-delay', '0s')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await expect.poll(() => campaign.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1536)
  await page.screenshot({ path: testInfo.outputPath('gzn-mobile.png') })
})
