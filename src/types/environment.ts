export type Language = 'en' | 'ta' | 'hi';

export type TextSize = 'normal' | 'large' | 'extra-large';

export type DataSourceKind = 'OBSERVED_STATION' | 'MODEL_ESTIMATE' | 'PAST_MODELLED' | 'FORECAST';

export type ValidationStatus = 'VALID' | 'PARTIAL' | 'INVALID';

export type FreshnessStatus = 'FRESH' | 'STALE' | 'EXPIRED' | 'UNAVAILABLE';

export type PollutantId = 'pm2_5' | 'pm10' | 'co' | 'no2' | 'so2' | 'o3' | 'nh3' | 'pb';

export type CorePollutantId = 'pm2_5' | 'pm10' | 'co' | 'no2' | 'so2' | 'o3';

export type AveragingPeriod = '24h' | '8h' | '1h';

export type CalculationMethodology =
  'CPCB_NAQI_ROLLING_MODEL' | 'CPCB_NAQI_INDICATIVE_HOURLY' | 'UNAVAILABLE';

export type CpcbCategoryKey =
  'GOOD' | 'SATISFACTORY' | 'MODERATE' | 'POOR' | 'VERY_POOR' | 'SEVERE';

export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  admin2?: string;
  timezone: string;
  population?: number;
  countryCode: string;
}

export interface Measurement {
  pollutant: CorePollutantId;
  value: number;
  unit: string;
  rollingAverageValue?: number | null;
  rollingAverageHours?: number;
  rollingPeriodRequired?: AveragingPeriod;
  dataSourceKind: DataSourceKind;
  validationStatus: ValidationStatus;
  source: string;
  observedAt: string; // Canonical UTC ISO 8601
  localTime: string; // Location local wall time ISO string
  fetchedAt: string;
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  attribution: string;
}

export type WeatherConditionKey =
  'CLEAR' | 'PARTLY_CLOUDY' | 'OVERCAST' | 'FOG' | 'DRIZZLE' | 'RAIN' | 'THUNDERSTORM' | 'UNKNOWN';

export interface WeatherData {
  temperature: number;
  apparentTemperature?: number | null;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts?: number | null;
  precipitation: number;
  surfacePressure?: number | null;
  visibilityMeters?: number | null;
  weatherCode: number | null;
  weatherCondition: WeatherConditionKey;
  isDay: boolean;
  observedAt: string;
  localTime: string;
  source: string;
  dataSourceKind: DataSourceKind;
  attribution: string;
}

export interface PollutantSubIndexDetail {
  pollutant: PollutantId;
  concentration: number | null;
  unit: string;
  averagingPeriod: AveragingPeriod;
  hoursSampled: number;
  hoursRequired: number;
  subIndex: number | null;
  breakpointRange: {
    concLow: number;
    concHigh: number;
    aqiLow: number;
    aqiHigh: number;
  } | null;
  isAvailable: boolean;
  limitationNote?: string;
}

export interface ComputedAqi {
  standard: 'IN_NAQI';
  value: number | null;
  categoryKey: CpcbCategoryKey | null;
  categoryLabel: string | null;
  categoryColor: string | null;
  categoryTextColor: string | null;
  categoryPattern: 'solid' | 'striped' | 'dotted' | 'diagonal' | 'cross' | 'alert';
  dominantPollutant: PollutantId | null;
  subIndices: Partial<Record<PollutantId, number>>;
  subIndexDetails: PollutantSubIndexDetail[];
  methodology: CalculationMethodology;
  methodDescription: string;
  dataSourceKind: DataSourceKind;
  sourceName: string;
  observedAt: string;
  pollutantCount: number;
  hasPm: boolean;
  dataSufficient: boolean;
  limitations: string[];
}

export interface SupplementaryMetrics {
  dustUgM3?: number | null;
  aerosolOpticalDepth?: number | null;
  uvIndex?: number | null;
  openMeteoUsAqi?: number | null;
  openMeteoEuropeanAqi?: number | null;
}

export interface HourlySlot {
  time: string; // Canonical UTC ISO 8601
  localTime: string; // Location local time (YYYY-MM-DDTHH:mm)
  isForecast: boolean;
  dataSourceKind: DataSourceKind;
  measurements: Measurement[];
  computedAqi: ComputedAqi | null;
  weather?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    weatherCode: number | null;
    weatherCondition: WeatherConditionKey;
  };
  supplementary?: SupplementaryMetrics;
}

export type EnvironmentalEventType =
  | 'PM25_SPIKE'
  | 'PM10_SURGE'
  | 'CATEGORY_TRANSITION'
  | 'RAPID_DETERIORATION'
  | 'FORECAST_DETERIORATION'
  | 'OZONE_PEAK';

export type EventSeverity = 'INFO' | 'ELEVATED' | 'HIGH';

export interface EnvironmentalEvent {
  id: string;
  type: EnvironmentalEventType;
  severity: EventSeverity;
  timestamp: string;
  localTime: string;
  isForecast: boolean;
  pollutant?: CorePollutantId;
  previousValue?: number;
  currentValue?: number;
  unit?: string;
  deltaPercent?: number;
  thresholdDescription: string;
  titleKey: string;
  summary: string;
  possibleContributingFactors: string[];
}

export interface DailyForecastSummary {
  date: string; // YYYY-MM-DD in location local time
  minAqi: number | null;
  maxAqi: number | null;
  avgAqi: number | null;
  dominantPollutant: PollutantId | null;
  avgPm25: number | null;
  avgPm10: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  totalPrecipitation: number | null;
  slotCount: number;
  isPastDay: boolean;
}

export interface TrendAnalyticsSummary {
  pastHoursCount: number;
  forecastHoursCount: number;
  pastMeanAqi: number | null;
  forecastMeanAqi: number | null;
  aqiDeltaPercent: number | null;
  trendDirection: 'IMPROVING' | 'WORSENING' | 'STABLE' | 'INSUFFICIENT_DATA';
  dailySummaries: DailyForecastSummary[];
  historicalLimitationNote: string;
}

export interface AirSnapshot {
  location: GeoLocation;
  current: Measurement[];
  supplementary: SupplementaryMetrics;
  /** Primary indicative CPCB NAQI using 24h/8h CAMS rolling averages where available. */
  computedAqi: ComputedAqi;
  /** Instantaneous 1-hour CAMS snapshot sub-indices for transparency comparison. */
  hourlyIndicativeAqi: ComputedAqi;
  /** Past 48h (modelled) + current + future 72h (forecast) chronological slots. */
  hourlyTimeline: HourlySlot[];
  /** Future 48h subset for quick planners/charts. */
  hourlyForecast: HourlySlot[];
  weather: WeatherData | null;
  freshness: FreshnessStatus;
  dataAge: string;
  spatialResolutionNote: string;
  warnings: string[];
  events: EnvironmentalEvent[];
  trendSummary: TrendAnalyticsSummary;
  sources: Array<{
    name: string;
    endpoint: string;
    dataSourceKind: DataSourceKind;
    attribution: string;
  }>;
  observedAt: string;
  localTime: string;
  utcOffsetSeconds: number;
  fetchedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  fetchedAt: string;
}
