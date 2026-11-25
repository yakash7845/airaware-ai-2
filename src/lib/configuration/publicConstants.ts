/**
 * @module publicConstants
 * Client-safe public metadata, physical bounds, and attribution strings.
 *
 * Strictly contains static literals with zero `process.env` access so browser
 * client components can consume attribution strings, coordinate bounds, and UI
 * input limits without importing server-side environment loaders (`env.ts`).
 */

/** Geographic latitude and longitude validation bounds (WGS-84 decimal degrees). */
export const COORDINATE_BOUNDS = {
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
} as const;

/** Public input-length and request-size bounds shared across client forms and server validators. */
export const PUBLIC_SECURITY_LIMITS = {
  maxJsonBodyBytes: 256 * 1024,
  maxCompareLocations: 4,
  maxQuestionLength: 800,
} as const;

/** Canonical scientific and licensing attribution notices displayed across the platform. */
export const PUBLIC_ATTRIBUTION = {
  openMeteoAir: 'Air quality data by Open-Meteo.com (Copernicus CAMS data, CC BY 4.0)',
  openMeteoWeather: 'Weather data by Open-Meteo.com (CC BY 4.0)',
  openMeteoGeo: 'Geocoding by Open-Meteo.com (GeoNames)',
  openStreetMap: 'Map tiles © OpenStreetMap contributors (ODbL)',
  cpcb: 'CPCB National Air Quality Index methodology (MoEFCC, Oct 2014)',
} as const;
