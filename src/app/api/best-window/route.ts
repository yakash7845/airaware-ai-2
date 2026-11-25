import { NextRequest, NextResponse } from 'next/server';
import { evaluateOutdoorWindows } from '@/domain/recommendations/outdoorPlanner';
import { enforceRouteRateLimit } from '@/lib/security/withRateLimit';
import {
  BestWindowRequestSchema,
  buildApiErrorResponse,
  parseValidatedJsonBody,
  rateLimitHeaders,
} from '@/lib/validation/apiSchemas';
import { getLocationAirSnapshot } from '@/services/environment/snapshotService';
import { enrichBestWindowWithAi } from '@/services/gemini/enrichmentService';
import { ApiResponse, BestWindowPlan } from '@/types';

export async function POST(request: NextRequest) {
  const fetchedAt = new Date().toISOString();

  try {
    const decision = enforceRouteRateLimit(request.headers, 'best-window', 'ai');
    const body = await parseValidatedJsonBody(request, BestWindowRequestSchema);

    const snapshot = await getLocationAirSnapshot({
      latitude: body.lat,
      longitude: body.lon,
      locationName: body.locationName,
      timezone: body.timezone,
    });

    const deterministicPlan = evaluateOutdoorWindows({
      hourlySlots: snapshot.hourlyForecast,
      activity: body.activity,
      profileCategory: body.profileCategory,
      language: body.language,
      locationName: snapshot.location.name,
      targetDate: body.targetDate,
      timePreference: body.timePreference,
    });

    const enrichedPlan = await enrichBestWindowWithAi(deterministicPlan);
    return NextResponse.json<ApiResponse<BestWindowPlan>>(
      { success: true, data: enrichedPlan, fetchedAt },
      { headers: rateLimitHeaders(decision) }
    );
  } catch (error: unknown) {
    return buildApiErrorResponse<BestWindowPlan>(
      '/api/best-window',
      error,
      'Unable to evaluate outdoor activity windows right now.'
    );
  }
}
