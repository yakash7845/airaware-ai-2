# AirAware AI 2.0 — System Architecture

## 1. Architectural Principles

AirAware AI 2.0 is built around four strict invariants:

1. **Deterministic Calculations First:** Every CPCB NAQI sub-index, overall AQI score, dominant pollutant, environmental event, trend direction, location comparison, outdoor window ranking, and indoor risk level is computed deterministically in `src/domain/`. Generative AI is never used to compute numbers or invent measurements.
2. **Server-Side Environmental Grounding:** All conversational and explanation endpoints (`/api/explain`, `/api/best-window`, `/api/indoor-advisor`, `/api/chat`) resolve environmental snapshots server-side from cached Open-Meteo providers by validated coordinates rather than trusting mutable client snapshot payloads.
3. **Scientific Provenance & Honest Limitations:** Atmospheric model values (Copernicus CAMS via Open-Meteo) are explicitly tagged as `MODEL_ESTIMATE` / `PAST_MODELLED` / `FORECAST`, never misrepresented as physical street-level monitoring stations or indoor sensors.
4. **Full Separation of Layers:**
   - `src/domain/`: Pure, side-effect-free TypeScript domain engines (`aqi/`, `pollutants/`, `analytics/`, `personalization/`, `recommendations/`).
   - `src/services/`: External integrations, Zod response validation, retries, deduplication, TTL cache, and Gemini structured orchestration.
   - `src/lib/`: Environment configuration (`env.ts`), error hierarchy (`appError.ts`), safe logging (`logger.ts`), rate limiting (`rateLimit.ts`), prompt injection guards (`promptGuard.ts`), Zod request validation (`apiSchemas.ts`), and timezone offset parsing (`timezone.ts`).
   - `src/i18n/`: Complete localization dictionaries (`en.ts`, `ta.ts`, `hi.ts`).
   - `src/app/`: 10 Next.js App Router pages + 9 hardened REST route handlers.

## 2. Data & AI Pipeline

```text
User Coordinates (Search / Preset / Explicit Geolocation)
  -> API Route (/api/air, /api/compare, /api/chat, etc.)
  -> SlidingWindowRateLimiter + Zod Request Validation
  -> Open-Meteo Air Quality & Weather Providers (fetchValidatedJson: timeout + retry + dedup + Zod schema)
  -> parseOpenMeteoLocalTime(localIso, utc_offset_seconds) -> UTC ISO-8601
  -> computeRollingCpcbNaqi (24h PM/NO2/SO2, 8h CO/O3) + computeCpcbNaqi (1h indicative)
  -> detectEnvironmentalEvents + buildTrendAnalytics
  -> Normalized AirSnapshot -> UI / Gemini Structured JSON + validateAiProseSafety -> Deterministic Fallback
```

## 3. Application Routes (10 Destinations)

- `/` — Overview & Onboarding Gateway
- `/live` — Live Air Quality & CPCB Calculation Inspector
- `/explore` — Interactive Leaflet Map & Multi-Location Comparison
- `/forecast` — Forecast Intelligence, Daily Summaries & Event Detection
- `/exposure` — Personal Exposure & Household Profiles
- `/planner` — Intelligent Outdoor Activity Planner
- `/indoor` — Indoor Air Intelligence Advisor
- `/assistant` — AIRWARE AI Intelligence Assistant
- `/learn` — Environmental Education Center & Interactive CPCB Calculator
- `/settings` — Language, Accessibility (WCAG 2.2 AA), Privacy & Data Controls
