/**
 * @module mathUtils
 * Shared numeric utility helpers used across domain modules.
 *
 * Keep this module dependency-free so it can be imported by any layer
 * (domain, services, hooks) without creating circular dependencies.
 */

/**
 * Compute the raw arithmetic mean of an array of numbers without rounding.
 * Preserves full floating-point precision prior to CPCB piecewise interpolation.
 *
 * @param nums - The numeric values to average.
 * @returns The unrounded mean, or `null` if the array is empty.
 */
export function arithmeticMean(nums: readonly number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Compute the arithmetic mean of an array of numbers, rounded to one decimal place.
 *
 * @param nums - The numeric values to average.
 * @returns The mean rounded to one decimal, or `null` if the array is empty.
 */
export function meanOf(nums: readonly number[]): number | null {
  const raw = arithmeticMean(nums);
  return raw !== null ? Number(raw.toFixed(1)) : null;
}

/**
 * Compute the arithmetic mean of an array of numbers, rounded to the nearest integer.
 *
 * Used when integer AQI values are expected (e.g., 24 h rolling CPCB NAQI averages).
 *
 * @param nums - The numeric values to average.
 * @returns The mean rounded to the nearest integer, or `null` if the array is empty.
 */
export function meanOfRounded(nums: readonly number[]): number | null {
  const raw = arithmeticMean(nums);
  return raw !== null ? Math.round(raw) : null;
}

/**
 * Clamp a value to a closed numeric interval `[min, max]`.
 *
 * @param value - The value to clamp.
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive).
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
