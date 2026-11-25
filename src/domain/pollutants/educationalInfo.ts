import { CorePollutantId, Language } from '@/types';

export interface PollutantEducationProfile {
  id: CorePollutantId;
  formula: string;
  cpcbLimitLabel: string;
  whoGuidelineLabel: string;
  names: Record<Language, string>;
  plainSummary: Record<Language, string>;
  commonUrbanSources: Record<Language, string[]>;
}

export const POLLUTANT_EDUCATION: Record<CorePollutantId, PollutantEducationProfile> = {
  pm2_5: {
    id: 'pm2_5',
    formula: 'PM₂.₅',
    cpcbLimitLabel: '60 µg/m³ (24h CPCB NAAQS)',
    whoGuidelineLabel: '15 µg/m³ (24h WHO 2021)',
    names: {
      en: 'Fine Particulate Matter (PM2.5)',
      ta: 'நுண்ணிய துகள்கள் (PM2.5)',
      hi: 'सूक्ष्म कण (PM2.5)',
    },
    plainSummary: {
      en: 'Airborne particles ≤2.5 micrometers wide—roughly 30 times thinner than a human hair—that remain suspended for hours and reach deep airways.',
      ta: '2.5 மைக்ரோமீட்டருக்கும் குறைவான மிக நுண்ணிய துகள்கள்; மனித முடியை விட சுமார் 30 மடங்கு மெல்லியவை மற்றும் சுவாசப்பாதையின் ஆழம் வரை செல்லக்கூடியவை.',
      hi: '2.5 माइक्रोमीटर से छोटे कण—मानव बाल से लगभग 30 गुना पतले—जो हवा में लंबे समय तक तैरते रहते हैं और गहरे श्वसन तंत्र तक पहुँच सकते हैं।',
    },
    commonUrbanSources: {
      en: [
        'Vehicle tailpipe exhaust',
        'Biomass and waste burning',
        'Secondary atmospheric reactions',
        'Industrial & power generation',
      ],
      ta: ['வாகனப் புகை', 'கழிவு மற்றும் உயிரி எரிப்பு', 'வளிமண்டல வேதிவினைகள்', 'தொழிற்சாலை புகை'],
      hi: ['वाहनों का धुआं', 'कचरा और बायोमास जलाना', 'द्वितीयक वायुमंडलीय कण', 'औद्योगिक उत्सर्जन'],
    },
  },
  pm10: {
    id: 'pm10',
    formula: 'PM₁₀',
    cpcbLimitLabel: '100 µg/m³ (24h CPCB NAAQS)',
    whoGuidelineLabel: '45 µg/m³ (24h WHO 2021)',
    names: {
      en: 'Coarse Particulate Matter (PM10)',
      ta: 'பெரிய துகள்கள் (PM10)',
      hi: 'मोटे कण (PM10)',
    },
    plainSummary: {
      en: 'Inhalable particles ≤10 micrometers in diameter, often dominated by resuspended road dust, construction activity, and sea salt or pollen.',
      ta: '10 மைக்ரோமீட்டர் வரை உள்ள துகள்கள்; சாலைத் தூசி, கட்டுமானப் பணிகள் மற்றும் காற்றால் அடித்து வரப்படும் மண் துகள்களால் உருவாகின்றன.',
      hi: '10 माइक्रोमीटर तक के श्वसन योग्य कण, जो मुख्य रूप से सड़क की धूल, निर्माण कार्य और प्राकृतिक धूलकणों से आते हैं।',
    },
    commonUrbanSources: {
      en: [
        'Resuspended road dust',
        'Construction and demolition',
        'Windblown soil dust',
        'Brake & tire wear',
      ],
      ta: ['சாலைத் தூசு', 'கட்டுமானப் பணிகள்', 'காற்று மண் தூசு', 'வாகன சக்கரத் தேய்மானம்'],
      hi: ['सड़क की धूल', 'निर्माण एवं तोड़फोड़', 'तेज़ हवा से उड़ती मिट्टी', 'टायर और ब्रेक घिसाव'],
    },
  },
  no2: {
    id: 'no2',
    formula: 'NO₂',
    cpcbLimitLabel: '80 µg/m³ (24h CPCB NAAQS)',
    whoGuidelineLabel: '25 µg/m³ (24h WHO 2021)',
    names: {
      en: 'Nitrogen Dioxide (NO₂)',
      ta: 'நைட்ரஜன் டை ஆக்சைடு (NO₂)',
      hi: 'नाइट्रोजन डाइऑक्साइड (NO₂)',
    },
    plainSummary: {
      en: 'A reactive traffic-linked gas formed during high-temperature fuel combustion that peaks near busy roads and feeds ground-level ozone formation.',
      ta: 'எரிபொருள் எரிப்பால் உருவாகும் வாயு; போக்குவரத்து மிகுந்த சாலைகளின் அருகே அதிகமாகக் காணப்பட்டு ஓசோன் உருவாக்கத்திற்கும் காரணமாகிறது.',
      hi: 'ईंधन दहन से बनने वाली एक प्रतिक्रियाशील गैस, जो व्यस्त सड़कों के पास अधिक होती है और सतही ओज़ोन निर्माण में योगदान देती है।',
    },
    commonUrbanSources: {
      en: ['Diesel and petrol traffic', 'Thermal power plants', 'Diesel backup generators'],
      ta: ['டீசல் மற்றும் பெட்ரோல் வாகனங்கள்', 'மின் உற்பத்தி நிலையங்கள்', 'ஜெனரேட்டர்கள்'],
      hi: ['डीजल और पेट्रोल वाहन', 'तापीय ऊर्जा संयंत्र', 'डीजल जनरेटर'],
    },
  },
  so2: {
    id: 'so2',
    formula: 'SO₂',
    cpcbLimitLabel: '80 µg/m³ (24h CPCB NAAQS)',
    whoGuidelineLabel: '40 µg/m³ (24h WHO 2021)',
    names: {
      en: 'Sulphur Dioxide (SO₂)',
      ta: 'சல்பர் டை ஆக்சைடு (SO₂)',
      hi: 'सल्फर डाइऑक्साइड (SO₂)',
    },
    plainSummary: {
      en: 'A sharp-smelling gas emitted when sulphur-containing fuels (coal, heavy oil) are burned; contributes to sulphate fine particles downwind.',
      ta: 'நிலக்கரி மற்றும் கனரக எரிபொருள்கள் எரியும்போது வெளியாகும் வாயு; நுண்ணிய சல்பேட் துகள்கள் உருவாக வழிவகுக்கும்.',
      hi: 'कोयला और भारी ईंधन जलने से निकलने वाली गैस, जो हवा में सूक्ष्म सल्फेट कणों का निर्माण करती है।',
    },
    commonUrbanSources: {
      en: ['Coal-fired industrial boilers', 'Heavy marine/shipping fuels', 'Refineries & smelters'],
      ta: ['தொழிற்சாலை கொதிகலன்கள்', 'கப்பல் எரிபொருள்', 'சுத்திகரிப்பு ஆலைகள்'],
      hi: ['औद्योगिक बॉयलर', 'समुद्री और भारी ईंधन', 'रिफाइनरी व धातु उद्योग'],
    },
  },
  co: {
    id: 'co',
    formula: 'CO',
    cpcbLimitLabel: '2.0 mg/m³ (8h CPCB NAAQS)',
    whoGuidelineLabel: '4.0 mg/m³ (24h WHO 2021)',
    names: {
      en: 'Carbon Monoxide (CO)',
      ta: 'கார்பன் மோனாக்சைடு (CO)',
      hi: 'कार्बन मोनोऑक्साइड (CO)',
    },
    plainSummary: {
      en: 'A colorless, odorless gas produced by incomplete combustion in congested traffic or poorly vented stoves; measured in mg/m³ under CPCB.',
      ta: 'முழுமையடையாத எரிப்பால் (போக்குவரத்து நெரிசல், அடுப்புகள்) உருவாகும் நிறமற்ற வாயு; CPCB முறையில் mg/m³ அலகில் கணக்கிடப்படுகிறது.',
      hi: 'अधूरे दहन (ट्रैफिक जाम या बंद चूल्हे) से बनने वाली रंगहीन गैस; इसे CPCB मानकों में mg/m³ में मापा जाता है।',
    },
    commonUrbanSources: {
      en: [
        'Idling vehicles in congestion',
        'Incomplete biomass/charcoal combustion',
        'Unvented generators',
      ],
      ta: ['நெரிசலில் நிற்கும் வாகனங்கள்', 'முழுமையற்ற விறகு எரிப்பு', 'காற்றோட்டமற்ற ஜெனரேட்டர்'],
      hi: ['ट्रैफिक जाम में वाहन', 'अपूर्ण बायोमास दहन', 'बंद स्थानों में जनरेटर'],
    },
  },
  o3: {
    id: 'o3',
    formula: 'O₃',
    cpcbLimitLabel: '100 µg/m³ (8h CPCB NAAQS)',
    whoGuidelineLabel: '100 µg/m³ (8h WHO 2021)',
    names: {
      en: 'Ground-Level Ozone (O₃)',
      ta: 'தரைமட்ட ஓசோன் (O₃)',
      hi: 'जमीनी स्तर का ओज़ोन (O₃)',
    },
    plainSummary: {
      en: 'Unlike protective upper-atmosphere ozone, ground-level ozone forms when sunlight drives reactions between NOx and VOCs, often peaking in sunny afternoons.',
      ta: 'வளிமண்டலத்தின் மேல் அடுக்கு ஓசோனைப் போலன்றி, தரைமட்ட ஓசோன் சூரிய ஒளியில் NOx மற்றும் VOC வாயுக்கள் வினைபுரிவதால் பிற்பகலில் உயர்கிறது.',
      hi: 'ऊपरी वायुमंडल के विपरीत, जमीनी ओज़ोन धूप में NOx और VOC गैसों की रासायनिक क्रिया से बनता है और दोपहर में बढ़ सकता है।',
    },
    commonUrbanSources: {
      en: ['Photochemical reaction of NO₂ + VOCs in sunlight', 'Downwind urban plume transport'],
      ta: ['சூரிய ஒளியில் NO₂ + VOC வேதிவினை', 'நகர்ப்புறக் காற்று பரவல்'],
      hi: ['धूप में NO₂ और VOC की प्रतिक्रिया', 'शहरी हवा का बहाव'],
    },
  },
};
