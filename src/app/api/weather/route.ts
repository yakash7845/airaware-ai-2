/**
 * @module api/weather
 * `GET /api/weather` — Returns normalized meteorological context aligned to location local time.
 */
import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteRateLimit } from '@/lib/security/withRateLimit';
import {
  buildApiErrorResponse,
  parseStrictCoordinatesQuery,
  rateLimitHeaders,
} from '@/lib/validation/apiSchemas';
import { getLocationAirSnapshot } from '@/services/environment/snapshotService';
import { ApiResponse, WeatherData } from '@/types';

export async function GET(request: NextRequest) {
  const fetchedAt = new Date().toISOString();

  try {
    const decision = enforceRouteRateLimit(request.headers, 'weather', 'standard');
    const { searchParams } = new URL(request.url);
    const { lat, lon, name, timezone, refresh } = parseStrictCoordinatesQuery(searchParams);

    const snapshot = await getLocationAirSnapshot({
      latitude: lat,
      longitude: lon,
      locationName: name,
      timezone,
      forceRefresh: refresh === 'true',
    });

    return NextResponse.json<ApiResponse<WeatherData | null>>(
      { success: true, data: snapshot.weather, fetchedAt },
      { headers: rateLimitHeaders(decision) }
    );
  } catch (error: unknown) {
    return buildApiErrorResponse<WeatherData | null>(
      '/api/weather',
      error,
      'Failed to retrieve normalized meteorological context.'
    );
  }
}
