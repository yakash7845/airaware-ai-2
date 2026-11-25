import { NextRequest, NextResponse } from 'next/server';
import { evaluateIndoorGuidance } from '@/domain/recommendations/indoorAdvisor';
import { enforceRouteRateLimit } from '@/lib/security/withRateLimit';
import {
  buildApiErrorResponse,
  IndoorAdvisorRequestSchema,
  parseValidatedJsonBody,
  rateLimitHeaders,
} from '@/lib/validation/apiSchemas';
import { getLocationAirSnapshot } from '@/services/environment/snapshotService';
import { enrichIndoorAdvisorWithAi } from '@/services/gemini/enrichmentService';
import { ApiResponse, IndoorAdvisorPlan } from '@/types';

export async function POST(request: NextRequest) {
  const fetchedAt = new Date().toISOString();

  try {
    const decision = enforceRouteRateLimit(request.headers, 'indoor-advisor', 'ai');
    const body = await parseValidatedJsonBody(request, IndoorAdvisorRequestSchema);

    const snapshot = await getLocationAirSnapshot({
      latitude: body.lat,
      longitude: body.lon,
      locationName: body.locationName,
      timezone: body.timezone,
    });

    const deterministicPlan = evaluateIndoorGuidance({
      setup: body.setup,
      outdoorAqi: snapshot.computedAqi.value,
      outdoorCategory: snapshot.computedAqi.categoryLabel,
      dominantPollutant: snapshot.computedAqi.dominantPollutant,
      profileCategory: body.profileCategory,
      language: body.language,
      locationName: snapshot.location.name,
    });

    const finalPlan = await enrichIndoorAdvisorWithAi(deterministicPlan);
    return NextResponse.json<ApiResponse<IndoorAdvisorPlan>>(
      { success: true, data: finalPlan, fetchedAt },
      { headers: rateLimitHeaders(decision) }
    );
  } catch (error: unknown) {
    return buildApiErrorResponse<IndoorAdvisorPlan>(
      '/api/indoor-advisor',
      error,
      'Unable to evaluate indoor environment guidance right now.'
    );
  }
}
