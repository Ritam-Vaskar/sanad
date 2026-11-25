import { expect, test, type Page } from '@playwright/test'

const passphrase = 'SanadDemo2026'

async function setSimulationSpeed(page: Page) {
  await page.getByRole('button', { name: 'Open demo controls' }).click()
  await page.getByRole('button', { name: '4×' }).click()
}

async function createWallet(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Launch demo' }).first().click()
  await page.getByRole('button', { name: 'Create your Sanad ID' }).click()
  await page.locator('#new-passphrase').fill(passphrase)
  await page.locator('#confirm-passphrase').fill(passphrase)
  await page.getByRole('button', { name: 'Create my Sanad ID' }).click()
  await expect(page.getByRole('heading', { name: 'Your passport' })).toBeVisible()
}

async function createAndSignPermission(page: Page) {
  await page.getByRole('link', { name: 'Assistant', exact: true }).click()
  await page.locator('#assistant-message').fill('I need a loan up to 50,000 for repairing my delivery vehicle. Keep EMI below 3,000.')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByRole('button', { name: 'Review and sign' }).waitFor({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Review and sign' }).click()
  await page.locator('#signing-passphrase').fill(passphrase)
  await page.getByRole('button', { name: 'Sign with Sanad ID' }).click()
}

test('completes the borrower golden path through signed offer acceptance', async ({ page }) => {
  await createWallet(page)
  await setSimulationSpeed(page)

  await page.getByRole('link', { name: 'Add proof' }).click()
  await page.getByRole('button', { name: /Identity proof/ }).click()
  await page.getByRole('checkbox', { name: 'I agree to this issuer reading the listed synthetic data' }).check()
  await page.getByRole('button', { name: 'Confirm and add proof' }).click()
  await page.getByRole('link', { name: 'Back to passport' }).waitFor({ timeout: 10_000 })
  await page.getByRole('link', { name: 'Back to passport' }).click()

  await createAndSignPermission(page)
  await page.getByRole('button', { name: 'Watch your agent' }).click()
  await page.getByRole('link', { name: 'See offers' }).waitFor({ timeout: 30_000 })
  await page.getByRole('link', { name: 'See offers' }).click()

  await expect(page.getByRole('heading', { name: 'Your best offers' })).toBeVisible()
  await expect(page.getByText('QuickRepair Micro Finance').first()).toBeVisible()
  await expect(page.getByText('Gramin Working Capital NBFC').first()).toBeVisible()
  await page.getByRole('button', { name: 'Accept this offer' }).first().click()

  const signAcceptance = page.getByRole('button', { name: 'Sign to accept' })
  await expect(signAcceptance).toBeDisabled()
  await page.getByRole('checkbox', { name: 'I understand the final loan terms' }).check()
  await page.locator('#offer-passphrase').fill(passphrase)
  await expect(signAcceptance).toBeEnabled()
  await signAcceptance.click()
  await expect(page.getByText('Offer accepted')).toBeVisible({ timeout: 10_000 })
})
