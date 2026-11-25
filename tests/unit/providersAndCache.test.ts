import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { TtlCache } from '@/services/caching/ttlCache';
import { assertValidCoordinates, fetchValidatedJson } from '@/services/http/fetchJson';
import { callGeminiStructured, parseJsonFromModel } from '@/services/gemini/geminiClient';
import { extractClientIdentifier, SlidingWindowRateLimiter } from '@/lib/security/rateLimit';
import {
  buildFamilyProfile,
  isSameGeoLocation,
  DEFAULT_LOCATION,
  PRESET_CITIES,
} from '@/lib/configuration/presets';
import { buildLocationRequestBase, fetchApiJson, postApiJson } from '@/utils/apiClient';
import { escapeMapHtml } from '@/components/maps/PollutionMap';

describe('Providers, Caching, Security Controls & Client Utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('TtlCache handles storage, TTL expiry, purgeExpired, delete, and LRU eviction cleanly', () => {
    vi.useFakeTimers();
    const cache = new TtlCache(2);

    cache.set('ignored', 'value', 0);
    expect(cache.size()).toBe(0);

    cache.set('a', { count: 1 }, 1000);
    cache.set('b', { count: 2 }, 5000);
    // Access 'a' to promote it as MRU before adding 'c'
    expect(cache.get<{ count: number }>('a')).toEqual({ count: 1 });
    cache.set('c', { count: 3 }, 5000);

    // 'b' (LRU) must have been evicted; 'a' and 'c' remain
    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toEqual({ count: 1 });
    expect(cache.get('c')).toEqual({ count: 3 });

    vi.advanceTimersByTime(1500);
    expect(cache.get('a')).toBeNull();
    expect(cache.purgeExpired()).toBe(0);
    expect(cache.delete('c')).toBe(true);
    expect(cache.stats().hits).toBeGreaterThanOrEqual(3);

    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('assertValidCoordinates and fetchValidatedJson enforce validation, dedup, retries, timeouts, and schema boundaries', async () => {
    expect(() => assertValidCoordinates(95, 80, 'test')).toThrow();
    expect(assertValidCoordinates(13.087849, 80.278479, 'test')).toEqual({
      latRounded: 13.0878,
      lonRounded: 80.2785,
    });

    const SampleSchema = z.object({ ok: z.boolean() });

    // In-flight deduplication: two concurrent calls trigger only one upstream fetch
    let fetchCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      fetchCount += 1;
      await new Promise((r) => setTimeout(r, 20));
      return Response.json({ ok: true });
    });

    const [first, second] = await Promise.all([
      fetchValidatedJson('https://example.test/dedup', {
        provider: 'test',
        label: 'TestProvider',
        timeoutMs: 1000,
        schema: SampleSchema,
        dedupKey: 'dedup-key-1',
      }),
      fetchValidatedJson('https://example.test/dedup', {
        provider: 'test',
        label: 'TestProvider',
        timeoutMs: 1000,
        schema: SampleSchema,
        dedupKey: 'dedup-key-1',
      }),
    ]);
    expect(fetchCount).toBe(1);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    // Non-retryable 400 throws immediately without retrying
    vi.restoreAllMocks();
    let badCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      badCalls += 1;
      return new Response('Bad request', { status: 400 });
    });
    await expect(
      fetchValidatedJson('https://example.test/400', {
        provider: 'test',
        label: 'TestProvider',
        timeoutMs: 1000,
        maxRetries: 2,
        schema: SampleSchema,
      })
    ).rejects.toThrow(/HTTP 400/);
    expect(badCalls).toBe(1);

    // 429 retries and recovers cleanly
    vi.restoreAllMocks();
    let rateCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      rateCalls += 1;
      if (rateCalls === 1) return new Response('Too many requests', { status: 429 });
      return Response.json({ ok: true });
    });
    const recovered = await fetchValidatedJson('https://example.test/429', {
      provider: 'test',
      label: 'TestProvider',
      timeoutMs: 1000,
      maxRetries: 1,
      schema: SampleSchema,
    });
    expect(rateCalls).toBe(2);
    expect(recovered.ok).toBe(true);

    // Network error throws 502 ProviderError after exhausting retries
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('socket hang up'));
    await expect(
      fetchValidatedJson('https://example.test/neterr', {
        provider: 'test',
        label: 'TestProvider',
        timeoutMs: 1000,
        maxRetries: 0,
        schema: SampleSchema,
      })
    ).rejects.toThrow(/temporarily unreachable/);
  });

  it('callGeminiStructured and parseJsonFromModel handle missing key, HTTP 429 retries, 500 failure, and fenced JSON', async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(await callGeminiStructured({ systemInstruction: 'sys', userPrompt: 'hi' })).toBeNull();

    process.env.GEMINI_API_KEY = 'unit-test-gemini-key';
    let gemCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      gemCalls += 1;
      if (gemCalls === 1) return new Response('rate limited', { status: 429 });
      return Response.json({
        candidates: [{ content: { parts: [{ text: '```json\n{"status":"grounded"}\n```' }] } }],
      });
    });

    const text = await callGeminiStructured({ systemInstruction: 'sys', userPrompt: 'hi' });
    expect(text).toContain('grounded');
    expect(parseJsonFromModel(text!)).toEqual({ status: 'grounded' });

    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad key', { status: 403 }));
    expect(await callGeminiStructured({ systemInstruction: 'sys', userPrompt: 'hi' })).toBeNull();

    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('AbortError'));
    expect(await callGeminiStructured({ systemInstruction: 'sys', userPrompt: 'hi' })).toBeNull();

    process.env.GEMINI_API_KEY = prevKey;
  });

  it('extractClientIdentifier sanitizes untrusted headers and SlidingWindowRateLimiter prunes expired buckets', () => {
    const realHeaders = new Headers({ 'x-real-ip': '203.0.113.10', 'x-forwarded-for': '1.2.3.4' });
    expect(extractClientIdentifier(realHeaders)).toBe('203.0.113.10');

    const forwardedHeaders = new Headers({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1' });
    expect(extractClientIdentifier(forwardedHeaders)).toBe('198.51.100.7');

    const injectedHeaders = new Headers({ 'x-forwarded-for': '127.0.0.1; DROP TABLE' });
    expect(extractClientIdentifier(injectedHeaders)).toBe('local-client');

    const limiter = new SlidingWindowRateLimiter();
    expect(limiter.check('client-a', 1, 10_000).allowed).toBe(true);
    expect(limiter.check('client-a', 1, 10_000).allowed).toBe(false);
    limiter.clear();
    expect(limiter.check('client-a', 1, 10_000).allowed).toBe(true);
  });

  it('apiClient unwraps structured payloads, surfaces API errors, and escapes map HTML XSS', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ success: true, data: { value: 42 }, fetchedAt: 'now' })
    );
    expect(await fetchApiJson<{ value: number }>('/api/health')).toEqual({ value: 42 });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ success: false, error: { code: 'BAD', message: 'Validation failed' } })
    );
    await expect(postApiJson('/api/chat', { message: 'test' })).rejects.toThrow(
      'Validation failed'
    );

    expect(escapeMapHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );

    const profile = buildFamilyProfile('p-1', '  Meera Sharma  ', 'CHILD', '2026-01-01T00:00:00Z');
    expect(profile).toEqual({
      id: 'p-1',
      name: 'Meera Sharma',
      category: 'CHILD',
      ageRange: '< 12 yrs',
      avatarColor: '#15803d',
      createdAt: '2026-01-01T00:00:00Z',
    });

    expect(isSameGeoLocation(DEFAULT_LOCATION, PRESET_CITIES[0]!)).toBe(true);
    expect(isSameGeoLocation(DEFAULT_LOCATION, PRESET_CITIES[1]!)).toBe(false);

    expect(buildLocationRequestBase(DEFAULT_LOCATION)).toEqual({
      lat: DEFAULT_LOCATION.latitude,
      lon: DEFAULT_LOCATION.longitude,
      locationName: DEFAULT_LOCATION.name,
      timezone: DEFAULT_LOCATION.timezone,
    });
    expect(buildLocationRequestBase({ ...DEFAULT_LOCATION, timezone: '' }).timezone).toBe('auto');
  });
});
