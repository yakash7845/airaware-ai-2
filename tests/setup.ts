import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { serverCache } from '@/services/caching/ttlCache';
import { rateLimiter } from '@/lib/security/rateLimit';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  serverCache.clear();
  rateLimiter.clear();
  vi.restoreAllMocks();
});
