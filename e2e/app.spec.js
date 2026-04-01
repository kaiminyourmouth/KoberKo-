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
  await expect(page.getByPlaceholder(/search: layman term, symptom, or condition/i)).toBeVisible();
}

async function swipeTutorial(page, direction = 'left') {
  const stage = page.locator('.app-tutorial__stage');
  const box = await stage.boundingBox();

  if (!box) {
    throw new Error('Tutorial stage is not visible');
  }

  const startX = direction === 'left' ? box.x + box.width * 0.78 : box.x + box.width * 0.22;
  const endX = direction === 'left' ? box.x + box.width * 0.22 : box.x + box.width * 0.78;
  const y = box.y + Math.min(box.height * 0.45, 180);

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 10 });
  await page.mouse.up();
}

async function runCapFlow(page) {
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
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /^level 2/i }).click();
  await page.getByRole('button', { name: /doh \/ government hospital/i }).click();
  await page.getByRole('button', { name: /ward \(shared room\)/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.getByRole('button', { name: /i know this/i }).click();
  await page.getByRole('button', { name: /get my coverage/i }).click();
}

test.beforeEach(async ({ page }) => {
  await resetApp(page);
  await page.goto('/');
});

test('Tutorial opens on first load and guides the user into the app', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('koberko_app_tutorial_seen');
  });
  await page.goto('/');

  const tutorialProgress = page.locator('.app-tutorial__footer-progress');

  await expect(page.locator('#app-tutorial-title')).toBeVisible();
  await expect(tutorialProgress).toHaveText(/page 1 of 4/i);
  await expect(page.getByText(/start from the situation, not from a guessed diagnosis/i)).toBeVisible();
  await expect(page.getByText(/swipe left for the next page/i)).toBeVisible();

  await swipeTutorial(page, 'left');
  await expect(tutorialProgress).toHaveText(/page 2 of 4/i);
  await expect(page.getByText(/what each tab is for/i)).toBeVisible();

  await swipeTutorial(page, 'left');
  await expect(tutorialProgress).toHaveText(/page 3 of 4/i);
  await expect(page.getByText(/common starting points/i)).toBeVisible();

  await swipeTutorial(page, 'left');
  await expect(tutorialProgress).toHaveText(/page 4 of 4/i);
  await expect(page.getByText(/you do not need to memorize this/i)).toBeVisible();

  await page.getByRole('button', { name: /start using koberko/i }).click();
  await expect(page.getByRole('dialog', { name: /how koberko works/i })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /intake tab/i })).toBeVisible();
});

test('Direct-filing coverage result shows guide content', async ({ page, context }) => {
  await page.getByRole('tab', { name: /intake tab/i }).click();
  await page.getByRole('button', { name: /don't know the exact condition yet/i }).click();
  await page.getByPlaceholder(/e\.g\. 58/i).fill('58');
  await page.getByRole('button', { name: /parent/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  await context.setOffline(true);
  await page.locator('textarea.text-area').fill('High fever, body aches, headache, vomiting');
  await page.getByRole('button', { name: /find condition/i }).click();
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

  await expect(page.locator('.hero-card__amount')).toBeVisible();
  await expect(page.getByText(/billing path/i)).toBeVisible();

  await page.getByRole('tab', { name: /guide tab/i }).click();
  await expect(page.getByText(/documents needed/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /say this to billing/i })).toBeVisible();
  await expect(page.getByText(/^do this first$/i).first()).toBeVisible();
  await expect(page.getByText(/^avoid this$/i).first()).toBeVisible();
  await expect(page.getByText(/philhealth hotline/i).first()).toBeVisible();
});

test('Save, view, and delete saved result works end to end', async ({ page }) => {
  await runCapFlow(page);
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByRole('button', { name: /saved/i })).toBeVisible();

  await page.getByRole('tab', { name: /account tab/i }).click();
  await page.getByRole('button', { name: /saved results/i }).click();

  await expect(page.getByText(/appendectomy/i)).toBeVisible();
  await page.getByRole('button', { name: /^view$/i }).click();
  await expect(page.locator('.hero-card__amount')).toBeVisible();

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
  await expect(page.getByPlaceholder(/search: layman term, symptom, or condition/i)).toBeVisible();
});

test('After-discharge denied-claim flow shows denial guide and appeals', async ({ page }) => {
  await page.getByRole('tab', { name: /intake tab/i }).click();
  await page.getByRole('button', { name: /already discharged, want to reimburse/i }).click();
  await page.getByRole('button', { name: /claim was denied/i }).click();

  await expect(page.getByText(/can we still recover money\?/i)).toBeVisible();
  await expect(page.getByText(/maybe, but it depends on the denial reason\./i)).toBeVisible();
  await page.getByRole('button', { name: /review denial reasons/i }).click();
  await expect(page.getByText(/denial guide and appeals process/i)).toBeVisible();
  await expect(page.getByText(/top reasons for denial/i)).toBeVisible();
  await expect(page.getByText(/3-step appeals process timeline/i)).toBeVisible();
  await expect(page.getByText(/before you give up, read this/i)).toBeVisible();
});

test('After-discharge not-filed flow keeps reimbursement guidance available in Guide', async ({ page }) => {
  await page.getByRole('tab', { name: /intake tab/i }).click();
  await page.getByRole('button', { name: /already discharged, want to reimburse/i }).click();
  await page.getByRole('button', { name: /haven't filed yet/i }).click();

  await expect(page.getByText(/yes, reimbursement may still be possible\./i)).toBeVisible();
  await expect(page.getByText(/60 days from discharge/i).first()).toBeVisible();
  await expect(page.getByText(/gather the or, itemized soa, discharge summary/i)).toBeVisible();

  await page.getByRole('tab', { name: /guide tab/i }).click();
  await expect(page.getByText(/reimbursement support/i)).toBeVisible();
  await expect(page.getByText(/how to reimburse/i)).toBeVisible();
  await expect(page.getByText(/can we still recover money\?/i)).toBeVisible();
});

test('After-discharge waiting flow shows follow-up verdict and timeline', async ({ page }) => {
  await page.getByRole('tab', { name: /intake tab/i }).click();
  await page.getByRole('button', { name: /already discharged, want to reimburse/i }).click();
  await page.getByRole('button', { name: /waiting for results/i }).click();

  await expect(page.getByText(/possibly yes, but do not restart the filing yet\./i)).toBeVisible();
  await expect(page.getByText(/check with the hospital or philhealth coordinator/i).first()).toBeVisible();
  await expect(page.getByText(/timeline expectations/i).first()).toBeVisible();
});

test('Find landing stays info-first and highlights browsing', async ({ page }) => {
  await goToFind(page);
  await expect(page.getByText(/start by browsing the condition or package info/i)).toBeVisible();
  await expect(page.getByText(/find is for browsing conditions, symptoms, and philhealth package details/i)).toBeVisible();
  await expect(page.getByText(/conditions you can explore/i)).toBeVisible();
});

test('Find tab stays info-first when opening a condition', async ({ page }) => {
  await goToFind(page);
  await page.getByPlaceholder(/search: layman term, symptom, or condition/i).fill('pneumonia');
  await page.getByRole('button', { name: /community-acquired pneumonia/i }).first().click();
  await expect(page.getByRole('heading', { name: /community-acquired pneumonia/i })).toBeVisible();
  await expect(page.getByText(/this is the quick overview of the condition/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /what is it/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /when to go/i })).toBeVisible();
  await expect(page.getByText('PhilHealth package context', { exact: true })).toBeVisible();
  await expect(page.getByText(/official package amount/i)).toBeVisible();
  await expect(page.getByText(/estimated total bill/i)).toBeVisible();
  await expect(page.getByText(/p25,000 - p80,000/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /employed \(sss\)/i })).toHaveCount(0);
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
  await expect(page.getByText(/^start here$/i).first()).toBeVisible();
  await expect(page.getByText(/^official basis$/i).first()).toBeVisible();
  await expect(page.getByText(/billing path/i)).toBeVisible();
});

test('Gabay RHU landing emphasizes RHU-first public care', async ({ page }) => {
  await page.getByRole('tab', { name: /gabay tab/i }).click();

  await expect(page.getByText(/don't go to the hospital first if there is no danger sign yet/i)).toBeVisible();
  await expect(page.getByText(/pick the closest concern/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /fever \/ cough \/ colds/i })).toBeVisible();
});

test('Gabay RHU detail separates first-stop guidance from hospital danger signs', async ({ page }) => {
  await page.getByRole('tab', { name: /gabay tab/i }).click();
  await page.getByRole('button', { name: /fever \/ cough \/ colds/i }).click();

  await expect(page.getByText(/when this is a good first stop/i)).toBeVisible();
  await expect(page.getByText(/go straight to a hospital if/i)).toBeVisible();
  await expect(page.getByText(/have philhealth\?/i)).toBeVisible();
  await expect(page.getByText(/this is a guide for public primary care/i)).toBeVisible();
});

test('Account surface highlights tools and follow-up', async ({ page }) => {
  await page.getByRole('tab', { name: /account tab/i }).click();

  await expect(page.getByText(/your personal tools and follow-up live here/i)).toBeVisible();
  await expect(page.getByText(/saved results/i).first()).toBeVisible();
  await expect(page.getByText(/ask ai/i).first()).toBeVisible();
  await expect(page.getByText(/see the source note, disclaimer, and current app version in one place/i)).toBeVisible();
});

test('Chat subview shows intro and conversation framing', async ({ page }) => {
  await page.getByRole('tab', { name: /account tab/i }).click();
  await page.getByRole('button', { name: /ask ai/i }).click();

  await expect(page.getByText(/ask using your current situation/i)).toBeVisible();
  await expect(page.getByText(/replies in this thread/i)).toBeVisible();
  await expect(page.getByText(/no conversation yet/i)).toBeVisible();
});

test('Account shows ePhilHealth and HMO guidance cards', async ({ page }) => {
  await page.getByRole('tab', { name: /account tab/i }).click();
  await expect(page.getByText(/manage your philhealth account online/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /go to ephilhealth/i })).toBeVisible();
  await expect(page.getByText(/do you also have hmo/i)).toBeVisible();
});
