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
  test('renders all 10 routes cleanly and passes automated axe checks on core views', async ({
    page,
  }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({
        timeout: 20_000,
      });
    }

    await page.goto('/');
    await expect(page.getByText(/IN NAQI/i).first()).toBeVisible({ timeout: 20_000 });
    const homeAxe = await new AxeBuilder({ page }).analyze();
    expect(homeAxe.violations).toEqual([]);

    await page.goto('/live');
    await expect(page.getByRole('heading', { name: /Live Air Quality/i })).toBeVisible({
      timeout: 20_000,
    });
    const liveAxe = await new AxeBuilder({ page }).analyze();
    expect(liveAxe.violations).toEqual([]);

    await page.goto('/assistant');
    const assistantAxe = await new AxeBuilder({ page }).analyze();
    expect(assistantAxe.violations).toEqual([]);
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

  test('verifies Explore comparison, Exposure profiles, Outdoor Planner, Indoor Advisor, AI Assistant, and Learn Calculator', async ({
    page,
  }) => {
    // Explore comparison
    await page.goto('/explore');
    await expect(page.getByText(/Multi-Location Comparison Engine/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 });

    // Personal Exposure profiles + invariance
    await page.goto('/exposure');
    await expect(page.getByText(/Environmental Invariance Verified/i)).toBeVisible({
      timeout: 20_000,
    });

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
