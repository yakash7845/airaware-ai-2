# AirAware AI 2.0 — Urban Air Quality Intelligence Platform

> **Understand Your Air. Predict Your Exposure. Make Better Decisions.**
>
> Built for **PromptWars — Challenge 6: Urban Air Quality Assistant**.

## Overview

**AirAware AI 2.0** transforms regional atmospheric and meteorological data into transparent, location-aware, multilingual environmental intelligence. Unlike single-number AQI dashboards, AirAware AI 2.0 answers six deeper questions across ten dedicated pages:

1. **What is the current air quality?** — Indicative India CPCB NAQI calculated deterministically with full methodology provenance.
2. **Which pollutants are contributing?** — PM₂.₅, PM₁₀, CO, NO₂, SO₂, and O₃ sub-indices, breakpoint intervals, and CPCB/WHO limits.
3. **How might conditions change?** — 48-hour past-modelled vs. 72-hour forecast curves, daily summaries, and rule-based event detection.
4. **How do different locations compare?** — Interactive OpenStreetMap explorer with ~45 km CAMS grid indicators and multi-city comparison.
5. **What does it mean for different users?** — Household exposure guidance across Child, Teen, Adult, Senior, and General profiles using identical underlying data.
6. **What practical decisions can we consider?** — Forecast-ranked 2-hour Outdoor Activity Planner, non-sensor Indoor Air Advisor, and grounded conversational AI Assistant.

## Key Capabilities & Routes

- `/` — **Overview:** Guided onboarding, AQI gauge, weather summary, analytical insights, detected events, and 48h trend chart.
- `/live` — **Live Air Quality:** Rolling 24h/8h CPCB NAQI vs. 1h indicative toggle, calculation transparency modal, pollutant cards, and chart/table views.
- `/explore` — **Explore Map:** Client-side Leaflet + OpenStreetMap explorer with ~45 km regional coverage circles and multi-city comparison engine.
- `/forecast` — **Forecast Intelligence:** Hourly inspector, daily min/max/avg summaries, and rule-based event detection (`PM25_SPIKE`, `PM10_SURGE`, `CATEGORY_TRANSITION`, `RAPID_DETERIORATION`, `OZONE_PEAK`, `FORECAST_DETERIORATION`).
- `/exposure` — **Personal Exposure:** Browser-local household profiles with verified identical environmental readings across age categories.
- `/planner` — **Outdoor Planner:** Server-computed `/api/best-window` ranking across 6 activities (`WALKING`, `CYCLING`, `RUNNING`, `OUTDOOR_SPORTS`, `SCHOOL_COMMUTE`, `OUTDOOR_RECREATION`).
- `/indoor` — **Indoor Advisor:** Server-computed `/api/indoor-advisor` hygiene and infiltration guidance with mandatory non-sensor disclaimers.
- `/assistant` — **AI Assistant:** `AIRWARE AI INTELLIGENCE ASSISTANT` powered by Google Gemini with Zod-validated structured responses, prompt-injection defense, and deterministic fallback.
- `/learn` — **Environmental Learning:** 9 multilingual educational topics, interactive SVG particle scale diagram, live CPCB NAQI Calculator sandbox, glossary, and FAQs.
- `/settings` — **Settings:** EN / தமிழ் / हिन्दी switching synced to `<html lang>`, WCAG 2.2 AA typography scaling, high-contrast theme tokens, reduced motion, geolocation consent, and JSON export/reset.

## Scientific & Ethical Boundaries

- **Regional Model Data:** Live and trailing air-quality data come from Open-Meteo's Copernicus CAMS model (~45 km global / ~11 km Europe grid), **not** physical roadside sensors.
- **Averaging Periods:** Current primary indicative CPCB NAQI computes trailing 24-hour means (PM₂.₅, PM₁₀, NO₂, SO₂) and 8-hour means (CO, O₃) from `past_days=2` CAMS series when completeness meets CPCB criteria (`≥16/24h`, `≥6/8h`), and explicitly labels shorter/future hourly windows as indicative estimates.
- **No Medical Claims or Fake Indoor Sensors:** AirAware AI 2.0 provides general environmental education and never diagnoses health conditions or claims indoor pollutant measurements without connected hardware.
- **AI Grounding:** Gemini never computes AQI or invents measurements; all AI outputs are validated against server-fetched context and fall back seamlessly to deterministic rules when unconfigured or rejected.

## Local Setup

```bash
npm install
cp .env.example .env.local
# Optional: set GEMINI_API_KEY in .env.local for Gemini explanations
npm run dev
```

Open `http://localhost:3000`.

## Verification Commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run test:e2e
npm run audit:deps
```

## Documentation Index

- [Architecture Specification](ARCHITECTURE.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Data Sources & Methodology](DATA_SOURCES.md)
- [Security Engineering](SECURITY.md)
- [Testing & Verification](TESTING.md)
- [Evaluation Readiness Report](EVALUATION_READINESS.md)
- [Contributing Guidelines](CONTRIBUTING.md)
