import { expect, test } from '@playwright/test'

test('Jobs: suchen, auswählen und PDF vorbereiten', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Angebote suchen' }).click()
  await expect(page.getByRole('heading', { name: /Angebote? gefunden/ })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Für PDF auswählen' }).first().check()
  await page.getByRole('button', { name: /Angebot ausgewählt/ }).click()
  await expect(page.getByRole('heading', { name: 'Auswahl prüfen' })).toBeVisible()
  await page.getByRole('button', { name: 'PDF-Vorschau öffnen' }).click()
  await expect(page.getByRole('dialog', { name: /Stellenangebote_Innsbruck/ })).toBeVisible({ timeout: 15_000 })
})

test('Wohnungen: Suche und Auswahl funktionieren', async ({ page }) => {
  await page.goto('./')
  await page.getByText('Wohnungen', { exact: true }).click()
  await page.getByText('Innsbruck + Umgebung', { exact: true }).click()
  await page.getByRole('button', { name: 'Angebote suchen' }).click()
  await expect(page.getByRole('heading', { name: /Angebote? gefunden/ })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Für PDF auswählen' }).first().check()
  await expect(page.getByRole('button', { name: /Angebot ausgewählt/ })).toBeVisible()
})

test('Auswahl bleibt nach Reload erhalten', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Angebote suchen' }).click()
  await page.getByRole('checkbox', { name: 'Für PDF auswählen' }).first().check()
  await expect(page.getByRole('button', { name: /Angebot ausgewählt/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /Angebot ausgewählt/ })).toBeVisible()
})

test('Keine Ergebnisse wird verständlich behandelt', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Suchbegriff').fill('dieser-suchbegriff-existiert-sicher-nicht-92817')
  await page.getByRole('button', { name: 'Angebote suchen' }).click()
  await expect(page.getByRole('heading', { name: 'Keine passenden Angebote' })).toBeVisible()
})

test('Fehlerhafte Datenquelle zeigt einen Fehlerzustand', async ({ page }) => {
  await page.route('**/data/jobs.json', (route) => route.fulfill({ status: 503, body: '' }))
  await page.goto('./')
  await expect(page.getByRole('alert')).toContainText('Die ÖH-Daten konnten derzeit nicht geladen werden.')
})
