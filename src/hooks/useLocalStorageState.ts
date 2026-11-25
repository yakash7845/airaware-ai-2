'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { z } from 'zod';

const STORAGE_CHANGE_EVENT = 'airaware-v2-storage-change';

interface SnapshotCacheEntry<T> {
  raw: string | null;
  value: T;
}

const memoryCache = new Map<string, SnapshotCacheEntry<unknown>>();

function safeJsonParse(raw: string): unknown {
  return JSON.parse(raw, (key, val) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return val;
  });
}

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  schema: z.ZodType<T>
): [T, (next: T) => void] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') return () => {};

      const onCustom = (e: Event) => {
        const detail = (e as CustomEvent<{ key: string }>).detail;
        if (!detail || detail.key === key) onStoreChange();
      };
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === key) onStoreChange();
      };

      window.addEventListener(STORAGE_CHANGE_EVENT, onCustom);
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener(STORAGE_CHANGE_EVENT, onCustom);
        window.removeEventListener('storage', onStorage);
      };
    },
    [key]
  );

  const getSnapshot = useCallback((): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      const cached = memoryCache.get(key) as SnapshotCacheEntry<T> | undefined;
      if (cached && cached.raw === raw) return cached.value;

      if (raw !== null) {
        const parsed = safeJsonParse(raw);
        const validated = schema.safeParse(parsed);
        if (validated.success) {
          memoryCache.set(key, { raw, value: validated.data });
          return validated.data;
        }
      }

      memoryCache.set(key, { raw, value: defaultValue });
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue, schema]);

  const getServerSnapshot = useCallback((): T => defaultValue, [defaultValue]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T) => {
      if (typeof window === 'undefined') return;
      try {
        const serialized = JSON.stringify(next);
        window.localStorage.setItem(key, serialized);
        memoryCache.set(key, { raw: serialized, value: next });
        window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
      } catch {
        // Ignore storage quota / private-browsing exceptions gracefully
      }
    },
    [key]
  );

  return [value, setValue];
}
