/**
 * @module indoorAdvisor
 * Non-sensor indoor air quality guidance engine for AirAware.
 *
 * All recommendations are derived exclusively from outdoor CAMS atmospheric model
 * data (~45 km grid) combined with the user's self-reported room configuration.
 * No physical indoor sensors are involved; every response includes a mandatory
 * disclaimer to this effect (see `getIndoorDisclaimer` in indoorCopy.ts).
 *
 * Guidance categories:
 * - VENTILATION     — window/door management based on outdoor AQI
 * - COOKING_EXHAUST — exhaust fan usage during and after cooking
 * - ROAD_EXPOSURE   — near-road particle management
 * - DUST_MANAGEMENT — wet-wipe vs. dry dusting recommendations
 * - PURIFIER_USAGE  — CADR-aware air purifier placement guidance
 * - SENSOR_AWARENESS— encouraging users to obtain local hardware sensors
 */
import {
  IndoorAdvisorPlan,
  IndoorEnvironmentSetup,
  IndoorSuggestion,
  Language,
  PollutantId,
  ProfileCategory,
} from '@/types';
import { getIndoorDisclaimer, INDOOR_BASE_UNKNOWNS, INDOOR_COPY } from './indoorCopy';

export const DEFAULT_INDOOR_SETUP: IndoorEnvironmentSetup = {
  naturallyVentilated: null,
  windowsStatus: null,
  cookingNearby: null,
  visibleDustOrSmoke: null,
  airPurifierAvailable: null,
  roadFacingArea: null,
};

function buildVentilationSuggestion(
  setup: IndoorEnvironmentSetup,
  outdoorAqi: number,
  outdoorContext: string,
  profileCategory: ProfileCategory,
  language: Language
): IndoorSuggestion {
  if (outdoorAqi > 110) {
    const title =
      language === 'en'
        ? setup.windowsStatus === 'OPEN'
          ? INDOOR_COPY.elevatedVentTitle.enOpen
          : INDOOR_COPY.elevatedVentTitle.enClosed
        : INDOOR_COPY.elevatedVentTitle[language];
    const advice =
      language === 'ta'
        ? `வெளிப்புற IN NAQI ${outdoorAqi} ஆக உள்ளதால் ஜன்னல்களை மூடி, மாசு குறைந்த நேரத்தில் குறுகிய காற்றோட்டம் செய்யவும்.`
        : language === 'hi'
          ? `बाहरी IN NAQI ${outdoorAqi} होने पर बाहरी कणों का प्रवेश कम करने हेतु खिड़कियां बंद रखें और कम प्रदूषण समय में संक्षिप्त क्रॉस-वेंटिलेशन करें।`
          : `With outdoor indicative IN NAQI at ${outdoorAqi}, closing exterior windows during peak hours helps reduce outdoor particle infiltration; flush rooms briefly during the cleaner forecast window.`;
    return {
      id: 'ind-ventilation-limit',
      category: 'VENTILATION',
      title,
      advice,
      priority: setup.windowsStatus === 'OPEN' ? 'HIGH' : 'MEDIUM',
      ageGuidance:
        profileCategory === 'CHILD' || profileCategory === 'SENIOR'
          ? 'Prioritize calm, low-draft indoor sleep and rest spaces.'
          : 'Balance outdoor particulate blocking with brief oxygenation breaks.',
      whySuggestion: {
        outdoorConditionContext: outdoorContext,
        indoorUserFactor: `Windows reported: ${setup.windowsStatus ?? 'Unspecified'}`,
        reasoning:
          'Outdoor fine particles infiltrate naturally ventilated rooms in proportion to open aperture area and outdoor concentration.',
        outdoorSource: 'Open-Meteo CAMS Atmospheric Model',
        dataSourceKind: 'MODEL_ESTIMATE',
        whatWeCannotDetermine: [...INDOOR_BASE_UNKNOWNS],
      },
    };
  }

  const advice =
    language === 'ta'
      ? `வெளிப்புற IN NAQI ${outdoorAqi} ஒப்பீட்டளவில் குறைவாக உள்ளதால், உள்ளக ஈரப்பதம் மற்றும் CO₂ குறைய ஜன்னல்களைத் திறக்கலாம்.`
      : language === 'hi'
        ? `बाहरी IN NAQI ${outdoorAqi} तुलनात्मक रूप से कम है, इसलिए ताजी हवा के आदान-प्रदान के लिए खिड़कियां खोलना उपयोगी हो सकता है।`
        : `Outdoor indicative IN NAQI (${outdoorAqi}) is comparatively favorable for exchanging stale indoor air and diluting indoor CO₂ and cooking moisture.`;
  return {
    id: 'ind-ventilation-flush',
    category: 'VENTILATION',
    title: INDOOR_COPY.lowerVentTitle[language],
    advice,
    priority: 'MEDIUM',
    ageGuidance: 'Keep study and living rooms gently aired while avoiding direct dusty drafts.',
    whySuggestion: {
      outdoorConditionContext: outdoorContext,
      indoorUserFactor: `Natural ventilation: ${setup.naturallyVentilated ?? 'Unspecified'}`,
      reasoning:
        'Opening opposite windows when outdoor air is cleaner prevents indoor CO₂ and humidity buildup.',
      outdoorSource: 'Open-Meteo CAMS Atmospheric Model',
      dataSourceKind: 'MODEL_ESTIMATE',
      whatWeCannotDetermine: [...INDOOR_BASE_UNKNOWNS],
    },
  };
}

/**
 * Evaluate non-sensor indoor ventilation, dust, cooking, and filtration suggestions
 * coupled to verified outdoor CAMS AQI conditions.
 *
 * @param params.setup - User-reported indoor environment configuration.
 * @param params.outdoorAqi - Current indicative outdoor NAQI value, or null if unavailable.
 * @param params.outdoorCategory - Current CPCB category label (e.g. `'Satisfactory'`), or null.
 * @param params.dominantPollutant - The pollutant driving the outdoor NAQI, or null.
 * @param params.profileCategory - User age/sensitivity category for tailored ageGuidance text.
 * @param params.language - Display language for all human-readable guidance strings.
 * @param params.locationName - Display name for the location (used in plan metadata).
 * @returns A fully populated IndoorAdvisorPlan with prioritised suggestions and disclaimer.
 */
export function evaluateIndoorGuidance(params: {
  setup: IndoorEnvironmentSetup;
  outdoorAqi: number | null;
  outdoorCategory: string | null;
  dominantPollutant: PollutantId | null;
  profileCategory?: ProfileCategory;
  language?: Language;
  locationName?: string;
}): IndoorAdvisorPlan {
  const {
    setup,
    outdoorAqi,
    outdoorCategory,
    dominantPollutant,
    profileCategory = 'ADULT',
    language = 'en',
    locationName = 'Current Location',
  } = params;

  const hasSetup = Object.entries(setup).some(
    ([k, v]) => k !== 'updatedAt' && v !== null && v !== undefined
  );
  const infiltrationRiskLevel: IndoorAdvisorPlan['infiltrationRiskLevel'] =
    outdoorAqi === null
      ? 'UNKNOWN'
      : outdoorAqi <= 100
        ? 'LOW'
        : outdoorAqi <= 200
          ? 'MODERATE'
          : 'ELEVATED';

  const outdoorContext =
    outdoorAqi !== null
      ? `Outdoor indicative IN NAQI is ${outdoorAqi} (${outdoorCategory ?? 'Available'}) with dominant ${dominantPollutant?.toUpperCase().replace('_', '.') ?? 'PM'}.`
      : 'Outdoor AQI data is currently unavailable.';

  const suggestions: IndoorSuggestion[] = [];
  if (outdoorAqi !== null) {
    suggestions.push(
      buildVentilationSuggestion(setup, outdoorAqi, outdoorContext, profileCategory, language)
    );
  }
  if (setup.cookingNearby === 'YES' || setup.cookingNearby === 'OCCASIONALLY') {
    suggestions.push({
      id: 'ind-cooking',
      category: 'COOKING_EXHAUST',
      title: INDOOR_COPY.cooking.title[language],
      advice: INDOOR_COPY.cooking.advice[language],
      priority: 'HIGH',
      ageGuidance:
        profileCategory === 'CHILD'
          ? 'Keep young children away from active frying zones.'
          : 'Continue running kitchen exhaust 10–15 minutes after cooking finishes.',
      whySuggestion: {
        outdoorConditionContext: outdoorContext,
        indoorUserFactor: `Cooking nearby: ${setup.cookingNearby}`,
        reasoning:
          'Indoor cooking can briefly raise kitchen particulate concentrations far above outdoor levels.',
        outdoorSource: 'WHO Indoor Air Quality Guidelines',
        dataSourceKind: 'GENERAL_LITERATURE',
        whatWeCannotDetermine: ['Hood exhaust CFM flow rate and stove fuel type.'],
      },
    });
  }
  if (setup.roadFacingArea === 'YES') {
    suggestions.push({
      id: 'ind-road',
      category: 'ROAD_EXPOSURE',
      title: INDOOR_COPY.road.title[language],
      advice: INDOOR_COPY.road.advice[language],
      priority: 'HIGH',
      ageGuidance: 'Prefer inner rooms for children’s play or senior rest during rush hours.',
      whySuggestion: {
        outdoorConditionContext: outdoorContext,
        indoorUserFactor: 'Road-facing location reported.',
        reasoning:
          'Near-road NO₂ and ultrafine exhaust particles drop sharply within tens of meters away from traffic.',
        outdoorSource: 'General Urban Exposure Literature',
        dataSourceKind: 'GENERAL_LITERATURE',
        whatWeCannotDetermine: ['Exact roadway setback distance and local traffic density.'],
      },
    });
  }
  if (setup.visibleDustOrSmoke === 'YES' || setup.visibleDustOrSmoke === 'SOMETIMES') {
    suggestions.push({
      id: 'ind-dust',
      category: 'DUST_MANAGEMENT',
      title: INDOOR_COPY.dust.title[language],
      advice: INDOOR_COPY.dust.advice[language],
      priority: 'MEDIUM',
      ageGuidance: 'Especially helpful in rooms where children play near floor level.',
      whySuggestion: {
        outdoorConditionContext: outdoorContext,
        indoorUserFactor: `Visible dust/smoke: ${setup.visibleDustOrSmoke}`,
        reasoning:
          'Wet wiping captures settled particles instead of lofting them back into indoor air.',
        outdoorSource: 'WHO Environmental Hygiene Guidance',
        dataSourceKind: 'GENERAL_LITERATURE',
        whatWeCannotDetermine: ['Dust composition and floor surface material.'],
      },
    });
  }
  if (setup.airPurifierAvailable === 'YES') {
    suggestions.push({
      id: 'ind-purifier',
      category: 'PURIFIER_USAGE',
      title: INDOOR_COPY.purifier.title[language],
      advice: INDOOR_COPY.purifier.advice[language],
      priority: 'MEDIUM',
      ageGuidance: 'Prioritize sleeping quarters where family spends 7–8 hours overnight.',
      whySuggestion: {
        outdoorConditionContext: outdoorContext,
        indoorUserFactor: 'Air purifier reported available.',
        reasoning:
          'Enclosed operation allows clean air delivery rate (CADR) to cycle room air repeatedly.',
        outdoorSource: 'General Filtration Principles',
        dataSourceKind: 'GENERAL_LITERATURE',
        whatWeCannotDetermine: ['Device CADR rating relative to room volume and filter condition.'],
      },
    });
  }

  suggestions.push({
    id: 'ind-sensor-education',
    category: 'SENSOR_AWARENESS',
    title: INDOOR_COPY.sensor.title[language],
    advice: INDOOR_COPY.sensor.advice[language],
    priority: 'LOW',
    ageGuidance:
      'Place indoor monitors away from open windows or direct stove steam for realistic readings.',
    whySuggestion: {
      outdoorConditionContext: outdoorContext,
      indoorUserFactor: 'No connected hardware indoor sensor.',
      reasoning:
        'Physical local monitors measure actual room concentrations rather than outdoor regional model grids.',
      outdoorSource: 'AirAware Transparency Standard',
      dataSourceKind: 'GENERAL_LITERATURE',
      whatWeCannotDetermine: [
        'Unmonitored indoor pollutant concentrations without dedicated sensor hardware.',
      ],
    },
  });

  const headline =
    language === 'ta'
      ? `${profileCategory} உள்ளக வழிகாட்டல் (${suggestions.length} குறிப்புகள்)`
      : language === 'hi'
        ? `${profileCategory} इनडोर रणनीति (${suggestions.length} सुझाव)`
        : `Indoor Environment Guidance for ${profileCategory} (${suggestions.length} Insights)`;

  return {
    location: locationName,
    fetchedAt: new Date().toISOString(),
    profileCategory,
    language,
    setup,
    hasSetup,
    outdoorAqi,
    outdoorCategory,
    dominantPollutant,
    infiltrationRiskLevel,
    suggestions,
    familySummary: {
      headline,
      overview:
        language === 'ta'
          ? `வெளிப்புற IN NAQI ${outdoorAqi ?? '--'} மற்றும் உங்கள் அறை தகவல்களை இணைத்து உருவாக்கப்பட்ட பொது வழிகாட்டல்.`
          : language === 'hi'
            ? `बाहरी IN NAQI ${outdoorAqi ?? '--'} और आपकी दी गई जानकारी के आधार पर सामान्य मार्गदर्शन।`
            : `Synthesized from outdoor model conditions (IN NAQI ${outdoorAqi ?? '--'}) and your reported space configuration.`,
      keyAction: suggestions[0]?.title ?? 'Monitor outdoor trends before ventilating.',
    },
    aiEnriched: false,
    disclaimer: getIndoorDisclaimer(language),
  };
}
