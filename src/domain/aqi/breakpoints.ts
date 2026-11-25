import { PollutantId } from '@/types';
import { BreakpointRange } from './types';

/**
 * Official CPCB National Air Quality Index Breakpoints (October 2014).
 * Units:
 * - PM2.5, PM10, NO2, SO2, O3, NH3, Pb: µg/m³
 * - CO: mg/m³
 *
 * Averaging Periods:
 * - 24-hour: PM2.5, PM10, NO2, SO2, NH3, Pb
 * - 8-hour: CO, O3
 */
export const CPCB_BREAKPOINTS: Record<PollutantId, readonly BreakpointRange[]> = {
  pm2_5: [
    { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 30 },
    { aqiLow: 51, aqiHigh: 100, concLow: 31, concHigh: 60 },
    { aqiLow: 101, aqiHigh: 200, concLow: 61, concHigh: 90 },
    { aqiLow: 201, aqiHigh: 300, concLow: 91, concHigh: 120 },
    { aqiLow: 301, aqiHigh: 400, concLow: 121, concHigh: 250 },
    { aqiLow: 401, aqiHigh: 500, concLow: 251, concHigh: 380 },
  ],
  pm10: [
    { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 50 },
    { aqiLow: 51, aqiHigh: 100, concLow: 51, concHigh: 100 },
    { aqiLow: 101, aqiHigh: 200, concLow: 101, concHigh: 250 },
    { aqiLow: 201, aqiHigh: 300, concLow: 251, concHigh: 350 },
    { aqiLow: 301, aqiHigh: 400, concLow: 351, concHigh: 430 },
    { aqiLow: 401, aqiHigh: 500, concLow: 431, concHigh: 510 },
  ],
  no2: [
    { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 40 },
    { aqiLow: 51, aqiHigh: 100, concLow: 41, concHigh: 80 },
    { aqiLow: 101, aqiHigh: 200, concLow: 81, concHigh: 180 },
    { aqiLow: 201, aqiHigh: 300, concLow: 181, concHigh: 280 },
    { aqiLow: 301, aqiHigh: 400, concLow: 281, concHigh: 400 },
    { aqiLow: 401, aqiHigh: 500, concLow: 401, concHigh: 500 },
  ],
  so2: [
    { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 40 },
    { aqiLow: 51, aqiHigh: 100, concLow: 41, concHigh: 80 },
    { aqiLow: 101, aqiHigh: 200, concLow: 81, concHigh: 380 },
    { aqiLow: 201, aqiHigh: 300, concLow: 381, concHigh: 800 },
    { aqiLow: 301, aqiHigh: 400, concLow: 801, concHigh: 1600 },
    { aqiLow: 401, aqiHigh: 500, concLow: 1601, concHigh: 2100 },
  ],
  co: [
    { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 1.0 },
    { aqiLow: 51, aqiHigh: 100, concLow: 1.1, concHigh: 2.0 },
    { aqiLow: 101, aqiHigh: 200, concLow: 2.1, concHigh: 10.0 },
    { aqiLow: 201, aqiHigh: 300, concLow: 10.1, concHigh: 17.0 },
    { aqiLow: 301, aqiHigh: 400, concLow: 17.1, concHigh: 34.0 },
    { aqiLow: 401, aqiHigh: 500, concLow: 34.1, concHigh: 50.0 },
  ],
  o3: [
    { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 50 },
    { aqiLow: 51, aqiHigh: 100, concLow: 51, concHigh: 100 },
    { aqiLow: 101, aqiHigh: 200, concLow: 101, concHigh: 168 },
    { aqiLow: 201, aqiHigh: 300, concLow: 169, concHigh: 208 },
    { aqiLow: 301, aqiHigh: 400, concLow: 209, concHigh: 748 },
    { aqiLow: 401, aqiHigh: 500, concLow: 749, concHigh: 1000 },
  ],
  nh3: [
    { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 200 },
    { aqiLow: 51, aqiHigh: 100, concLow: 201, concHigh: 400 },
    { aqiLow: 101, aqiHigh: 200, concLow: 401, concHigh: 800 },
    { aqiLow: 201, aqiHigh: 300, concLow: 801, concHigh: 1200 },
    { aqiLow: 301, aqiHigh: 400, concLow: 1201, concHigh: 1800 },
    { aqiLow: 401, aqiHigh: 500, concLow: 1801, concHigh: 2400 },
  ],
  pb: [
    { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 0.5 },
    { aqiLow: 51, aqiHigh: 100, concLow: 0.6, concHigh: 1.0 },
    { aqiLow: 101, aqiHigh: 200, concLow: 1.1, concHigh: 2.0 },
    { aqiLow: 201, aqiHigh: 300, concLow: 2.1, concHigh: 3.0 },
    { aqiLow: 301, aqiHigh: 400, concLow: 3.1, concHigh: 3.5 },
    { aqiLow: 401, aqiHigh: 500, concLow: 3.6, concHigh: 5.0 },
  ],
};
