import {
  IndoorAdvisorPlan,
  IndoorEnvironmentSetup,
  IndoorSuggestion,
  Language,
  PollutantId,
  ProfileCategory,
} from '@/types';

export const DEFAULT_INDOOR_SETUP: IndoorEnvironmentSetup = {
  naturallyVentilated: null,
  windowsStatus: null,
  cookingNearby: null,
  visibleDustOrSmoke: null,
  airPurifierAvailable: null,
  roadFacingArea: null,
};

function getIndoorDisclaimer(language: Language): string {
  if (language === 'ta') {
    return 'இவை வெளிப்புறக் காற்றுத் தரவு மற்றும் உங்கள் பதில்களின் அடிப்படையிலான பொதுவான வழிகாட்டல்கள் மட்டுமே. இணக்கமான உள்ளக சென்சார் இல்லாமல் AirAware AI உள்ளக காற்றுத் தரத்தை அளவிடுவதில்லை.';
  }
  if (language === 'hi') {
    return 'ये उपलब्ध बाहरी वायु डेटा और आपके उत्तरों पर आधारित सामान्य इनडोर सुझाव हैं। संगत इनडोर सेंसर के बिना AirAware AI इनडोर वायु गुणवत्ता को नहीं मापता है।';
  }
  return 'These are general indoor-air educational suggestions based on outdoor model data and your answers. AirAware AI does not measure indoor air quality without a connected compatible indoor sensor.';
}

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

  const fetchedAt = new Date().toISOString();
  const hasSetup = Object.entries(setup).some(
    ([k, v]) => k !== 'updatedAt' && v !== null && v !== undefined
  );
  const disclaimer = getIndoorDisclaimer(language);

  let infiltrationRiskLevel: IndoorAdvisorPlan['infiltrationRiskLevel'] = 'UNKNOWN';
  if (outdoorAqi !== null) {
    if (outdoorAqi <= 100) infiltrationRiskLevel = 'LOW';
    else if (outdoorAqi <= 200) infiltrationRiskLevel = 'MODERATE';
    else infiltrationRiskLevel = 'ELEVATED';
  }

  const outdoorContext =
    outdoorAqi !== null
      ? `Outdoor indicative IN NAQI is ${outdoorAqi} (${outdoorCategory ?? 'Available'}) with dominant ${dominantPollutant?.toUpperCase().replace('_', '.') ?? 'PM'}.`
      : 'Outdoor AQI data is currently unavailable.';

  const baseUnknowns = [
    'Actual indoor PM₂.₅, CO₂, or VOC concentrations (no physical indoor sensor connected).',
    'Building airtightness, room volume, and air changes per hour (ACH).',
  ];

  const suggestions: IndoorSuggestion[] = [];

  // 1. Outdoor infiltration & ventilation
  if (outdoorAqi !== null && outdoorAqi > 110) {
    suggestions.push({
      id: 'ind-ventilation-limit',
      category: 'VENTILATION',
      title:
        language === 'ta'
          ? 'வெளிப்புற மாசு நேரத்தில் காற்றோட்டத்தைக் கட்டுப்படுத்தவும்'
          : language === 'hi'
            ? 'उच्च बाहरी प्रदूषण के समय वेंटिलेशन सीमित रखें'
            : setup.windowsStatus === 'OPEN'
              ? 'Limit Open Windows During Elevated Outdoor AQI'
              : 'Use Timed Cross-Ventilation During Cleaner Hours',
      advice:
        language === 'ta'
          ? `வெளிப்புற IN NAQI ${outdoorAqi} ஆக உள்ளதால் ஜன்னல்களை மூடி, மாசு குறைந்த நேரத்தில் குறுகிய காற்றோட்டம் செய்யவும்.`
          : language === 'hi'
            ? `बाहरी IN NAQI ${outdoorAqi} होने पर बाहरी कणों का प्रवेश कम करने हेतु खिड़कियां बंद रखें और कम प्रदूषण समय में संक्षिप्त क्रॉस-वेंटिलेशन करें।`
            : `With outdoor indicative IN NAQI at ${outdoorAqi}, closing exterior windows during peak hours helps reduce outdoor particle infiltration; flush rooms briefly during the cleaner forecast window.`,
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
        whatWeCannotDetermine: baseUnknowns,
      },
    });
  } else if (outdoorAqi !== null) {
    suggestions.push({
      id: 'ind-ventilation-flush',
      category: 'VENTILATION',
      title:
        language === 'ta'
          ? 'சாதகமான வெளிப்புறக் காற்றில் இயற்கை காற்றோட்டம்'
          : language === 'hi'
            ? 'अनुकूल बाहरी हवा में प्राकृतिक वेंटिलेशन'
            : 'Support Cross-Ventilation While Outdoor AQI Is Lower',
      advice:
        language === 'ta'
          ? `வெளிப்புற IN NAQI ${outdoorAqi} ஒப்பீட்டளவில் குறைவாக உள்ளதால், உள்ளக ஈரப்பதம் மற்றும் CO₂ குறைய ஜன்னல்களைத் திறக்கலாம்.`
          : language === 'hi'
            ? `बाहरी IN NAQI ${outdoorAqi} तुलनात्मक रूप से कम है, इसलिए ताजी हवा के आदान-प्रदान के लिए खिड़कियां खोलना उपयोगी हो सकता है।`
            : `Outdoor indicative IN NAQI (${outdoorAqi}) is comparatively favorable for exchanging stale indoor air and diluting indoor CO₂ and cooking moisture.`,
      priority: 'MEDIUM',
      ageGuidance: 'Keep study and living rooms gently aired while avoiding direct dusty drafts.',
      whySuggestion: {
        outdoorConditionContext: outdoorContext,
        indoorUserFactor: `Natural ventilation: ${setup.naturallyVentilated ?? 'Unspecified'}`,
        reasoning:
          'Opening opposite windows when outdoor air is cleaner prevents indoor CO₂ and humidity buildup.',
        outdoorSource: 'Open-Meteo CAMS Atmospheric Model',
        dataSourceKind: 'MODEL_ESTIMATE',
        whatWeCannotDetermine: baseUnknowns,
      },
    });
  }

  // 2. Cooking aerosols
  if (setup.cookingNearby === 'YES' || setup.cookingNearby === 'OCCASIONALLY') {
    suggestions.push({
      id: 'ind-cooking',
      category: 'COOKING_EXHAUST',
      title:
        language === 'ta'
          ? 'சமையல் புகை மற்றும் வெளியேற்றும் விசிறி'
          : language === 'hi'
            ? 'रसोई का धुआं और एग्जॉस्ट वेंटिलेशन'
            : 'Isolate & Vent Cooking Aerosols',
      advice:
        language === 'ta'
          ? 'சமையல் செய்யும் போது எக்ஸாஸ்ட் விசிறியை இயக்கி மற்ற அறைகளின் கதவுகளைச் சாத்தி வைக்கவும்.'
          : language === 'hi'
            ? 'खाना पकाते समय एग्जॉस्ट फैन या चिमनी चलाएं और लिविंग स्पेस को रसोई से अलग रखें।'
            : 'High-heat frying and gas burners generate localized PM₂.₅ and NO₂ spikes indoors; run exhaust hoods and keep bedroom doors closed while cooking.',
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

  // 3. Road-facing infiltration
  if (setup.roadFacingArea === 'YES') {
    suggestions.push({
      id: 'ind-road',
      category: 'ROAD_EXPOSURE',
      title:
        language === 'ta'
          ? 'சாலை நெரிசல் நேரப் பாதுகாப்பு'
          : language === 'hi'
            ? 'सड़क यातायात पीक-ऑवर सावधानी'
            : 'Buffer Road-Facing Rooms During Rush Hours',
      advice:
        language === 'ta'
          ? 'காலை மற்றும் மாலை போக்குவரத்து நேரங்களில் சாலைப் பக்க ஜன்னல்களை மூடி வைத்து, உள்பக்க ஜன்னல்கள் வழியே காற்றோட்டம் செய்யவும்.'
          : language === 'hi'
            ? 'सुबह और शाम के ट्रैफिक के समय सड़क वाली खिड़कियां बंद रखें और शांत आंगन की ओर से हवा लें।'
            : 'Keep road-facing windows closed during peak morning/evening traffic and prefer ventilating from quieter courtyard sides if available.',
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

  // 4. Dust settling
  if (setup.visibleDustOrSmoke === 'YES' || setup.visibleDustOrSmoke === 'SOMETIMES') {
    suggestions.push({
      id: 'ind-dust',
      category: 'DUST_MANAGEMENT',
      title:
        language === 'ta'
          ? 'உலர் பெருக்கலுக்குப் பதில் ஈரத்துணி துடைப்பு'
          : language === 'hi'
            ? 'सूखे झाड़ू के बजाय गीले पोंछे से सफाई'
            : 'Damp Wiping Over Dry Sweeping',
      advice:
        language === 'ta'
          ? 'உலர் துடைப்பம் தூசியை மீண்டும் காற்றில் கலக்கச் செய்யும்; ஈரமான துணி மற்றும் ஈரப் பாய்ச்சல் பயன்படுத்தவும்.'
          : language === 'hi'
            ? 'सूखे झाड़ू से बैठी हुई धूल फिर हवा में उड़ती है; नम कपड़े या गीले पोंछे का उपयोग करें।'
            : 'Dry brooming resuspends settled PM₁₀ dust into indoor breathing zones; use damp microfiber cloths and wet mopping.',
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

  // 5. Filtration / Air purifier
  if (setup.airPurifierAvailable === 'YES') {
    suggestions.push({
      id: 'ind-purifier',
      category: 'PURIFIER_USAGE',
      title:
        language === 'ta'
          ? 'காற்று சுத்திகரிப்பான் செயல்பாடு'
          : language === 'hi'
            ? 'एयर प्यूरीफायर की सही व्यवस्था'
            : 'Operate HEPA Filtration in Enclosed Occupied Rooms',
      advice:
        language === 'ta'
          ? 'சுத்திகரிப்பானை அதிக நேரம் தங்கும் அறையில் ஜன்னல்களை மூடி இயக்கவும்.'
          : language === 'hi'
            ? 'प्यूरीफायर को बंद खिड़कियों वाले मुख्य शयनकक्ष या बैठक में चलाएं और प्री-फिल्टर साफ रखें।'
            : 'Run the air purifier with windows and doors closed in bedrooms or primary living areas, keeping airflow grilles unobstructed.',
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

  // 6. Indoor Sensor Literacy (explicit requirement from Part 10)
  suggestions.push({
    id: 'ind-sensor-education',
    category: 'SENSOR_AWARENESS',
    title:
      language === 'ta'
        ? 'உள்ளக காற்று சென்சார்கள் எப்போது பயனுள்ளதாக இருக்கும்?'
        : language === 'hi'
          ? 'इनडोर एयर सेंसर कब उपयोगी होते हैं?'
          : 'When Dedicated Indoor Sensors Are Useful',
    advice:
      language === 'ta'
        ? 'வீட்டுக்குள்ளேயே சமையல் புகை, ஈரப்பதம் அல்லது காற்றோட்டக் குறைவு அதிகமாக உள்ளதா என்பதை அறிய லேசர் PM₂.₅ மற்றும் NDIR CO₂ சென்சார்கள் உதவும்; வெளிப்புற மாதிரிகள் வீட்டுக்குள் உள்ள அளவை நேரடியாகக் கணக்கிடாது.'
        : language === 'hi'
          ? 'खाना पकाने के धुएं, बंद कमरों में CO₂ जमाव या प्यूरीफायर के असर की वास्तविक जांच के लिए इनडोर PM₂.₅ और CO₂ सेंसर उपयोगी होते हैं।'
          : 'Outdoor CAMS estimates cannot detect indoor cooking spikes, incense smoke, or closed-room CO₂ accumulation. A dedicated optical PM₂.₅ + NDIR CO₂ monitor is useful when assessing ventilation adequacy or purifier effectiveness.',
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
    fetchedAt,
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
    disclaimer,
  };
}
