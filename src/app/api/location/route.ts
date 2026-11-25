import { NextRequest, NextResponse } from 'next/server';
import { RequestValidationError } from '@/lib/errors/appError';
import { enforceRouteRateLimit } from '@/lib/security/withRateLimit';
import { buildApiErrorResponse, rateLimitHeaders } from '@/lib/validation/apiSchemas';
import { searchLocations } from '@/services/geocoding/geocodingProvider';
import { ApiResponse, GeoLocation } from '@/types';

const MAX_QUERY_LEN = 100;

export async function GET(request: NextRequest) {
  const fetchedAt = new Date().toISOString();

  try {
    const decision = enforceRouteRateLimit(request.headers, 'location', 'standard');
    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get('q') ?? '';
    const cleaned = rawQ.replace(/[\u0000-\u001F\u007F]/g, '').trim();

    if (cleaned.length < 2) {
      throw new RequestValidationError('Query parameter "q" must be at least 2 characters.');
    }
    if (cleaned.length > MAX_QUERY_LEN) {
      throw new RequestValidationError(
        `Query parameter "q" cannot exceed ${MAX_QUERY_LEN} characters.`
      );
    }

    const results = await searchLocations(cleaned);
    return NextResponse.json<ApiResponse<GeoLocation[]>>(
      { success: true, data: results, fetchedAt },
      { headers: rateLimitHeaders(decision) }
    );
  } catch (error: unknown) {
    return buildApiErrorResponse<GeoLocation[]>(
      '/api/location',
      error,
      'Failed to search locations.'
    );
  }
}
