/**
 * Attack Lab: all 8 scenarios must end with result = "Blocked".
 */
import { test, expect } from '@playwright/test'
import { clearStore, setFastSpeed } from './helpers'

const ATTACK_SCENARIO_TITLES = [
  'Tamper with an income claim',
  'Use an untrusted issuer',
  'Present expired KYC',
  'Replay an old presentation',
  'Request over the ₹1,00,000 cap',
  'Disclose employer name',
  'Accept without borrower signature',
  'Revoke mandate mid-run',
]

test.describe('Attack Lab – all 8 scenarios blocked', () => {
  test.beforeEach(async ({ page }) => {
    await clearStore(page)
    await setFastSpeed(page)
  })

  test('Run all shows Blocked for every scenario', async ({ page }) => {
    await page.goto('/lab')

    await expect(page.getByText(ATTACK_SCENARIO_TITLES[0])).toBeVisible({ timeout: 10_000 })

    const runAllButton = page.getByRole('button', { name: /Run all/i })
    await expect(runAllButton).toBeEnabled()
    await runAllButton.click()

    // StatCard updates to "8 / 8" when all 8 scenarios complete
    await expect(page.getByText('8 / 8')).toBeVisible({ timeout: 30_000 })

    // Results table has 8 rows and every row shows "Blocked"
    const resultRows = page.locator('table tbody tr')
    await expect(resultRows).toHaveCount(8)
    for (let i = 0; i < 8; i++) {
      await expect(resultRows.nth(i).getByText('Blocked')).toBeVisible()
    }
  })

  test('Individual scenario ends Blocked', async ({ page }) => {
    await page.goto('/lab')

    await expect(page.getByText(ATTACK_SCENARIO_TITLES[0])).toBeVisible({ timeout: 10_000 })

    // Button has aria-label="Run Tamper with an income claim"
    await page.getByRole('button', { name: `Run ${ATTACK_SCENARIO_TITLES[0]}` }).click()

    await expect(page.getByText('1 / 8')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table tbody tr').first().getByText('Blocked')).toBeVisible()
  })
})
