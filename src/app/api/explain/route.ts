/**
 * @module api/explain
 * `POST /api/explain` — Generates profile-tailored environmental guidance grounded server-side.
 */
import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteRateLimit } from '@/lib/security/withRateLimit';
import {
  buildApiErrorResponse,
  ExplainRequestSchema,
  parseValidatedJsonBody,
  rateLimitHeaders,
} from '@/lib/validation/apiSchemas';
import { getLocationAirSnapshot } from '@/services/environment/snapshotService';
import { generateProfileGuidanceWithAi } from '@/services/gemini/enrichmentService';
import { ApiResponse, ProfileGuidance } from '@/types';

export async function POST(request: NextRequest) {
  const fetchedAt = new Date().toISOString();

  try {
    const decision = enforceRouteRateLimit(request.headers, 'explain', 'ai');
    const body = await parseValidatedJsonBody(request, ExplainRequestSchema);

    // Server-side grounding: fetch verified cached environmental snapshot by coordinates
    const snapshot = await getLocationAirSnapshot({
      latitude: body.lat,
      longitude: body.lon,
      locationName: body.locationName,
      timezone: body.timezone,
    });

    const guidance = await generateProfileGuidanceWithAi(
      snapshot,
      body.profileCategory,
      body.language
    );

    return NextResponse.json<ApiResponse<ProfileGuidance>>(
      { success: true, data: guidance, fetchedAt },
      { headers: rateLimitHeaders(decision) }
    );
  } catch (error: unknown) {
    return buildApiErrorResponse<ProfileGuidance>(
      '/api/explain',
      error,
      'Failed to generate personalized environmental guidance.'
    );
  }
}
