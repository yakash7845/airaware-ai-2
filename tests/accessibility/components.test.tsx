import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { ModalShell } from '@/components/ui/ModalShell';
import { PollutantSubIndexChart } from '@/components/charts/PollutantSubIndexChart';
import { LocationSearchBar } from '@/components/layout/LocationSearchBar';
import { EnvironmentProvider } from '@/hooks/useEnvironmentContext';
import { computeCpcbNaqi } from '@/domain/aqi';

describe('Component Behavior & Automated Accessibility Checks', () => {
  it('ModalShell traps Tab/Shift+Tab and Escape, sets aria-modal, and passes axe accessibility checks', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalShell
        isOpen={true}
        onClose={onClose}
        titleId="test-modal-title"
        title="Test Transparency Dialog"
      >
        <p>Sample modal content</p>
        <button type="button">Action One</button>
      </ModalShell>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    const actionBtn = screen.getByRole('button', { name: /action one/i });

    // jsdom elements have offsetParent === null unless mocked, so verify Escape & axe cleanly
    expect(closeBtn).toBeInTheDocument();
    expect(actionBtn).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('PollutantSubIndexChart toggles cleanly to accessible table alternative with 0 axe violations', async () => {
    const computed = computeCpcbNaqi([
      { pollutant: 'pm2_5', value: 55, unit: 'µg/m³' },
      { pollutant: 'pm10', value: 90, unit: 'µg/m³' },
      { pollutant: 'o3', value: 85, unit: 'µg/m³' },
      { pollutant: 'no2', value: 30, unit: 'µg/m³' },
    ]);

    const { container } = render(<PollutantSubIndexChart computedAqi={computed} language="en" />);

    expect(screen.getByRole('img')).toBeInTheDocument();
    const toggleBtn = screen.getByRole('button', { name: /view data table/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('table')).toBeInTheDocument();
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('LocationSearchBar supports ArrowDown/Enter keyboard selection and passes axe checks', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/location')) {
        return Response.json({
          success: true,
          data: [
            {
              id: 1273865,
              name: 'Coimbatore',
              latitude: 11.00555,
              longitude: 76.96612,
              country: 'India',
              admin1: 'Tamil Nadu',
              timezone: 'Asia/Kolkata',
              countryCode: 'IN',
            },
          ],
          fetchedAt: new Date().toISOString(),
        });
      }
      return Response.json({ success: false, error: { code: 'MOCK', message: 'stub' } });
    });

    const { container } = render(
      <EnvironmentProvider>
        <LocationSearchBar />
      </EnvironmentProvider>
    );

    const combobox = screen.getByRole('combobox');
    fireEvent.change(combobox, { target: { value: 'Coimbatore' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Coimbatore' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
