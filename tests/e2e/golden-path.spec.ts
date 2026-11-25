/**
 * Golden path: landing → create wallet → assistant → run → accept offer.
 */
import { test, expect } from '@playwright/test'
import { clearStore, createAndUnlockWallet, setFastSpeed } from './helpers'

test.describe('Golden path – landing to accepted offer', () => {
  test.beforeEach(async ({ page }) => {
    await clearStore(page)
    await setFastSpeed(page)
  })

  test('landing page shows all six portal cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Borrower', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Issuer', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lender', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Trust Admin', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Trust Explorer', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Attack Lab', exact: true })).toBeVisible()
    await expect(page.locator('#portals a[href="/borrower"]')).toBeVisible()
    await expect(page.locator('#portals a[href="/lab"]')).toBeVisible()
  })

  test('full golden path from landing to accepted offer', async ({ page }) => {
    // 1. Landing → Borrower portal
    await page.goto('/')
    await page.locator('#portals a[href="/borrower"]').click()
    await expect(page).toHaveURL(/\/borrower/)

    // 2. Create Sanad ID & open passport
    await createAndUnlockWallet(page, 'test123')
    await expect(page.getByRole('heading', { name: /Your passport/i })).toBeVisible()

    // 3. Go to assistant & request a loan
    await page.getByRole('button', { name: /Ask your loan assistant/i }).click()
    await expect(page).toHaveURL(/\/borrower\/assistant/)

    const textarea = page.locator('#assistant-message')
    await textarea.fill('I need a loan up to 50,000 for repairing my delivery vehicle. Keep EMI below 3,000.')
    await page.keyboard.press('Enter')

    // 4. Permission slip appears → Review and sign → Sign with Sanad ID
    await expect(page.getByText(/Permission slip/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Review and sign/i }).last().click()
    await page.locator('#signing-passphrase').fill('test123')
    await page.getByRole('button', { name: /Sign with Sanad ID/i }).click()

    // 5. Mandate recorded → Watch your agent
    await expect(page.getByText(/Your agent permission is ready/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Watch your agent/i }).click()
    await expect(page).toHaveURL(/\/borrower\/runs\//)

    // 6. Wait for run to finish at 4× speed → See offers
    const seeOffersBtn = page.getByRole('link', { name: /See offers/i })
      .or(page.getByRole('button', { name: /See offers/i }))
    await expect(seeOffersBtn).toBeVisible({ timeout: 25_000 })
    await seeOffersBtn.click()
    await expect(page).toHaveURL(/\/borrower\/offers\//)

    // 7. Accept the best offer
    await page.getByRole('button', { name: /Accept this offer/i }).first().click()
    await page.getByRole('checkbox', { name: /I understand the final loan terms/i }).click()
    await page.locator('#offer-passphrase').fill('test123')
    await page.getByRole('button', { name: /Sign to accept/i }).click()

    // 8. Loan summary ready
    await expect(page.getByText(/Your loan summary is ready/i)).toBeVisible({ timeout: 10_000 })
  })
})
