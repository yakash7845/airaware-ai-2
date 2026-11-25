import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { ModalShell } from '@/components/ui/ModalShell';
import { PollutantSubIndexChart } from '@/components/charts/PollutantSubIndexChart';
import { HourlyTrendChart } from '@/components/charts/HourlyTrendChart';
import { WeatherGrid } from '@/components/dashboard/WeatherGrid';
import { LocationSearchBar } from '@/components/layout/LocationSearchBar';
import { OnboardingModal } from '@/components/layout/OnboardingModal';
import { EnvironmentProvider } from '@/hooks/useEnvironmentContext';
import { computeCpcbNaqi } from '@/domain/aqi';
import { HourlySlot, WeatherData } from '@/types';

function makeTestSlots(): HourlySlot[] {
  return [
    {
      time: '2026-10-01T06:00:00.000Z',
      localTime: '2026-10-01T11:30',
      isForecast: false,
      dataSourceKind: 'PAST_MODELLED',
      measurements: [
        {
          pollutant: 'pm2_5',
          value: 45,
          unit: 'µg/m³',
          dataSourceKind: 'PAST_MODELLED',
          validationStatus: 'VALID',
          source: 'open-meteo',
          observedAt: '2026-10-01T06:00:00.000Z',
          localTime: '2026-10-01T11:30',
          fetchedAt: '2026-10-01T06:05:00.000Z',
          location: { name: 'Chennai', lat: 13.08, lon: 80.27 },
          attribution: 'Open-Meteo CAMS',
        },
      ],
      computedAqi: computeCpcbNaqi([
        { pollutant: 'pm2_5', value: 45, unit: 'µg/m³' },
        { pollutant: 'pm10', value: 80, unit: 'µg/m³' },
        { pollutant: 'no2', value: 25, unit: 'µg/m³' },
      ]),
      supplementary: {},
    },
    {
      time: '2026-10-01T07:00:00.000Z',
      localTime: '2026-10-01T12:30',
      isForecast: true,
      dataSourceKind: 'FORECAST',
      measurements: [
        {
          pollutant: 'pm2_5',
          value: 52,
          unit: 'µg/m³',
          dataSourceKind: 'FORECAST',
          validationStatus: 'VALID',
          source: 'open-meteo',
          observedAt: '2026-10-01T07:00:00.000Z',
          localTime: '2026-10-01T12:30',
          fetchedAt: '2026-10-01T06:05:00.000Z',
          location: { name: 'Chennai', lat: 13.08, lon: 80.27 },
          attribution: 'Open-Meteo CAMS',
        },
      ],
      computedAqi: computeCpcbNaqi([
        { pollutant: 'pm2_5', value: 52, unit: 'µg/m³' },
        { pollutant: 'pm10', value: 88, unit: 'µg/m³' },
        { pollutant: 'no2', value: 28, unit: 'µg/m³' },
      ]),
      supplementary: {},
    },
  ];
}

const SAMPLE_WEATHER: WeatherData = {
  temperature: 31.2,
  apparentTemperature: 34.5,
  humidity: 68,
  windSpeed: 12.4,
  windDirection: 135,
  windGusts: 18,
  precipitation: 0.2,
  surfacePressure: 1010,
  visibilityMeters: 10000,
  weatherCode: 2,
  weatherCondition: 'PARTLY_CLOUDY',
  isDay: true,
  observedAt: '2026-10-01T06:00:00.000Z',
  localTime: '2026-10-01T11:30',
  source: 'open-meteo',
  dataSourceKind: 'MODEL_ESTIMATE',
  attribution: 'Open-Meteo',
};

describe('Component Behavior & Automated Accessibility Checks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('ModalShell traps Tab/Shift+Tab and Escape, links aria-describedby, and passes axe checks', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalShell
        isOpen={true}
        onClose={onClose}
        titleId="test-modal-title"
        title="Test Transparency Dialog"
        subtitle="Methodology provenance note"
      >
        <p>Sample modal content</p>
        <button type="button">Action One</button>
      </ModalShell>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-describedby', 'test-modal-title-subtitle');

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    const actionBtn = screen.getByRole('button', { name: /action one/i });

    expect(document.activeElement).toBe(closeBtn);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(actionBtn);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('PollutantSubIndexChart and HourlyTrendChart support keyboard interaction, table alternatives, and pass axe', async () => {
    const computed = computeCpcbNaqi([
      { pollutant: 'pm2_5', value: 55, unit: 'µg/m³' },
      { pollutant: 'pm10', value: 90, unit: 'µg/m³' },
      { pollutant: 'o3', value: 85, unit: 'µg/m³' },
      { pollutant: 'no2', value: 30, unit: 'µg/m³' },
    ]);

    const subRender = render(<PollutantSubIndexChart computedAqi={computed} language="en" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view data table/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect((await axe.run(subRender.container)).violations).toHaveLength(0);
    subRender.unmount();

    const onSelectSlot = vi.fn();
    const trendRender = render(
      <HourlyTrendChart
        slots={makeTestSlots()}
        language="en"
        title="Hourly Trend"
        onSelectSlot={onSelectSlot}
      />
    );
    const nextBtn = screen.getByRole('button', { name: /Next Hour/i });
    fireEvent.click(nextBtn);
    expect(onSelectSlot).toHaveBeenCalledTimes(1);
    const trendViolations = (await axe.run(trendRender.container)).violations.map((v) => ({
      id: v.id,
      help: v.help,
      nodes: v.nodes.map((n) => n.html),
    }));
    expect(trendViolations).toEqual([]);
  });

  it('WeatherGrid renders full and unavailable states accessibly with 0 axe violations', async () => {
    const { container, rerender } = render(<WeatherGrid weather={SAMPLE_WEATHER} language="en" />);
    expect(screen.getByText('31.2°C')).toBeInTheDocument();
    expect(screen.getByText('1010 hPa')).toBeInTheDocument();
    expect((await axe.run(container)).violations).toHaveLength(0);

    rerender(<WeatherGrid weather={null} language="en" />);
    expect(screen.getByText(/Unavailable/i)).toBeInTheDocument();
  });

  it('LocationSearchBar and OnboardingModal support keyboard flow and pass axe checks', async () => {
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
        <OnboardingModal />
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
