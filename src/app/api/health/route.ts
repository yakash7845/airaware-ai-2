/**
 * @module api/health
 * `GET /api/health` — Operational health, Gemini key configuration status, and cache statistics.
 */
import { NextResponse } from 'next/server';
import { getServerGeminiApiKey } from '@/lib/configuration/env';
import { serverCache } from '@/services/caching/ttlCache';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'AirAware AI 2.0',
    geminiConfigured: getServerGeminiApiKey().length > 0,
    cacheStats: serverCache.stats(),
    timestamp: new Date().toISOString(),
  });
}
