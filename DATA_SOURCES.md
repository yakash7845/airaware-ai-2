# AirAware AI 2.0 — Data Sources, Methodology & Attribution

## 1. Environmental & Geospatial Providers

| Provider | Role | Resolution / Frequency | Attribution & License |
|---|---|---|---|
| **Open-Meteo Air Quality API** (`/v1/air-quality`) | Hourly & current concentrations for PM₂.₅, PM₁₀, CO, NO₂, SO₂, O₃, dust, AOD, UV | Copernicus CAMS Global (~0.4° / ~45 km) & CAMS Europe (~0.1° / ~11 km), hourly | Air quality data by Open-Meteo.com (Copernicus CAMS data, CC BY 4.0) |
| **Open-Meteo Weather API** (`/v1/forecast`) | Temperature, apparent temp, humidity, wind, precipitation, WMO weather code, pressure, visibility | Model grid, hourly & 15-min current | Weather data by Open-Meteo.com (CC BY 4.0) |
| **Open-Meteo Geocoding API** (`/v1/search`) | City search, coordinates, admin region, IANA timezone | City centroids | Geocoding by Open-Meteo.com (GeoNames) |
| **OpenStreetMap Raster Tiles** (`tile.openstreetmap.org`) | Interactive Explore Map base layer | Global map tiles | Map tiles © OpenStreetMap contributors (ODbL) |

## 2. Scientific AQI Methodology

- **Standard:** Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC), Government of India — *National Air Quality Index* (October 2014).
- **Criteria Pollutants & Averaging Periods:**
  - **24-hour average:** PM₂.₅ (`µg/m³`), PM₁₀ (`µg/m³`), NO₂ (`µg/m³`), SO₂ (`µg/m³`), NH₃ (`µg/m³`), Pb (`µg/m³`).
  - **8-hour average:** CO (`mg/m³`, converted from Open-Meteo `µg/m³` via `/ 1000`), O₃ (`µg/m³`).
- **Minimum Data Rule:** Overall NAQI requires at least **3** valid pollutants, including at least one particulate (`PM₂.₅` or `PM₁₀`).
- **Overall Index:** $\text{NAQI} = \max(I_1, I_2, \dots, I_n)$.

## 3. Responsible Data Distinctions

1. **Model Estimates vs. Physical Ground Monitors:** Values retrieved from Open-Meteo CAMS are regional atmospheric chemistry simulations (~45 km grid globally), not physical monitoring station sensors on a specific street.
2. **Rolling Averages vs. Hourly Forecast Snapshots:** Current primary indicative CPCB NAQI uses trailing 24h/8h CAMS means (`past_days=2`) when sufficient hours are present (`≥16/24h`, `≥6/8h`). Single-hour forecast slots are labeled as **hourly indicative estimates**.
3. **No Indoor Measurements:** AirAware AI 2.0 does not measure indoor air quality without compatible connected hardware sensors.
4. **Unavailable Fields:** `NH₃` is currently `null` in CAMS Global over India (`Pb` is not supplied by Open-Meteo) and is displayed honestly as unavailable rather than assumed zero.
