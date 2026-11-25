/**
 * Stop-agent test: starting a run and clicking "Stop agent" halts it.
 */
import { test, expect } from '@playwright/test'
import { clearStore, createAndUnlockWallet, setFastSpeed } from './helpers'

test.describe('Stop agent', () => {
  test.beforeEach(async ({ page }) => {
    await clearStore(page)
    await setFastSpeed(page)
    await createAndUnlockWallet(page, 'test123')
  })

  test('Stop agent button halts a running run', async ({ page }) => {
    // 1. Navigate client-side to assistant & create a mandate
    await page.getByRole('button', { name: /Ask your loan assistant/i }).click()
    await expect(page).toHaveURL(/\/borrower\/assistant/)

    await page.locator('#assistant-message').fill('I need a loan up to 50,000 for repairing my delivery vehicle. Keep EMI below 3,000.')
    await page.keyboard.press('Enter')

    await expect(page.getByText(/Permission slip/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Review and sign/i }).last().click()
    await page.locator('#signing-passphrase').fill('test123')
    await page.getByRole('button', { name: /Sign with Sanad ID/i }).click()

    // 2. Start the run
    await expect(page.getByText(/Your agent permission is ready/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Watch your agent/i }).click()
    await expect(page).toHaveURL(/\/borrower\/runs\//)

    // 3. Click "Stop agent" while running (opens confirm dialog)
    await expect(page.getByText(/Live loan search/i)).toBeVisible({ timeout: 10_000 })
    const stopButton = page.getByRole('button', { name: /Stop agent/i })
    await expect(stopButton).toBeEnabled({ timeout: 10_000 })
    await stopButton.click()

    // 4. Confirm in dialog
    await page.getByRole('button', { name: /Stop agent/i }).last().click()

    // 5. Verify run halted
    await expect(
      page.getByText(/Blocked: permission revoked|Agent stopped/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})
