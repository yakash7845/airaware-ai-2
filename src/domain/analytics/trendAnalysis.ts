import { DailyForecastSummary, HourlySlot, PollutantId, TrendAnalyticsSummary } from '@/types';
import { formatLocalHourLabel } from '@/lib/time/timezone';

function meanOf(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
}

export function buildTrendAnalytics(hourlyTimeline: readonly HourlySlot[]): TrendAnalyticsSummary {
  const pastSlots = hourlyTimeline.filter((s) => !s.isForecast);
  const forecastSlots = hourlyTimeline.filter((s) => s.isForecast);

  const pastAqis = pastSlots
    .map((s) => s.computedAqi?.value)
    .filter((v): v is number => v !== null && v !== undefined);
  const forecastAqis = forecastSlots
    .map((s) => s.computedAqi?.value)
    .filter((v): v is number => v !== null && v !== undefined);

  const pastMeanAqi =
    pastAqis.length > 0 ? Math.round(pastAqis.reduce((a, b) => a + b, 0) / pastAqis.length) : null;
  const forecastMeanAqi =
    forecastAqis.length > 0
      ? Math.round(forecastAqis.reduce((a, b) => a + b, 0) / forecastAqis.length)
      : null;

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
      avgAqi: aqis.length > 0 ? Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length) : null,
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
