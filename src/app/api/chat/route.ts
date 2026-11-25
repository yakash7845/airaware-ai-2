/**
 * @module api/chat
 * `POST /api/chat` — Handles grounded AIRWARE AI Assistant requests with prompt injection guards,
 * structured Zod validation, numeric grounding checks, and deterministic fallback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteRateLimit } from '@/lib/security/withRateLimit';
import {
  buildApiErrorResponse,
  ChatRequestSchema,
  parseValidatedJsonBody,
  rateLimitHeaders,
} from '@/lib/validation/apiSchemas';
import { getLocationAirSnapshot } from '@/services/environment/snapshotService';
import { runGroundedAiAssistant } from '@/services/gemini/assistantService';
import { ApiResponse, ChatMessage } from '@/types';

export async function POST(request: NextRequest) {
  const fetchedAt = new Date().toISOString();

  try {
    const decision = enforceRouteRateLimit(request.headers, 'chat', 'ai');
    const body = await parseValidatedJsonBody(request, ChatRequestSchema);

    const [primarySnapshot, ...comparisonSnapshots] = await Promise.all([
      getLocationAirSnapshot({
        latitude: body.lat,
        longitude: body.lon,
        locationName: body.locationName,
        timezone: body.timezone,
      }),
      ...body.compareLocations.map((loc) =>
        getLocationAirSnapshot({
          latitude: loc.lat,
          longitude: loc.lon,
          locationName: loc.name,
          timezone: loc.timezone,
        })
      ),
    ]);

    const reply = await runGroundedAiAssistant({
      question: body.message,
      primarySnapshot,
      comparisonSnapshots,
      category: body.profileCategory,
      language: body.language,
      history: body.history,
    });

    return NextResponse.json<ApiResponse<ChatMessage>>(
      { success: true, data: reply, fetchedAt },
      { headers: rateLimitHeaders(decision) }
    );
  } catch (error: unknown) {
    return buildApiErrorResponse<ChatMessage>(
      '/api/chat',
      error,
      'Unable to process environmental assistant query right now.'
    );
  }
}
