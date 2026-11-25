/**
 * @module apiClient
 * Typed JSON API client helpers for AirAware UI modules.
 *
 * Wraps the browser `fetch` API with:
 * - Automatic JSON deserialization
 * - Typed unwrapping of the standard `ApiResponse<T>` envelope
 * - Clean error propagation for failed requests (preserves `AbortError`)
 * - Shared location coordinate payload construction across client pages
 */
import { ApiResponse, GeoLocation } from '@/types';

/** Location fields required by grounded POST endpoints. */
export interface LocationRequestBase {
  lat: number;
  lon: number;
  locationName: string;
  timezone: string;
}

/**
 * Extract canonical coordinate, display name, and timezone fields from a GeoLocation
 * so grounded POST endpoints share one consistent serializer.
 *
 * @param location - Selected GeoLocation from context or preset list.
 * @returns Serialized location base object with `'auto'` timezone fallback.
 */
export function buildLocationRequestBase(location: GeoLocation): LocationRequestBase {
  return {
    lat: location.latitude,
    lon: location.longitude,
    locationName: location.name,
    timezone: location.timezone || 'auto',
  };
}

/**
 * Fetch and unwrap a typed `ApiResponse<TRes>` endpoint, surfacing structured API
 * errors while preserving `AbortError` propagation for effect cleanups.
 *
 * @param url - Endpoint URL to request.
 * @param init - Optional standard Fetch API init configuration.
 * @returns The unwrapped typed `data` field from the API response.
 */
export async function fetchApiJson<TRes>(url: string, init?: RequestInit): Promise<TRes> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiResponse<TRes>;
  if (!payload.success || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Unable to complete environmental API request.');
  }
  return payload.data;
}

/**
 * Perform a typed JSON POST request with consistent Content-Type and error unwrapping.
 *
 * @param url - Destination API path.
 * @param body - Request body serialized to JSON.
 * @param signal - Optional `AbortSignal` to cancel in-flight requests.
 * @returns The unwrapped typed `data` payload returned by the route handler.
 */
export async function postApiJson<TReq, TRes>(
  url: string,
  body: TReq,
  signal?: AbortSignal
): Promise<TRes> {
  return fetchApiJson<TRes>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}
