import {
  AirSnapshot,
  ComputedAqi,
  CorePollutantId,
  DataSourceKind,
  GeoLocation,
  HourlySlot,
  Language,
  PollutantId,
  TextSize,
} from './environment';

export type ProfileCategory = 'CHILD' | 'TEEN' | 'ADULT' | 'SENIOR' | 'GENERAL';

export type EnvironmentalInterest =
  'FAMILY_HEALTH' | 'OUTDOOR_SPORTS' | 'COMMUTING' | 'AIR_SCIENCE' | 'URBAN_PLANNING';

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: TextSize;
  reducedMotion: boolean;
}

export interface FamilyProfile {
  id: string;
  name: string;
  category: ProfileCategory;
  ageRange: string;
  avatarColor: string;
  createdAt: string;
}

export interface ProfileGuidance {
  profileId?: string;
  profileCategory: ProfileCategory;
  headline: string;
  summary: string;
  activityGuidance: string;
  precautionarySteps: string[];
  pollutantBreakdown: string;
  whyDiffersNote: string;
  cautionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  language: Language;
  provenance: {
    aqiValue: number | null;
    aqiCategory: string | null;
    dominantPollutant: PollutantId | null;
    dominantPollutantValue?: number;
    dominantPollutantUnit?: string;
    methodology: string;
    dataSource: string;
    dataSourceKind: DataSourceKind;
    observedAt: string;
    ruleCitation: string;
    deterministicRuleId: string;
    dataLimitations: string[];
  };
}

export type ActivityType =
  'WALKING' | 'CYCLING' | 'RUNNING' | 'OUTDOOR_SPORTS' | 'SCHOOL_COMMUTE' | 'OUTDOOR_RECREATION';

export type TimeWindowPreference = 'ANY' | 'MORNING' | 'MIDDAY' | 'EVENING';

export interface BestWindowRanking {
  id: string;
  startTime: string;
  endTime: string;
  startLocalTime: string;
  endLocalTime: string;
  timeLabel: string;
  averageAqi: number | null;
  minAqi: number | null;
  maxAqi: number | null;
  score: number;
  dominantPollutant: PollutantId | null;
  aqiCategory: string | null;
  categoryColor: string | null;
  rank: number;
  isBestWindow: boolean;
  comparisonReason: string;
  temperatureAvg?: number;
  precipitationMax?: number;
  windSpeedAvg?: number;
  readingsUsed: Array<{
    pollutant: CorePollutantId;
    avgValue: number;
    unit: string;
  }>;
  whyThisTime: {
    aqiScale: string;
    dataSource: string;
    forecastTimestamp: string;
    dominantFactor: string;
    weatherContext: string;
    scoringNote: string;
    comparisonDetail: string;
    limitations: string[];
  };
}

export interface BestWindowPlan {
  location: string;
  targetDate: string;
  timePreference: TimeWindowPreference;
  fetchedAt: string;
  activity: ActivityType;
  profileCategory: ProfileCategory;
  language: Language;
  rankedWindows: BestWindowRanking[];
  bestWindow: BestWindowRanking | null;
  worstWindow: BestWindowRanking | null;
  filteredSlots: HourlySlot[];
  ageAdaptedExplanation: {
    headline: string;
    recommendation: string;
    activitySpecificAdvice: string;
    cautionNote: string;
  };
  aiEnriched: boolean;
  disclaimer: string;
  dataSufficient: boolean;
}

export interface IndoorEnvironmentSetup {
  naturallyVentilated: 'YES' | 'NO' | 'PARTIAL' | null;
  windowsStatus: 'OPEN' | 'CLOSED' | 'TIME_DEPENDENT' | null;
  cookingNearby: 'YES' | 'NO' | 'OCCASIONALLY' | null;
  visibleDustOrSmoke: 'YES' | 'NO' | 'SOMETIMES' | null;
  airPurifierAvailable: 'YES' | 'NO' | null;
  roadFacingArea: 'YES' | 'NO' | null;
  updatedAt?: string;
}

export type IndoorSuggestionCategory =
  | 'VENTILATION'
  | 'DUST_MANAGEMENT'
  | 'COOKING_EXHAUST'
  | 'PURIFIER_USAGE'
  | 'ROAD_EXPOSURE'
  | 'SENSOR_AWARENESS'
  | 'GENERAL_PRACTICE';

export interface IndoorSuggestion {
  id: string;
  category: IndoorSuggestionCategory;
  title: string;
  advice: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  ageGuidance: string;
  whySuggestion: {
    outdoorConditionContext: string;
    indoorUserFactor: string;
    reasoning: string;
    outdoorSource: string;
    dataSourceKind: DataSourceKind | 'GENERAL_LITERATURE';
    whatWeCannotDetermine: string[];
  };
}

export interface IndoorAdvisorPlan {
  location: string;
  fetchedAt: string;
  profileCategory: ProfileCategory;
  language: Language;
  setup: IndoorEnvironmentSetup;
  hasSetup: boolean;
  outdoorAqi: number | null;
  outdoorCategory: string | null;
  dominantPollutant: PollutantId | null;
  infiltrationRiskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'UNKNOWN';
  suggestions: IndoorSuggestion[];
  familySummary: {
    headline: string;
    overview: string;
    keyAction: string;
  };
  aiEnriched: boolean;
  disclaimer: string;
}

export interface StructuredAiResponse {
  answer: string;
  summary: string;
  relevantPollutants: Array<{
    pollutant: string;
    value: string;
    interpretation: string;
  }>;
  supportingData: string[];
  practicalGuidance: string[];
  uncertainty: string;
  sources: string[];
  followUpQuestions: string[];
  engineMode: 'GEMINI_GROUNDED' | 'DETERMINISTIC_FALLBACK';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structured?: StructuredAiResponse;
  timestamp: string;
  profileCategory?: ProfileCategory;
  language?: Language;
}

export interface ComparedLocationSnapshot {
  location: GeoLocation;
  computedAqi: ComputedAqi;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  weather: AirSnapshot['weather'];
  trendDirection: AirSnapshot['trendSummary']['trendDirection'];
  freshness: AirSnapshot['freshness'];
  observedAt: string;
  localTime: string;
}

export interface LocationComparisonResult {
  comparedAt: string;
  locations: ComparedLocationSnapshot[];
  cleanestLocationName: string | null;
  highestAqiLocationName: string | null;
  timestampsCompatible: boolean;
  timestampWarning: string | null;
  summary: string;
}
