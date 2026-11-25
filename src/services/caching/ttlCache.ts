import { APP_CONFIG } from '@/lib/configuration/env';

interface CacheRecord<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache {
  private readonly store = new Map<string, CacheRecord<unknown>>();
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries: number = APP_CONFIG.cache.maxEntries) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheRecord<T> | undefined;
    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }

    // Refresh insertion order for basic LRU eviction
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) return;
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      this.purgeExpired();
      if (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey !== undefined) {
          this.store.delete(oldestKey);
        }
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  size(): number {
    return this.store.size;
  }

  stats(): { size: number; hits: number; misses: number } {
    return { size: this.store.size, hits: this.hits, misses: this.misses };
  }

  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [k, rec] of this.store.entries()) {
      if (now > rec.expiresAt) {
        this.store.delete(k);
        purged += 1;
      }
    }
    return purged;
  }
}

const globalCache = globalThis as unknown as { __airaware_v2_cache__?: TtlCache };
export const serverCache = globalCache.__airaware_v2_cache__ ?? new TtlCache();
if (process.env.NODE_ENV !== 'production') {
  globalCache.__airaware_v2_cache__ = serverCache;
}
