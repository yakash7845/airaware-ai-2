# AirAware AI 2.0 — API Documentation

All routes return a standardized JSON envelope:

```json
{
  "success": true,
  "data": {},
  "fetchedAt": "2026-11-25T18:00:00.000Z"
}
```

Error responses return `success: false` with `{ error: { code, message }, fetchedAt }` and appropriate HTTP status (`400`, `413`, `429`, `502`, `504`, `500`).

## Endpoints

### `GET /api/health`
Returns service readiness, whether `GEMINI_API_KEY` is configured (`boolean`), and server TTL cache hit/miss statistics.

### `GET /api/air?lat={lat}&lon={lon}&name={name}&timezone={tz}&refresh={true|false}`
Fetches and normalizes CAMS air quality (`past_days=2`, `forecast_days=3`) + aligned weather context, computing both 24h/8h rolling CPCB NAQI and 1h indicative NAQI, environmental events, and trend analytics.

### `GET /api/weather?lat={lat}&lon={lon}&timezone={tz}`
Returns normalized `WeatherData` (temperature, apparent temperature, humidity, wind speed/direction, precipitation, WMO condition, pressure, visibility).

### `GET /api/location?q={query}`
Geocodes city names (`2–100` characters) via Open-Meteo Geocoding API with 24h server caching.

### `POST /api/compare`
Compares 2–4 locations simultaneously (`{ locations: [{ name, lat, lon, timezone }], language }`), returning timestamp compatibility checks, cleanest/highest locations, and summary.

### `POST /api/explain`
Generates age-adapted environmental guidance (`{ lat, lon, locationName, timezone, profileCategory, language }`) grounded strictly in server-fetched data.

### `POST /api/best-window`
Evaluates and ranks 2-hour outdoor activity windows (`{ lat, lon, locationName, activity, profileCategory, language, targetDate?, timePreference? }`).

### `POST /api/indoor-advisor`
Synthesizes outdoor CAMS conditions with user indoor space answers (`{ lat, lon, locationName, setup, profileCategory, language }`) with explicit non-sensor disclaimers.

### `POST /api/chat`
Runs `AIRWARE AI INTELLIGENCE ASSISTANT` (`{ message, lat, lon, locationName, compareLocations?, profileCategory, language, history? }`) with prompt-injection screening, structured JSON validation, and deterministic fallback.
