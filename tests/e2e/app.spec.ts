import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  { path: '/', heading: /Environmental Intelligence Overview/i },
  { path: '/live', heading: /Live Air Quality/i },
  { path: '/explore', heading: /Explore Urban Pollution Map/i },
  { path: '/forecast', heading: /Forecast Intelligence/i },
  { path: '/exposure', heading: /Personal Exposure/i },
  { path: '/planner', heading: /Intelligent Outdoor Activity Planner/i },
  { path: '/indoor', heading: /Indoor Air Intelligence Advisor/i },
  { path: '/assistant', heading: /AIRWARE AI INTELLIGENCE ASSISTANT/i },
  { path: '/learn', heading: /Environmental Education Center/i },
  { path: '/settings', heading: /Settings, Accessibility & Privacy/i },
];

test.describe('AirAware AI 2.0 End-to-End & WCAG Accessibility Suite', () => {
  test('renders all 10 routes cleanly and passes automated axe checks across every page', async ({
    page,
  }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({
        timeout: 20_000,
      });
      // Wait briefly for initial snapshot hydration before auditing DOM contrast/landmarks
      await page.waitForTimeout(300);
      const axeResults = await new AxeBuilder({ page }).analyze();
      expect(axeResults.violations, `Axe violations on ${route.path}`).toEqual([]);
    }
  });

  test('supports onboarding, location switching, and full EN/TA/HI localization', async ({
    page,
  }) => {
    await page.goto('/');

    // Onboarding flow
    await page
      .getByRole('button', { name: /Setup Guide/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /Skip Setup/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Quick city selection
    await page.getByRole('button', { name: 'Coimbatore' }).click();
    await expect(page.getByText(/Coimbatore/i).first()).toBeVisible({ timeout: 15_000 });

    // Switch language to Tamil then Hindi then back to English (verifying visible H1)
    await page.getByRole('button', { name: 'தமிழ்' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'சுற்றுச்சூழல் நுண்ணறிவு கண்ணோட்டம்' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'हिन्दी' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'पर्यावरणीय बुद्धिमत्ता अवलोकन' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Environmental Intelligence Overview' })
    ).toBeVisible();
  });

  test('verifies Explore, Exposure CRUD, Planner, Indoor, Assistant, Learn, and Settings accessibility controls', async ({
    page,
  }) => {
    // Explore comparison
    await page.goto('/explore');
    await expect(page.getByText(/Multi-Location Comparison Engine/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 });

    // Personal Exposure profiles + Add Profile CRUD
    await page.goto('/exposure');
    await expect(page.getByText(/Environmental Invariance Verified/i)).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: /Add Profile/i }).click();
    await page.getByLabel(/Display Name/i).fill('Ananya');
    await page.getByRole('button', { name: /^Save$/i }).click();
    await expect(page.getByText('Ananya')).toBeVisible();

    // Outdoor Planner
    await page.goto('/planner');
    await page.getByRole('button', { name: 'Cycling' }).click();
    await expect(page.getByText(/Comparatively Most Favorable/i).first()).toBeVisible({
      timeout: 20_000,
    });

    // Indoor Advisor
    await page.goto('/indoor');
    await expect(page.getByText(/No Indoor Sensor Connected/i)).toBeVisible({ timeout: 20_000 });

    // AI Assistant
    await page.goto('/assistant');
    await page.getByRole('button', { name: /Explain PM2\.5 in simple language/i }).click();
    await expect(page.getByText(/2\.5 micrometers/i)).toBeVisible({ timeout: 20_000 });

    // Learn Interactive Calculator
    await page.goto('/learn');
    await page.getByRole('button', { name: /Interactive CPCB Calculator/i }).click();
    await expect(page.getByText(/Computed CPCB NAQI = max\(Sub-Indices\)/i)).toBeVisible();

    // Settings high-contrast & text size scaling
    await page.goto('/settings');
    await page.getByRole('button', { name: /Large \(112%\)/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
    await page.getByRole('button', { name: /High-Contrast Accessible Theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  });

  test('supports mobile navigation drawer without horizontal overflow', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile viewport only');
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Environmental Intelligence Overview/i })
    ).toBeVisible({ timeout: 20_000 });

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole('button', { name: /Open navigation menu/i }).click();
    await expect(page.getByRole('dialog', { name: /Mobile navigation menu/i })).toBeVisible();
  });
});
