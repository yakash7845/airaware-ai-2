/**
 * @module api
 * Shared typed request payloads for AirAware POST API routes.
 * Re-exported from `@/types` so client pages and server handlers share a single
 * compile-time request contract without introducing server dependencies to client code.
 */
import { Language } from './environment';
import {
  ActivityType,
  IndoorEnvironmentSetup,
  ProfileCategory,
  TimeWindowPreference,
} from './personalization';

/** Coordinate + location identifier fields shared by grounded POST routes. */
export interface BaseLocationRequestPayload {
  lat: number;
  lon: number;
  locationName: string;
  timezone: string;
}

/** Location item passed to `/api/compare` and comparison-enabled chat requests. */
export interface LocationRefPayload {
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

/** Request body for `POST /api/compare`. */
export interface CompareRequestPayload {
  locations: LocationRefPayload[];
  language: Language;
}

/** Request body for `POST /api/explain`. */
export interface ExplainRequestPayload extends BaseLocationRequestPayload {
  profileCategory: ProfileCategory;
  language: Language;
}

/** Request body for `POST /api/best-window`. */
export interface BestWindowRequestPayload extends BaseLocationRequestPayload {
  activity: ActivityType;
  profileCategory: ProfileCategory;
  language: Language;
  targetDate?: string;
  timePreference: TimeWindowPreference;
}

/** Request body for `POST /api/indoor-advisor`. */
export interface IndoorAdvisorRequestPayload extends BaseLocationRequestPayload {
  setup: IndoorEnvironmentSetup;
  profileCategory: ProfileCategory;
  language: Language;
}

/** Request body for `POST /api/chat`. */
export interface ChatRequestPayload extends BaseLocationRequestPayload {
  message: string;
  compareLocations?: LocationRefPayload[];
  profileCategory: ProfileCategory;
  language: Language;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}
