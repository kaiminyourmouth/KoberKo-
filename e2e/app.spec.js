import { expect, test } from '@playwright/test';

async function resetApp(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('koberko_lang', 'en');
    localStorage.setItem('koberko_app_tutorial_seen', 'true');
  });
}

async function goToFind(page) {
  await page.getByRole('tab', { name: /find tab/i }).click();
  await expect(page.getByPlaceholder(/search for a condition/i)).toBeVisible();
}

async function runCapFlow(page) {
  await goToFind(page);
  await page.getByPlaceholder(/search for a condition/i).fill('pneumonia');
  await page.getByRole('button', { name: /community-acquired pneumonia/i }).first().click();
  await page.getByRole('button', { name: /employed \(sss\)/i }).click();
  await page.getByRole('button', { name: /^level 2/i }).click();
  await page.getByRole('button', { name: /doh \/ government hospital/i }).click();
  await page.getByRole('button', { name: /ward \(shared room\)/i }).click();
  await page.getByRole('button', { name: /see coverage/i }).click();
}

test.beforeEach(async ({ page }) => {
  await resetApp(page);
  await page.goto('/');
});

test('Find flow shows CAP coverage result and guide content', async ({ page }) => {
  await runCapFlow(page);

  await expect(page.locator('.hero-card__amount').filter({ hasText: '₱29,250' })).toBeVisible();
  await expect(page.locator('.df-badge__text').filter({ hasText: 'DIRECT FILING' })).toBeVisible();
  await expect(page.getByText(/Zero Balance Billing|No Balance Billing/i)).toBeVisible();

  await page.getByRole('button', { name: /see guide/i }).click();
  await expect(page.getByText(/documents needed/i)).toBeVisible();
  await expect(page.getByText(/say this to billing/i)).toBeVisible();
});

test('Save, view, and delete saved result works end to end', async ({ page }) => {
  await runCapFlow(page);
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByRole('button', { name: /saved/i })).toBeVisible();

  await page.getByRole('tab', { name: /account tab/i }).click();
  await page.getByRole('button', { name: /saved results/i }).click();

  await expect(page.getByText(/community-acquired pneumonia/i)).toBeVisible();
  await page.getByRole('button', { name: /^view$/i }).click();
  await expect(page.locator('.hero-card__amount').filter({ hasText: '₱29,250' })).toBeVisible();

  await page.getByRole('tab', { name: /account tab/i }).click();
  await page.getByRole('button', { name: /saved results/i }).click();
  await page.getByRole('button', { name: /^delete$/i }).click();
  await page.getByRole('button', { name: /^delete$/i }).last().click();
  await expect(page.getByText(/nothing saved yet/i)).toBeVisible();
});

test('Language toggle persists after reload', async ({ page }) => {
  await expect(page.getByRole('button', { name: /english/i })).toBeVisible();
  await page.getByRole('button', { name: /english/i }).click();
  await expect(page.getByRole('tab', { name: /find tab/i })).toContainText('Find');

  await page.reload();
  await expect(page.getByRole('tab', { name: /find tab/i })).toContainText('Find');
  await page.getByRole('tab', { name: /find tab/i }).click();
  await expect(page.getByPlaceholder(/search for a condition/i)).toBeVisible();
});

test('After-discharge denied-claim flow shows denial guide and appeals', async ({ page }) => {
  await page.getByRole('tab', { name: /intake tab/i }).click();
  await page.getByRole('button', { name: /already discharged, want to reimburse/i }).click();
  await page.getByRole('button', { name: /claim was denied/i }).click();

  await expect(page.getByText(/denial guide and appeals process/i)).toBeVisible();
  await expect(page.getByText(/top reasons for denial/i)).toBeVisible();
  await expect(page.getByText(/3-step appeals process timeline/i)).toBeVisible();
  await expect(page.getByText(/before you give up, read this/i)).toBeVisible();
});

test('Find result shows hospital accreditation guidance', async ({ page }) => {
  await goToFind(page);
  await page.getByPlaceholder(/search for a condition/i).fill('pneumonia');
  await page.getByRole('button', { name: /community-acquired pneumonia/i }).first().click();
  await page.getByRole('button', { name: /employed \(sss\)/i }).click();
  await page.getByRole('button', { name: /^level 3/i }).click();
  await page.getByRole('button', { name: /doh \/ government hospital/i }).click();
  await page.getByRole('button', { name: /ward \(shared room\)/i }).click();
  await page.getByRole('button', { name: /see coverage/i }).click();

  await expect(page.getByText(/hospital philhealth accreditation/i)).toBeVisible();
  await expect(page.getByText(/philhealth can usually be processed there/i)).toBeVisible();
});

test('Intake result shows hospital accreditation guidance after selecting a hospital', async ({ page }) => {
  await page.getByRole('tab', { name: /intake tab/i }).click();
  await page.getByRole('button', { name: /doctor said patient needs to be admitted/i }).click();
  await page.getByPlaceholder(/e\.g\. 58/i).fill('42');
  await page.locator('.relationship-card').first().click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  await page.locator('input.search-input').first().fill('append');
  await page.locator('.condition-row__main').first().click();
  await page.getByRole('button', { name: /employed \(sss\)/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.locator('select').selectOption({ label: 'Metro Manila' });
  await page.getByPlaceholder(/e\.g\. cagayan de oro, makati, cebu city/i).fill('Quezon City');
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByPlaceholder(/e\.g\. east avenue medical center/i).fill('East Avenue');
  await page.getByRole('button', { name: /east avenue medical center/i }).first().click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /ward \(shared room\)/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /i know this/i }).click();
  await page.getByRole('button', { name: /get my coverage/i }).click();

  await page.getByRole('button', { name: /technical details/i }).click();
  await expect(page.getByText(/hospital philhealth accreditation/i)).toBeVisible();
  await expect(page.getByText(/east avenue medical center is philhealth-accredited/i)).toBeVisible();
});

test('Intake symptoms golden path shows matched result recap and coverage hero', async ({ page, context }) => {
  await page.getByRole('tab', { name: /intake tab/i }).click();
  await page.getByRole('button', { name: /don't know the exact condition yet/i }).click();
  await page.getByPlaceholder(/e\.g\. 58/i).fill('58');
  await page.getByRole('button', { name: /parent/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  await context.setOffline(true);
  await page.locator('textarea.text-area').fill('High fever, body aches, headache, vomiting');
  await page.getByRole('button', { name: /find condition/i }).click();

  await expect(page.getByText(/closest covered matches/i)).toBeVisible();
  await expect(page.getByText(/dengue/i).first()).toBeVisible();
  await page.getByRole('button', { name: /select this condition/i }).first().click();

  const coverageDetailTitle = page.getByText(/^coverage detail$/i);
  if (await coverageDetailTitle.isVisible().catch(() => false)) {
    await page.locator('.select-card').first().click();
    await page.getByRole('button', { name: /^continue$/i }).click();
  }

  await page.getByRole('button', { name: /employed \(sss\)/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.locator('select').selectOption({ label: 'Metro Manila' });
  await page.getByPlaceholder(/e\.g\. cagayan de oro, makati, cebu city/i).fill('Quezon City');
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /^level 2/i }).click();
  await page.getByRole('button', { name: /doh \/ government hospital/i }).click();
  await page.getByRole('button', { name: /ward \(shared room\)/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /i know this/i }).click();
  await page.getByRole('button', { name: /get my coverage/i }).click();
  await context.setOffline(false);

  await expect(page.getByText(/this is the match from your story/i)).toBeVisible();
  await expect(page.getByText(/you told us/i)).toBeVisible();
  await expect(page.getByText(/closest covered match/i)).toBeVisible();
  await expect(page.locator('.hero-card__amount').filter({ hasText: '₱19,500' })).toBeVisible();
  await expect(page.getByText(/closest PhilHealth package match/i)).toBeVisible();
});

test('Account shows ePhilHealth and HMO guidance cards', async ({ page }) => {
  await page.getByRole('tab', { name: /account tab/i }).click();
  await expect(page.getByText(/manage your philhealth account online/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /go to ephilhealth/i })).toBeVisible();
  await expect(page.getByText(/do you also have hmo/i)).toBeVisible();
});
