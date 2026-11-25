import { NextRequest, NextResponse } from 'next/server';
import { compareLocations } from '@/domain/analytics/locationComparison';
import { enforceRouteRateLimit } from '@/lib/security/withRateLimit';
import {
  buildApiErrorResponse,
  CompareRequestSchema,
  parseValidatedJsonBody,
  rateLimitHeaders,
} from '@/lib/validation/apiSchemas';
import { getLocationAirSnapshot } from '@/services/environment/snapshotService';
import { ApiResponse, LocationComparisonResult } from '@/types';

export async function POST(request: NextRequest) {
  const fetchedAt = new Date().toISOString();

  try {
    const decision = enforceRouteRateLimit(request.headers, 'compare', 'standard');
    const body = await parseValidatedJsonBody(request, CompareRequestSchema);

    const snapshots = await Promise.all(
      body.locations.map((loc) =>
        getLocationAirSnapshot({
          latitude: loc.lat,
          longitude: loc.lon,
          locationName: loc.name,
          timezone: loc.timezone,
        })
      )
    );

    const comparison = compareLocations(snapshots, body.language);
    return NextResponse.json<ApiResponse<LocationComparisonResult>>(
      { success: true, data: comparison, fetchedAt },
      { headers: rateLimitHeaders(decision) }
    );
  } catch (error: unknown) {
    return buildApiErrorResponse<LocationComparisonResult>(
      '/api/compare',
      error,
      'Unable to compare locations right now.'
    );
  }
}
