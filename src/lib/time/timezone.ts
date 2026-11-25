import { APP_CONFIG } from '@/lib/configuration/env';
import { DataSourceKind, FreshnessStatus } from '@/types';

const NAIVE_ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export interface ParsedLocalTimestamp {
  utcIso: string;
  epochMs: number;
  localTime: string;
}

/**
 * Convert an Open-Meteo naive local timestamp (e.g. "2026-11-25T14:00") using its
 * explicit utc_offset_seconds into an unambiguous UTC epoch and ISO-8601 string.
 * Prevents runtime timezone drift when the server runs in UTC on Vercel or Node.
 */
export function parseOpenMeteoLocalTime(
  localTimeStr: string,
  utcOffsetSeconds: number
): ParsedLocalTimestamp {
  const trimmed = localTimeStr.trim();
  const match = NAIVE_ISO_RE.exec(trimmed);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = match[6] ? Number(match[6]) : 0;

    const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualUtcMs = localAsUtcMs - utcOffsetSeconds * 1000;
    return {
      utcIso: new Date(actualUtcMs).toISOString(),
      epochMs: actualUtcMs,
      localTime: `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`,
    };
  }

  const parsedMs = Date.parse(trimmed);
  if (Number.isFinite(parsedMs)) {
    const localShifted = new Date(parsedMs + utcOffsetSeconds * 1000);
    return {
      utcIso: new Date(parsedMs).toISOString(),
      epochMs: parsedMs,
      localTime: localShifted.toISOString().slice(0, 16),
    };
  }

  const now = Date.now();
  return {
    utcIso: new Date(now).toISOString(),
    epochMs: now,
    localTime: new Date(now + utcOffsetSeconds * 1000).toISOString().slice(0, 16),
  };
}

/** Evaluate age and freshness status using source-appropriate thresholds. */
export function calculateFreshness(
  observedUtcIso: string,
  dataSourceKind: DataSourceKind = 'MODEL_ESTIMATE',
  nowMs: number = Date.now()
): { status: FreshnessStatus; ageMs: number; humanAge: string } {
  const observedMs = Date.parse(observedUtcIso);
  if (!Number.isFinite(observedMs)) {
    return { status: 'UNAVAILABLE', ageMs: Infinity, humanAge: 'Unknown' };
  }

  const ageMs = Math.max(0, nowMs - observedMs);
  const minutes = Math.floor(ageMs / 60_000);
  const hours = Math.floor(minutes / 60);

  let humanAge: string;
  if (minutes < 1) {
    humanAge = 'Just now';
  } else if (minutes < 60) {
    humanAge = `${minutes}m ago`;
  } else if (hours < 24) {
    const remMin = minutes % 60;
    humanAge = remMin > 0 ? `${hours}h ${remMin}m ago` : `${hours}h ago`;
  } else {
    humanAge = `${Math.floor(hours / 24)}d ago`;
  }

  const freshThreshold =
    dataSourceKind === 'OBSERVED_STATION'
      ? APP_CONFIG.freshness.stationFreshMs
      : APP_CONFIG.freshness.modelFreshMs;

  if (ageMs <= freshThreshold) {
    return { status: 'FRESH', ageMs, humanAge };
  }
  if (ageMs <= APP_CONFIG.freshness.modelStaleMs) {
    return { status: 'STALE', ageMs, humanAge };
  }
  return { status: 'EXPIRED', ageMs, humanAge };
}

/** Format a UTC ISO timestamp in a specific IANA timezone and locale safely. */
export function formatInTimezone(
  utcIso: string,
  timezone: string,
  locale: string = 'en-IN',
  options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
): string {
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return utcIso;
  try {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timezone || 'UTC',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}

/** Format a local wall-time string ("YYYY-MM-DDTHH:mm") without browser timezone distortion. */
export function formatLocalHourLabel(localTime: string): {
  hourLabel: string;
  shortTime: string;
  dateKey: string;
  hourNum: number;
} {
  const match = NAIVE_ISO_RE.exec(localTime);
  if (!match) {
    return {
      hourLabel: localTime,
      shortTime: localTime,
      dateKey: localTime.slice(0, 10),
      hourNum: 0,
    };
  }
  const dateKey = `${match[1]}-${match[2]}-${match[3]}`;
  const hourNum = Number(match[4]);
  const minStr = match[5] ?? '00';
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
  return {
    hourLabel: `${hour12}:${minStr} ${period}`,
    shortTime: `${hour12} ${period}`,
    dateKey,
    hourNum,
  };
}
