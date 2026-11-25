/**
 * @module trendAnalysis
 * Builds trend analytics summaries over a 48 h + 72 h hourly timeline,
 * computing past vs. forecast mean AQI, trend direction, and per-day summaries.
 */

import { DailyForecastSummary, HourlySlot, PollutantId, TrendAnalyticsSummary } from '@/types';
import { formatLocalHourLabel } from '@/lib/time/timezone';
import { meanOf, meanOfRounded } from '@/utils/mathUtils';

/**
 * Build a comprehensive trend analytics summary from a full hourly timeline.
 *
 * Splits slots into past (hindcast) and forecast segments, computes mean AQI for
 * each segment, determines trend direction (IMPROVING / STABLE / WORSENING), and
 * groups slots by local calendar date for daily summary cards.
 *
 * @param hourlyTimeline - The full ordered array of hourly slots (past + forecast).
 * @returns A {@link TrendAnalyticsSummary} with per-day breakdowns and overall trend direction.
 */
export function buildTrendAnalytics(hourlyTimeline: readonly HourlySlot[]): TrendAnalyticsSummary {
  const pastSlots = hourlyTimeline.filter((s) => !s.isForecast);
  const forecastSlots = hourlyTimeline.filter((s) => s.isForecast);

  const pastAqis = pastSlots
    .map((s) => s.computedAqi?.value)
    .filter((v): v is number => v !== null && v !== undefined);
  const forecastAqis = forecastSlots
    .map((s) => s.computedAqi?.value)
    .filter((v): v is number => v !== null && v !== undefined);

  const pastMeanAqi = meanOfRounded(pastAqis);
  const forecastMeanAqi = meanOfRounded(forecastAqis);

  let aqiDeltaPercent: number | null = null;
  let trendDirection: TrendAnalyticsSummary['trendDirection'] = 'INSUFFICIENT_DATA';

  if (pastMeanAqi !== null && forecastMeanAqi !== null && pastMeanAqi > 0) {
    aqiDeltaPercent = Math.round(((forecastMeanAqi - pastMeanAqi) / pastMeanAqi) * 100);
    if (aqiDeltaPercent >= 8) trendDirection = 'WORSENING';
    else if (aqiDeltaPercent <= -8) trendDirection = 'IMPROVING';
    else trendDirection = 'STABLE';
  }

  // Group slots by location local calendar date
  const byDate = new Map<string, HourlySlot[]>();
  for (const slot of hourlyTimeline) {
    const { dateKey } = formatLocalHourLabel(slot.localTime);
    const list = byDate.get(dateKey) ?? [];
    list.push(slot);
    byDate.set(dateKey, list);
  }

  const dailySummaries: DailyForecastSummary[] = [];
  for (const [date, slots] of byDate.entries()) {
    const aqis = slots
      .map((s) => s.computedAqi?.value)
      .filter((v): v is number => v !== null && v !== undefined);
    const pm25s = slots
      .map((s) => s.measurements.find((m) => m.pollutant === 'pm2_5')?.value)
      .filter((v): v is number => v !== undefined);
    const pm10s = slots
      .map((s) => s.measurements.find((m) => m.pollutant === 'pm10')?.value)
      .filter((v): v is number => v !== undefined);
    const temps = slots
      .map((s) => s.weather?.temperature)
      .filter((v): v is number => v !== undefined);
    const precips = slots
      .map((s) => s.weather?.precipitation)
      .filter((v): v is number => v !== undefined);

    const dominantCounts = new Map<PollutantId, number>();
    for (const s of slots) {
      const dom = s.computedAqi?.dominantPollutant;
      if (dom) {
        dominantCounts.set(dom, (dominantCounts.get(dom) ?? 0) + 1);
      }
    }

    let dominantPollutant: PollutantId | null = null;
    let bestCount = 0;
    for (const [pol, count] of dominantCounts.entries()) {
      if (count > bestCount) {
        bestCount = count;
        dominantPollutant = pol;
      }
    }

    const forecastRatio = slots.filter((s) => s.isForecast).length / slots.length;

    dailySummaries.push({
      date,
      minAqi: aqis.length > 0 ? Math.min(...aqis) : null,
      maxAqi: aqis.length > 0 ? Math.max(...aqis) : null,
      avgAqi: meanOfRounded(aqis),
      dominantPollutant,
      avgPm25: meanOf(pm25s),
      avgPm10: meanOf(pm10s),
      maxTemp: temps.length > 0 ? Math.max(...temps) : null,
      minTemp: temps.length > 0 ? Math.min(...temps) : null,
      totalPrecipitation:
        precips.length > 0 ? Number(precips.reduce((a, b) => a + b, 0).toFixed(1)) : null,
      slotCount: slots.length,
      isPastDay: forecastRatio < 0.5,
    });
  }

  return {
    pastHoursCount: pastSlots.length,
    forecastHoursCount: forecastSlots.length,
    pastMeanAqi,
    forecastMeanAqi,
    aqiDeltaPercent,
    trendDirection,
    dailySummaries,
    historicalLimitationNote:
      'Trailing multi-day data reflects Copernicus CAMS atmospheric model hindcast/archive via Open-Meteo rather than physical ground monitoring station logs.',
  };
}
