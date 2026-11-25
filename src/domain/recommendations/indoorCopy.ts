import { Language } from '@/types';

const DISCLAIMERS: Record<Language, string> = {
  ta: 'இவை வெளிப்புறக் காற்றுத் தரவு மற்றும் உங்கள் பதில்களின் அடிப்படையிலான பொதுவான வழிகாட்டல்கள் மட்டுமே. இணக்கமான உள்ளக சென்சார் இல்லாமல் AirAware AI உள்ளக காற்றுத் தரத்தை அளவிடுவதில்லை.',
  hi: 'ये उपलब्ध बाहरी वायु डेटा और आपके उत्तरों पर आधारित सामान्य इनडोर सुझाव हैं। संगत इनडोर सेंसर के बिना AirAware AI इनडोर वायु गुणवत्ता को नहीं मापता है।',
  en: 'These are general indoor-air educational suggestions based on outdoor model data and your answers. AirAware AI does not measure indoor air quality without a connected compatible indoor sensor.',
};

/** Return localized non-sensor indoor disclaimer copy. */
export function getIndoorDisclaimer(language: Language): string {
  return DISCLAIMERS[language];
}

export const INDOOR_BASE_UNKNOWNS: readonly string[] = [
  'Actual indoor PM₂.₅, CO₂, or VOC concentrations (no physical indoor sensor connected).',
  'Building airtightness, room volume, and air changes per hour (ACH).',
];

export const INDOOR_COPY = {
  elevatedVentTitle: {
    ta: 'வெளிப்புற மாசு நேரத்தில் காற்றோட்டத்தைக் கட்டுப்படுத்தவும்',
    hi: 'उच्च बाहरी प्रदूषण के समय वेंटिलेशन सीमित रखें',
    enOpen: 'Limit Open Windows During Elevated Outdoor AQI',
    enClosed: 'Use Timed Cross-Ventilation During Cleaner Hours',
  },
  lowerVentTitle: {
    ta: 'சாதகமான வெளிப்புறக் காற்றில் இயற்கை காற்றோட்டம்',
    hi: 'अनुकूल बाहरी हवा में प्राकृतिक वेंटिलेशन',
    en: 'Support Cross-Ventilation While Outdoor AQI Is Lower',
  },
  cooking: {
    title: {
      ta: 'சமையல் புகை மற்றும் வெளியேற்றும் விசிறி',
      hi: 'रसोई का धुआं और एग्जॉस्ट वेंटिलेशन',
      en: 'Isolate & Vent Cooking Aerosols',
    },
    advice: {
      ta: 'சமையல் செய்யும் போது எக்ஸாஸ்ட் விசிறியை இயக்கி மற்ற அறைகளின் கதவுகளைச் சாத்தி வைக்கவும்.',
      hi: 'खाना पकाते समय एग्जॉस्ट फैन या चिमनी चलाएं और लिविंग स्पेस को रसोई से अलग रखें।',
      en: 'High-heat frying and gas burners generate localized PM₂.₅ and NO₂ spikes indoors; run exhaust hoods and keep bedroom doors closed while cooking.',
    },
  },
  road: {
    title: {
      ta: 'சாலை நெரிசல் நேரப் பாதுகாப்பு',
      hi: 'सड़क यातायात पीक-ऑवर सावधानी',
      en: 'Buffer Road-Facing Rooms During Rush Hours',
    },
    advice: {
      ta: 'காலை மற்றும் மாலை போக்குவரத்து நேரங்களில் சாலைப் பக்க ஜன்னல்களை மூடி வைத்து, உள்பக்க ஜன்னல்கள் வழியே காற்றோட்டம் செய்யவும்.',
      hi: 'सुबह और शाम के ट्रैफिक के समय सड़क वाली खिड़कियां बंद रखें और शांत आंगन की ओर से हवा लें।',
      en: 'Keep road-facing windows closed during peak morning/evening traffic and prefer ventilating from quieter courtyard sides if available.',
    },
  },
  dust: {
    title: {
      ta: 'உலர் பெருக்கலுக்குப் பதில் ஈரத்துணி துடைப்பு',
      hi: 'सूखे झाड़ू के बजाय गीले पोंछे से सफाई',
      en: 'Damp Wiping Over Dry Sweeping',
    },
    advice: {
      ta: 'உலர் துடைப்பம் தூசியை மீண்டும் காற்றில் கலக்கச் செய்யும்; ஈரமான துணி மற்றும் ஈரப் பாய்ச்சல் பயன்படுத்தவும்.',
      hi: 'सूखे झाड़ू से बैठी हुई धूल फिर हवा में उड़ती है; नम कपड़े या गीले पोंछे का उपयोग करें।',
      en: 'Dry brooming resuspends settled PM₁₀ dust into indoor breathing zones; use damp microfiber cloths and wet mopping.',
    },
  },
  purifier: {
    title: {
      ta: 'காற்று சுத்திகரிப்பான் செயல்பாடு',
      hi: 'एयर प्यूरीफायर की सही व्यवस्था',
      en: 'Operate HEPA Filtration in Enclosed Occupied Rooms',
    },
    advice: {
      ta: 'சுத்திகரிப்பானை அதிக நேரம் தங்கும் அறையில் ஜன்னல்களை மூடி இயக்கவும்.',
      hi: 'प्यूरीफायर को बंद खिड़कियों वाले मुख्य शयनकक्ष या बैठक में चलाएं और प्री-फिल्टर साफ रखें।',
      en: 'Run the air purifier with windows and doors closed in bedrooms or primary living areas, keeping airflow grilles unobstructed.',
    },
  },
  sensor: {
    title: {
      ta: 'உள்ளக காற்று சென்சார்கள் எப்போது பயனுள்ளதாக இருக்கும்?',
      hi: 'इनडोर एयर सेंसर कब उपयोगी होते हैं?',
      en: 'When Dedicated Indoor Sensors Are Useful',
    },
    advice: {
      ta: 'வீட்டுக்குள்ளேயே சமையல் புகை, ஈரப்பதம் அல்லது காற்றோட்டக் குறைவு அதிகமாக உள்ளதா என்பதை அறிய லேசர் PM₂.₅ மற்றும் NDIR CO₂ சென்சார்கள் உதவும்; வெளிப்புற மாதிரிகள் வீட்டுக்குள் உள்ள அளவை நேரடியாகக் கணக்கிடாது.',
      hi: 'खाना पकाने के धुएं, बंद कमरों में CO₂ जमाव या प्यूरीफायर के असर की वास्तविक जांच के लिए इनडोर PM₂.₅ और CO₂ सेंसर उपयोगी होते हैं।',
      en: 'Outdoor CAMS estimates cannot detect indoor cooking spikes, incense smoke, or closed-room CO₂ accumulation. A dedicated optical PM₂.₅ + NDIR CO₂ monitor is useful when assessing ventilation adequacy or purifier effectiveness.',
    },
  },
} as const;
