/**
 * Credential lifecycle: issuing then revoking a credential makes the lender check fail.
 */
import { test, expect } from '@playwright/test'
import { clearStore, setFastSpeed } from './helpers'

test.describe('Credential issue → revoke → lender check fails', () => {
  test.beforeEach(async ({ page }) => {
    await clearStore(page)
    await setFastSpeed(page)
  })

  test('issuing then revoking a credential makes the lender revocation check fail', async ({ page }) => {
    // 1. Go to Issuer portal (KYC) issue wizard for Rahul Das (robin-das, first row)
    await page.goto('/issuer/issuer-kyc/issue')
    await page.getByRole('button', { name: /Choose subject/i }).first().click()
    await expect(page.getByRole('button', { name: /^Continue/i })).toBeEnabled({ timeout: 10_000 })

    // Step 0 → Step 1 (Review claims)
    await page.getByRole('button', { name: /^Continue/i }).click()
    // Step 1 → Step 2 (Confirm consent)
    await page.getByRole('button', { name: /^Continue/i }).click()
    // Step 2: check consent & continue to signing
    await page.getByRole('checkbox', { name: /Confirm borrower consent/i }).click()
    await page.getByRole('button', { name: /Continue to signing/i }).click()
    // Step 3: sign & send to wallet
    await page.getByRole('button', { name: /Sign and prepare credential/i }).click()
    await expect(page.getByRole('button', { name: /Send to borrower wallet/i })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Send to borrower wallet/i }).click()
    await expect(page.getByText(/Credential delivered/i)).toBeVisible({ timeout: 10_000 })

    // 2. Navigate to Issued credentials and revoke the credential
    await page.getByText(/View credentials/i).click()
    await expect(page).toHaveURL(/\/issuer\/issuer-kyc\/credentials/)
    await page.getByRole('button', { name: /^Revoke$/i }).first().click()
    await page.getByRole('button', { name: /Revoke credential/i }).click()
    await expect(page.getByText(/Credential revoked/i).first()).toBeVisible({ timeout: 10_000 })

    // 3. Navigate to Lender portal → inspect Robin's request → "Not revoked" check fails
    await page.goto('/lender/lender-a/requests/req-qr-4821')
    await expect(page.getByText('Not revoked')).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByText(/marked revoked in its issuer status list/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})
