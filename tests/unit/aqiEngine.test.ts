import { describe, expect, it } from 'vitest';
import {
  calculateSubIndex,
  calculateSubIndexDetail,
  computeCpcbNaqi,
  computeRollingCpcbNaqi,
  convertConcentrationToCpcbUnit,
  getCpcbCategoryByValue,
  validatePollutantInput,
} from '@/domain/aqi';
import { RollingHourlyPoint } from '@/domain/aqi';

describe('CPCB 2014 NAQI Engine', () => {
  it('computes exact sub-indices across official pollutant breakpoints', () => {
    expect(calculateSubIndex('pm2_5', 0)).toBe(0);
    expect(calculateSubIndex('pm2_5', 15)).toBe(25);
    expect(calculateSubIndex('pm2_5', 60)).toBe(100);
    expect(calculateSubIndex('pm2_5', 75)).toBe(149);
    expect(calculateSubIndex('pm10', 175)).toBe(150);
    expect(calculateSubIndex('no2', 40)).toBe(50);
    expect(calculateSubIndex('so2', 80)).toBe(100);
    expect(calculateSubIndex('o3', 100)).toBe(100);
    expect(calculateSubIndex('co', 0.5)).toBe(25);
    expect(calculateSubIndex('nh3', 200)).toBe(50);
    expect(calculateSubIndex('pb', 0.5)).toBe(50);
  });

  it('bridges discrete CPCB decimal gaps continuously and caps >500 cleanly', () => {
    const bridgeLow = calculateSubIndex('pm2_5', 30.2);
    const bridgeHigh = calculateSubIndex('pm2_5', 30.8);
    expect(bridgeLow).not.toBeNull();
    expect(bridgeHigh).not.toBeNull();
    expect(bridgeLow).toBeGreaterThanOrEqual(50);
    expect(bridgeHigh).toBeLessThanOrEqual(51);

    const overflow = calculateSubIndexDetail('pm2_5', 650);
    expect(overflow.subIndex).toBe(500);
    expect(overflow.clampedAtMax).toBe(true);
  });

  it('converts CO from µg/m³ and Greek μg/m³ to mg/m³ accurately', () => {
    const ascii = convertConcentrationToCpcbUnit('co', 767, 'ug/m3');
    expect(ascii?.cpcbValue).toBeCloseTo(0.767, 4);
    expect(ascii?.unit).toBe('mg/m³');

    const greekMu = convertConcentrationToCpcbUnit('co', 1500, 'μg/m³');
    expect(greekMu?.cpcbValue).toBeCloseTo(1.5, 4);
    expect(greekMu?.unit).toBe('mg/m³');

    expect(convertConcentrationToCpcbUnit('pm2_5', 25, 'ppm')).toBeNull();
  });

  it('rejects negative, NaN, overflow, and unsupported pollutant inputs', () => {
    expect(validatePollutantInput({ pollutant: 'pm2_5', value: -1, unit: 'µg/m³' }).valid).toBe(
      false
    );
    expect(
      validatePollutantInput({ pollutant: 'pm2_5', value: Number.NaN, unit: 'µg/m³' }).valid
    ).toBe(false);
    expect(validatePollutantInput({ pollutant: 'pm2_5', value: 9999, unit: 'µg/m³' }).valid).toBe(
      false
    );
    expect(validatePollutantInput({ pollutant: 'voc', value: 10, unit: 'µg/m³' }).valid).toBe(
      false
    );
  });

  it('enforces minimum >=3 pollutants including PM2.5 or PM10 and deterministic tie-breaking', () => {
    const tooFew = computeCpcbNaqi([
      { pollutant: 'pm2_5', value: 40, unit: 'µg/m³' },
      { pollutant: 'no2', value: 20, unit: 'µg/m³' },
    ]);
    expect(tooFew.dataSufficient).toBe(false);
    expect(tooFew.value).toBeNull();
    expect(tooFew.methodology).toBe('UNAVAILABLE');

    const noPm = computeCpcbNaqi([
      { pollutant: 'no2', value: 20, unit: 'µg/m³' },
      { pollutant: 'so2', value: 20, unit: 'µg/m³' },
      { pollutant: 'o3', value: 50, unit: 'µg/m³' },
    ]);
    expect(noPm.dataSufficient).toBe(false);

    const tied = computeCpcbNaqi([
      { pollutant: 'pm2_5', value: 60, unit: 'µg/m³' }, // Sub-index 100
      { pollutant: 'pm10', value: 100, unit: 'µg/m³' }, // Sub-index 100
      { pollutant: 'o3', value: 100, unit: 'µg/m³' }, // Sub-index 100
    ]);
    expect(tied.dataSufficient).toBe(true);
    expect(tied.value).toBe(100);
    expect(tied.dominantPollutant).toBe('pm2_5');
    expect(tied.limitations.some((l) => l.includes('tie'))).toBe(true);
  });

  it('computes 24h/8h rolling CPCB NAQI when sufficient hours exist and labels partial horizons honestly', () => {
    const fullSeries: RollingHourlyPoint[][] = Array.from({ length: 24 }, () => [
      { pollutant: 'pm2_5', value: 60, unit: 'µg/m³' },
      { pollutant: 'pm10', value: 80, unit: 'µg/m³' },
      { pollutant: 'no2', value: 30, unit: 'µg/m³' },
      { pollutant: 'so2', value: 12, unit: 'µg/m³' },
      { pollutant: 'co', value: 0.8, unit: 'mg/m³' },
      { pollutant: 'o3', value: 50, unit: 'µg/m³' },
    ]);

    const rolling = computeRollingCpcbNaqi(fullSeries, 23);
    expect(rolling.dataSufficient).toBe(true);
    expect(rolling.methodology).toBe('CPCB_NAQI_ROLLING_MODEL');
    expect(rolling.value).toBe(100);
    expect(getCpcbCategoryByValue(rolling.value)?.key).toBe('SATISFACTORY');

    const shortSeries = fullSeries.slice(0, 4);
    const partial = computeRollingCpcbNaqi(shortSeries, 3);
    expect(partial.dataSufficient).toBe(true);
    expect(partial.methodology).toBe('CPCB_NAQI_INDICATIVE_HOURLY');
  });
});
