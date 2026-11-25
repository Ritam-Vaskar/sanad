/**
 * Shared Playwright helpers for the SANAD demo (mock mode).
 */
import { type Page, expect } from '@playwright/test'

/** Set demo speed to 4× in Zustand persist storage (`sanad-demo-v1`) once per session. */
export async function setFastSpeed(page: Page) {
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem('sanad-demo-v1')
      const parsed: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : { state: {}, version: 0 }
      const state = (parsed.state as Record<string, unknown>) ?? {}
      state.speed = 4
      parsed.state = state
      localStorage.setItem('sanad-demo-v1', JSON.stringify(parsed))
    } catch {
      // ignore
    }
  })
}

/** Clear the persisted Zustand store once per browser session so client/page reloads keep state. */
export async function clearStore(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__sanad_e2e_cleared')) {
      sessionStorage.setItem('__sanad_e2e_cleared', '1')
      localStorage.removeItem('sanad-demo-v1')
    }
  })
}

/**
 * Create and unlock a real ECDSA wallet in the browser via /borrower/onboarding.
 * Leaves the page on /borrower with walletUnlocked=true and signingKey in memory.
 */
export async function createAndUnlockWallet(page: Page, passphrase = 'test123') {
  await page.goto('/borrower/onboarding')
  await page.getByRole('button', { name: /Create your Sanad ID/i }).click()
  await page.locator('#new-passphrase').fill(passphrase)
  await page.locator('#confirm-passphrase').fill(passphrase)
  await page.getByRole('button', { name: /Create my Sanad ID/i }).click()
  await expect(page.getByText(/Your Sanad ID is ready/i)).toBeVisible()
  await page.getByRole('button', { name: /Open your passport/i }).click()
  await expect(page).toHaveURL(/\/borrower$/)
}
