import { ApiResponse } from '@/types';

/**
 * Shared JSON API client helpers for AirAware UI modules.
 * Preserves structured API error messages and AbortError propagation.
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
