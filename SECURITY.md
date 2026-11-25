# AirAware AI 2.0 — Security Engineering

## 1. Threat Model & Implemented Controls

| Threat Vector | Implemented Control | Module |
|---|---|---|
| API secret leakage | `GEMINI_API_KEY` read only server-side via `getServerGeminiApiKey()`; sent solely via `x-goog-api-key` header; never bundled to client. | `src/lib/configuration/env.ts`, `src/services/gemini/geminiClient.ts` |
| Log credential exposure | `redactSensitiveText()` strips Google API keys (`AIza...`), bearer tokens, and header key/value pairs before writing server warnings/errors. | `src/lib/logging/logger.ts` |
| Client spoofing of pollutant/AQI data | `/api/explain`, `/api/best-window`, `/api/indoor-advisor`, and `/api/chat` fetch verified server-cached snapshots by coordinates instead of trusting arbitrary client-submitted AQI numbers. | `src/app/api/*` |
| Prompt injection & XSS | `inspectUserPrompt()` rejects system-override / prompt-extraction / script patterns; Gemini receives `systemInstruction` separately from JSON context and user text. | `src/lib/security/promptGuard.ts`, `src/services/gemini/assistantService.ts` |
| AI numeric/medical hallucination | `StructuredAiOutputSchema` (Zod) + `validateAiProseSafety()` reject ungrounded numbers or medical diagnosis claims and switch cleanly to deterministic fallback. | `src/services/gemini/responseSchema.ts` |
| Denial of Service / API abuse | `SlidingWindowRateLimiter` protects standard routes (60 req/min default) and AI routes (20 req/min default) with `429 Retry-After`; `parseValidatedJsonBody()` enforces a 256 KB body limit. | `src/lib/security/rateLimit.ts`, `src/lib/validation/apiSchemas.ts` |
| Upstream schema tampering | All Open-Meteo responses undergo strict runtime Zod validation before entering domain calculations. | `src/lib/validation/openMeteoSchemas.ts` |
| Browser prototype pollution | `safeJsonParse()` in `useLocalStorageState` strips `__proto__`, `constructor`, and `prototype` before Zod validation. | `src/hooks/useLocalStorageState.ts` |
| Browser transport & frame attacks | Security headers (`CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `HSTS`, `Referrer-Policy`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`). | `next.config.ts` |

## 2. Privacy & Personal Data Policy

- **No accounts or central database:** Household profiles, indoor setups, and preferences remain in browser `localStorage` only.
- **No medical records:** Profiles store only display name and broad age category (`CHILD`, `TEEN`, `ADULT`, `SENIOR`, `GENERAL`).
- **Explicit Geolocation Consent:** Browser geolocation runs only on explicit user button click (`requestBrowserGeolocation`) and is never triggered automatically on page load.
