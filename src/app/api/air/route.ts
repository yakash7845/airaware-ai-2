import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteRateLimit } from '@/lib/security/withRateLimit';
import {
  buildApiErrorResponse,
  parseStrictCoordinatesQuery,
  rateLimitHeaders,
} from '@/lib/validation/apiSchemas';
import { getLocationAirSnapshot } from '@/services/environment/snapshotService';
import { AirSnapshot, ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  const fetchedAt = new Date().toISOString();

  try {
    const decision = enforceRouteRateLimit(request.headers, 'air', 'standard');
    const { searchParams } = new URL(request.url);
    const { lat, lon, name, timezone, refresh } = parseStrictCoordinatesQuery(searchParams);

    const snapshot = await getLocationAirSnapshot({
      latitude: lat,
      longitude: lon,
      locationName: name,
      timezone,
      forceRefresh: refresh === 'true',
    });

    return NextResponse.json<ApiResponse<AirSnapshot>>(
      { success: true, data: snapshot, fetchedAt },
      { headers: rateLimitHeaders(decision) }
    );
  } catch (error: unknown) {
    return buildApiErrorResponse<AirSnapshot>(
      '/api/air',
      error,
      'Failed to retrieve environmental air quality data.'
    );
  }
}
