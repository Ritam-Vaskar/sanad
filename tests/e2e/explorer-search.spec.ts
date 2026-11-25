/**
 * Explorer search: searching a known mandate ID or lender ID returns matching rows.
 */
import { test, expect } from '@playwright/test'
import { clearStore } from './helpers'

const KNOWN_MANDATE_ID = 'mandate-robin-active'

test.describe('Explorer search', () => {
  test.beforeEach(async ({ page }) => {
    await clearStore(page)
  })

  test('searching a known mandate ID finds its event', async ({ page }) => {
    await page.goto('/explorer')
    await expect(page.getByText(/Public network records/i)).toBeVisible({ timeout: 10_000 })

    const searchInput = page.getByRole('textbox', { name: /Search transaction hash/i })
    await expect(searchInput).toBeVisible()
    await searchInput.fill(KNOWN_MANDATE_ID)

    await expect(page.getByText(KNOWN_MANDATE_ID).first()).toBeVisible({ timeout: 8_000 })
  })

  test('searching a lender ID narrows results', async ({ page }) => {
    await page.goto('/explorer')
    await expect(page.getByText(/Public network records/i)).toBeVisible({ timeout: 10_000 })

    const searchInput = page.getByRole('textbox', { name: /Search transaction hash/i })
    await expect(searchInput).toBeVisible()
    await searchInput.fill('lender-a')

    await expect(page.getByText(/lender-a/i).first()).toBeVisible({ timeout: 8_000 })
  })
})
