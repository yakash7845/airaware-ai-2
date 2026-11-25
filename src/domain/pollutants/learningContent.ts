import { Language } from '@/types';

export interface LearningTopic {
  id: string;
  title: Record<Language, string>;
  summary: Record<Language, string>;
  keyPoints: Record<Language, string[]>;
  reference: string;
}

export const LEARNING_TOPICS: readonly LearningTopic[] = [
  {
    id: 'what-is-aqi',
    title: {
      en: '1. What is an Air Quality Index (AQI)?',
      ta: '1. காற்றுத் தரக் குறியீடு (AQI) என்றால் என்ன?',
      hi: '1. वायु गुणवत्ता सूचकांक (AQI) क्या है?',
    },
    summary: {
      en: 'An AQI translates complex pollutant concentrations (µg/m³ or mg/m³) into a unified 0–500 scale ("One Number — One Colour — One Description") so citizens can compare relative air burden quickly.',
      ta: 'AQI என்பது பல்வேறு மாசு அளவுகளை (µg/m³ அல்லது mg/m³) 0–500 என்ற ஒரே எண் மற்றும் நிற அளவுகோலாக மாற்றி மக்களுக்குப் புரியும் வகையில் வழங்குகிறது.',
      hi: 'AQI विभिन्न प्रदूषक सांद्रताओं (µg/m³ या mg/m³) को 0–500 के एक सरल पैमाने ("एक संख्या — एक रंग — एक विवरण") में बदलता है।',
    },
    keyPoints: {
      en: [
        'India uses CPCB National AQI (6 tiers: Good, Satisfactory, Moderately Polluted, Poor, Very Poor, Severe).',
        'Different countries (US EPA, European EAQI) use different breakpoint thresholds, so numbers differ across scales.',
      ],
      ta: [
        'இந்தியா CPCB NAQI (6 நிலைகள்: Good முதல் Severe வரை) அளவுகோலைப் பயன்படுத்துகிறது.',
        'அமெரிக்க EPA மற்றும் ஐரோப்பிய EAQI வெவ்வேறு வரம்புகளைப் பயன்படுத்துவதால் எண்கள் மாறுபடும்.',
      ],
      hi: [
        'भारत CPCB राष्ट्रीय AQI (6 श्रेणियां: Good से Severe) का उपयोग करता है।',
        'US EPA और यूरोपीय EAQI के मानदंड अलग हैं, इसलिए समान हवा के लिए भी अलग अंक दिख सकते हैं।',
      ],
    },
    reference: 'CPCB National Air Quality Index Booklet (2014)',
  },
  {
    id: 'what-is-pm25',
    title: {
      en: '2. What is PM₂.₅ (Fine Particulate Matter)?',
      ta: '2. PM₂.₅ (நுண்ணிய துகள்கள்) என்றால் என்ன?',
      hi: '2. PM₂.₅ (सूक्ष्म कण) क्या है?',
    },
    summary: {
      en: 'Solid particles and liquid droplets ≤2.5 micrometers in diameter—about 1/30th the width of a human hair—that remain aloft for days and travel deep into the respiratory tract.',
      ta: '2.5 மைக்ரோமீட்டருக்கும் குறைவான நுண்ணிய துகள்கள்; மனித முடியின் விட்டத்தில் 30-ல் ஒரு பங்கு அளவுடையவை.',
      hi: '2.5 माइक्रोमीटर से छोटे ठोस व तरल कण—मानव बाल से लगभग 30 गुना पतले—जो लंबे समय तक हवा में रहते हैं।',
    },
    keyPoints: {
      en: [
        'Commonly originates from vehicle combustion, biomass burning, industrial boilers, and secondary atmospheric nitrates/sulphates.',
        'CPCB 24-hour standard: 60 µg/m³; WHO 2021 24-hour guideline: 15 µg/m³.',
      ],
      ta: [
        'வாகனப் புகை, எரிப்பு மற்றும் வளிமண்டல வேதிவினைகளால் உருவாகிறது.',
        'CPCB 24-மணி நேர வரம்பு: 60 µg/m³; WHO 2021 வழிகாட்டி: 15 µg/m³.',
      ],
      hi: [
        'वाहनों का धुआं, बायोमास दहन और द्वितीयक रासायनिक कण इसके प्रमुख स्रोत हैं।',
        'CPCB 24-घंटे मानक: 60 µg/m³; WHO 2021 दिशानिर्देश: 15 µg/m³।',
      ],
    },
    reference: 'WHO Global Air Quality Guidelines (2021) & CPCB NAAQS',
  },
  {
    id: 'what-is-pm10',
    title: {
      en: '3. What is PM₁₀ (Coarse Particulate Matter)?',
      ta: '3. PM₁₀ (பெரிய துகள்கள்) என்றால் என்ன?',
      hi: '3. PM₁₀ (मोटे कण) क्या है?',
    },
    summary: {
      en: 'Inhalable airborne particles ≤10 micrometers in diameter, including coarse dust, pollen fragments, and road abrasion particles.',
      ta: '10 மைக்ரோமீட்டர் வரையிலான தூசி, சாலை துகள்கள் மற்றும் மகரந்தத் துகள்கள் இதில் அடங்கும்.',
      hi: '10 माइक्रोमीटर तक के श्वसन योग्य कण, जिनमें सड़क की धूल, निर्माण कण और पराग शामिल हैं।',
    },
    keyPoints: {
      en: [
        'Notice that PM₁₀ includes the PM₂.₅ fraction plus coarse particles between 2.5 and 10 µm.',
        'Dry windy afternoons and unpaved road traffic frequently raise PM₁₀ rapidly.',
      ],
      ta: [
        'PM₁₀ என்பது PM₂.₅ மற்றும் 2.5–10 µm துகள்கள் இரண்டையும் உள்ளடக்கியது.',
        'வறண்ட காற்றும் சாலைத் தூசும் PM₁₀ அளவை விரைவில் உயர்த்தும்.',
      ],
      hi: [
        'PM₁₀ में PM₂.₅ के साथ 2.5 से 10 µm के मोटे कण भी शामिल होते हैं।',
        'शुष्क तेज़ हवा और निर्माण कार्य PM₁₀ को तेजी से बढ़ा सकते हैं।',
      ],
    },
    reference: 'CPCB Ambient Air Quality Standards',
  },
  {
    id: 'what-is-nox',
    title: {
      en: '4. What are Nitrogen Oxides (NOₓ / NO₂)?',
      ta: '4. நைட்ரஜன் ஆக்சைடுகள் (NOₓ / NO₂) என்றால் என்ன?',
      hi: '4. नाइट्रोजन ऑक्साइड (NOₓ / NO₂) क्या हैं?',
    },
    summary: {
      en: 'Reactive gases produced when fuel burns at high temperatures in engines and power plants. NO₂ shows strong rush-hour spikes along arterial roadways.',
      ta: 'என்ஜின்கள் மற்றும் மின் நிலையங்களில் எரிபொருள் எரியும்போது உருவாகும் வாயுக்கள். சாலை நெரிசல் நேரங்களில் NO₂ அதிகரிக்கும்.',
      hi: 'इंजनों और बिजली संयंत्रों में उच्च तापमान दहन से बनने वाली गैसें। व्यस्त सड़कों के पास NO₂ तेजी से बढ़ता है।',
    },
    keyPoints: {
      en: [
        'Serves as a key precursor for daytime ground-level ozone formation.',
        'Coarse 45 km satellite/model grids smooth out narrow roadside NO₂ hotspots.',
      ],
      ta: [
        'பகலில் தரைமட்ட ஓசோன் உருவாவதற்கு முக்கிய காரணமாகிறது.',
        '45 கி.மீ மாதிரிகள் குறுகிய சாலை நெரிசல் அளவுகளை முழுமையாகக் காட்டாது.',
      ],
      hi: [
        'दिन के समय जमीनी ओज़ोन बनने में मुख्य भूमिका निभाता है।',
        '45 किमी क्षेत्रीय मॉडल सड़क के ठीक किनारे के NO₂ स्पाइक को कम आंक सकते हैं।',
      ],
    },
    reference: 'WHO AQG 2021 & Copernicus CAMS Documentation',
  },
  {
    id: 'what-is-ozone',
    title: {
      en: '5. What is Ground-Level Ozone (O₃)?',
      ta: '5. தரைமட்ட ஓசோன் (O₃) என்றால் என்ன?',
      hi: '5. जमीनी स्तर का ओज़ोन (O₃) क्या है?',
    },
    summary: {
      en: 'Unlike stratospheric ozone that shields UV rays, ground-level ozone forms photochemically when sunlight reacts with NOₓ and VOCs—often peaking in sunny afternoons.',
      ta: 'மேல் வளிமண்டல ஓசோனைப் போலன்றி, தரைமட்ட ஓசோன் சூரிய ஒளியில் NOₓ மற்றும் VOC வாயுக்கள் வினைபுரிவதால் பிற்பகலில் உயரும்.',
      hi: 'ऊपरी ओज़ोन के विपरीत, सतही ओज़ोन धूप में NOₓ और VOC गैसों की प्रतिक्रिया से बनता है और दोपहर में चरम पर रहता है।',
    },
    keyPoints: {
      en: [
        'Evaluated over an 8-hour averaging period in CPCB NAQI (Satisfactory ≤100 µg/m³).',
        'Outdoor endurance exercise is often shifted to early morning when afternoon O₃ rises.',
      ],
      ta: [
        'CPCB முறையில் 8-மணி நேர சராசரியாகக் கணக்கிடப்படுகிறது.',
        'பிற்பகலில் ஓசோன் உயரும்போது அதிகாலை உடற்பயிற்சி விரும்பப்படுகிறது.',
      ],
      hi: [
        'CPCB मानक में इसे 8-घंटे के औसत पर मापा जाता है।',
        'दोपहर में ओज़ोन बढ़ने पर सुबह के समय आउटडोर व्यायाम अधिक अनुकूल होता है।',
      ],
    },
    reference: 'CPCB NAQI 2014 & US/WHO Photochemical Literature',
  },
  {
    id: 'weather-pollution',
    title: {
      en: '6. How Does Weather Affect Air Pollution?',
      ta: '6. வானிலை காற்று மாசை எவ்வாறு பாதிக்கிறது?',
      hi: '6. मौसम वायु प्रदूषण को कैसे प्रभावित करता है?',
    },
    summary: {
      en: 'Wind speed, atmospheric inversions, humidity, sunlight, and rainfall strongly control whether emissions disperse or accumulate near ground level.',
      ta: 'காற்றின் வேகம், வெப்பநிலை தலைகீழ் மாற்றம், ஈரப்பதம் மற்றும் மழை ஆகியவை மாசு பரவலைத் தீர்மானிக்கின்றன.',
      hi: 'हवा की गति, तापमान व्युत्क्रमण, आर्द्रता, धूप और वर्षा तय करते हैं कि प्रदूषक फैलेंगे या सतह के पास जमा रहेंगे।',
    },
    keyPoints: {
      en: [
        'Calm winds (<8 km/h) and cool nighttime temperature inversions trap PM₂.₅ near breathing height.',
        'Rain helps wash out coarse PM₁₀ particles, while bright sunlight accelerates O₃ production.',
      ],
      ta: [
        'மெதுவான காற்று மற்றும் இரவு குளிர்ச்சி துகள்களைத் தரையருகே தேக்கி வைக்கும்.',
        'மழை பெரிய துகள்களைக் குறைக்கும்; கடுமையான வெயில் ஓசோனை அதிகரிக்கும்.',
      ],
      hi: [
        'धीमी हवा और रात की ठंडक कणों को जमीनी स्तर पर रोक सकती है।',
        'बारिश धूल (PM₁₀) को कम करती है, जबकि तेज धूप ओज़ोन बढ़ाती है।',
      ],
    },
    reference: 'Open-Meteo Meteorological & CAMS Modeling Guide',
  },
  {
    id: 'interpreting-forecasts',
    title: {
      en: '7. How Should Environmental Forecasts Be Interpreted?',
      ta: '7. முன்னறிவிப்புகளை எவ்வாறு பொறுப்புடன் புரிந்துகொள்வது?',
      hi: '7. पर्यावरणीय पूर्वानुमान को जिम्मेदारी से कैसे समझें?',
    },
    summary: {
      en: 'Atmospheric forecasts estimate regional dispersion trends rather than certifying a street or hour as risk-free. Use them comparatively to spot cleaner windows and worsening trends.',
      ta: 'முன்னறிவிப்புகள் போக்குகளை ஒப்பிட்டுப் பார்க்க உதவும் மதிப்பீடுகள் மட்டுமே; எந்த நேரமும் முற்றிலும் பாதுகாப்பானது என உறுதியளிக்காது.',
      hi: 'पूर्वानुमान तुलनात्मक रुझान दिखाते हैं, किसी समय के पूर्णतः सुरक्षित होने की गारंटी नहीं देते।',
    },
    keyPoints: {
      en: [
        'Compare relative differences (e.g., morning vs late afternoon) rather than treating a single forecasted integer as exact truth.',
        'Sudden local fires, roadwork, or rain showers may diverge from regional forecasts.',
      ],
      ta: [
        'தனி எண்ணை விட நேர இடைவெளிகளின் ஒப்பீட்டைப் பார்க்கவும்.',
        'உள்ளூர் தீ, கட்டுமானம் அல்லது திடீர் மழை முன்னறிவிப்பிலிருந்து மாறுபடலாம்.',
      ],
      hi: [
        'एक संख्या के बजाय विभिन्न समय खंडों की तुलना पर ध्यान दें।',
        'स्थानीय धुआं, निर्माण या अचानक बारिश क्षेत्रीय पूर्वानुमान से भिन्न हो सकती है।',
      ],
    },
    reference: 'AirAware AI Responsible Forecasting Framework',
  },
  {
    id: 'monitoring-vs-modelling',
    title: {
      en: '8. Monitoring Stations vs. Atmospheric Modelling',
      ta: '8. தரை கண்காணிப்பு நிலையங்கள் vs வளிமண்டல மாதிரிகள்',
      hi: '8. ग्राउंड मॉनिटरिंग स्टेशन बनाम वायुमंडलीय मॉडल',
    },
    summary: {
      en: 'Ground stations (like CPCB CAAQMS) sample physical air at a single fixed mast. Atmospheric models (like Copernicus CAMS) assimilate satellites, emissions inventories, and meteorology onto a spatial grid.',
      ta: 'தரை நிலையங்கள் குறிப்பிட்ட இடத்தின் காற்றை நேரடியாக அளவிடுகின்றன; CAMS போன்ற மாதிரிகள் செயற்கைக்கோள் மற்றும் வானிலை மூலம் பிராந்திய மதிப்பீட்டைக் கணிக்கின்றன.',
      hi: 'ग्राउंड स्टेशन किसी एक बिंदु की वास्तविक हवा मापते हैं, जबकि CAMS जैसे मॉडल उपग्रह व मौसम डेटा से क्षेत्रीय ग्रिड का अनुमान लगाते हैं।',
    },
    keyPoints: {
      en: [
        'Open-Meteo CAMS Global runs at ~0.4° (~45 km) resolution; CAMS Europe runs at ~0.1° (~11 km).',
        'AirAware AI never labels CAMS model estimates as ground-station observations.',
      ],
      ta: [
        'CAMS Global சுமார் ~45 கி.மீ தெளிவுத்திறனில் இயங்குகிறது.',
        'மாதிரி மதிப்பீடுகளை ஒருபோதும் நேரடி தரை சென்சார் அளவீடுகளாகக் காட்டுவதில்லை.',
      ],
      hi: [
        'CAMS Global लगभग ~45 किमी रिज़ॉल्यूशन पर कार्य करता है।',
        'AirAware AI कभी भी मॉडल अनुमान को भौतिक ग्राउंड स्टेशन रीडिंग नहीं बताता।',
      ],
    },
    reference: 'Copernicus Atmosphere Monitoring Service (ECMWF)',
  },
  {
    id: 'how-cpcb-calculates',
    title: {
      en: '9. How Does CPCB Calculate National AQI?',
      ta: '9. CPCB எவ்வாறு தேசிய காற்று குறியீட்டை (NAQI) கணக்கிடுகிறது?',
      hi: '9. CPCB राष्ट्रीय वायु गुणवत्ता सूचकांक की गणना कैसे करता है?',
    },
    summary: {
      en: 'CPCB converts each available pollutant concentration (24h average for PM₂.₅/PM₁₀/NO₂/SO₂; 8h average for CO/O₃) into a sub-index using piecewise linear interpolation, then takes the maximum sub-index.',
      ta: 'ஒவ்வொரு மாசின் 24h அல்லது 8h சராசரி மதிப்பும் நேர்கோட்டு இடைச்செருகல் மூலம் துணை-குறியீடாக மாற்றப்பட்டு, அதில் அதிகபட்ச மதிப்பே மொத்த AQI ஆகிறது.',
      hi: 'प्रत्येक प्रदूषक के 24h/8h औसत को रैखिक अंतर्वेशन से सब-इंडेक्स में बदला जाता है, और सबसे बड़ा सब-इंडेक्स अंतिम AQI होता है।',
    },
    keyPoints: {
      en: [
        'Minimum data rule: at least 3 pollutants must be valid, and at least one must be PM₂.₅ or PM₁₀.',
        'Missing pollutants are never silently replaced with zero.',
      ],
      ta: [
        'குறைந்தது 3 மாசு அளவுகள் இருக்க வேண்டும்; அவற்றில் ஒன்று PM₂.₅ அல்லது PM₁₀ ஆக இருக்க வேண்டும்.',
        'இல்லாத அளவுகள் ஒருபோதும் பூஜ்ஜியமாகக் கருதப்படுவதில்லை.',
      ],
      hi: [
        'न्यूनतम डेटा नियम: कम से कम 3 प्रदूषक मान्य होने चाहिए जिनमें PM₂.₅ या PM₁₀ अनिवार्य है।',
        'अनुपलब्ध प्रदूषकों को कभी शून्य नहीं माना जाता।',
      ],
    },
    reference: 'CPCB NAQI Technical Report (Oct 2014)',
  },
];

export const GLOSSARY_ITEMS: ReadonlyArray<{ term: string; definition: string }> = [
  {
    term: 'CAMS',
    definition:
      'Copernicus Atmosphere Monitoring Service operated by ECMWF under the EU Copernicus programme.',
  },
  {
    term: 'CPCB NAQI',
    definition:
      'India’s Central Pollution Control Board 0–500 National Air Quality Index (6 categories).',
  },
  {
    term: 'Dominant Pollutant',
    definition:
      'The pollutant producing the highest individual CPCB sub-index, which sets the overall AQI.',
  },
  {
    term: 'Sub-Index (Ip)',
    definition:
      'Normalized 0–500 score calculated via linear interpolation for a single pollutant.',
  },
  {
    term: 'Boundary Layer',
    definition:
      'Lowest layer of the atmosphere whose height expands on sunny afternoons and shrinks on calm nights.',
  },
  {
    term: 'AOD',
    definition:
      'Aerosol Optical Depth — column measurement of how much sunlight aerosols scatter or absorb.',
  },
];

export const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Why does AirAware AI 2.0 sometimes differ from another weather app?',
    a: 'Many apps display US EPA AQI or European EAQI without clearly labeling the scale. AirAware AI 2.0 computes India CPCB NAQI explicitly and shows sub-indices and averaging assumptions transparently.',
  },
  {
    q: 'Can AirAware AI 2.0 tell me the air quality inside my kitchen or bedroom?',
    a: 'No. Without a compatible indoor physical hardware monitor connected locally, indoor concentrations cannot be measured. The Indoor Advisor provides educational hygiene and ventilation guidance only.',
  },
  {
    q: 'Does the AI assistant calculate AQI numbers?',
    a: 'No. Deterministic TypeScript domain modules calculate all CPCB sub-indices, rankings, and events first. Gemini only explains server-verified context and falls back to deterministic answers if unavailable.',
  },
];
