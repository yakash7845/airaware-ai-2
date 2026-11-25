import { Language, ProfileCategory } from '@/types';

export interface CategoryCopyTemplate {
  whyDiffers: Record<Language, string>;
  precautions: Record<Language, { low: string[]; elevated: string[] }>;
  headlinePrefix: Record<Language, string>;
  activityAdvice: Record<Language, { low: string; elevated: string }>;
}

/** Localized non-medical environmental guidance templates indexed by household profile category. */
export const CATEGORY_TEMPLATES: Record<ProfileCategory, CategoryCopyTemplate> = {
  CHILD: {
    headlinePrefix: {
      en: 'Children & School Play',
      ta: 'குழந்தைகள் மற்றும் பள்ளி விளையாட்டு',
      hi: 'बच्चे और बाहरी खेल',
    },
    whyDiffers: {
      en: 'Children breathe faster per kilogram of body weight and spend more active time outdoors, so guidance emphasizes shorter active bursts and adult supervision.',
      ta: 'குழந்தைகள் விரைவாக சுவாசிப்பதாலும் வெளியில் சுறுசுறுப்பாக விளையாடுவதாலும் பெரியவர்களின் மேற்பார்வை மற்றும் நீர் அருந்துதல் வலியுறுத்தப்படுகிறது.',
      hi: 'बच्चों की श्वसन दर अधिक होती है और वे बाहर अधिक सक्रिय रहते हैं, इसलिए छोटे ब्रेक और अभिभावक मार्गदर्शन पर ध्यान दिया जाता है।',
    },
    activityAdvice: {
      en: {
        low: 'Favorable conditions for outdoor play and school sports with regular water breaks.',
        elevated:
          'Prefer shaded or indoor play during peak hours; ask a parent or teacher before long outdoor runs.',
      },
      ta: {
        low: 'வெளியில் விளையாட மற்றும் பள்ளி விளையாட்டுகளுக்கு உகந்த நிலை; போதிய தண்ணீர் குடிக்கவும்.',
        elevated:
          'அதிக மாசு நேரங்களில் வீட்டுக்குள் விளையாடவும்; நீண்ட ஓட்டங்களுக்கு முன் பெரியவர்களிடம் கேட்கவும்.',
      },
      hi: {
        low: 'नियमित पानी के ब्रेक के साथ बाहरी खेल और स्कूल गतिविधियों के लिए अनुकूल समय।',
        elevated: 'पीक प्रदूषण के समय घर के अंदर खेलें और लंबे समय तक दौड़ने से पहले बड़ों से पूछें।',
      },
    },
    precautions: {
      en: {
        low: [
          'Encourage hydration during outdoor play',
          'Choose grassy parks over dusty roadsides',
        ],
        elevated: [
          'Shift vigorous games indoors when AQI rises',
          'Keep classroom windows managed near busy roads',
        ],
      },
      ta: {
        low: ['விளையாடும் போது தண்ணீர் குடிக்க ஊக்குவிக்கவும்', 'தூசு சாலைகளை விட பூங்காக்களை தேர்வு செய்யவும்'],
        elevated: [
          'மாசு அதிகரிக்கும் போது உள்ளரங்க விளையாட்டுகளைத் தேர்ந்தெடுக்கவும்',
          'சாலைப் பக்க ஜன்னல்களை மூடி வைக்கவும்',
        ],
      },
      hi: {
        low: ['खेलते समय पानी पिलाते रहें', 'धूल भरी सड़कों के बजाय पार्क चुनें'],
        elevated: ['AQI बढ़ने पर कठिन खेल घर के अंदर शिफ्ट करें', 'व्यस्त सड़क के पास खिड़कियां बंद रखें'],
      },
    },
  },
  TEEN: {
    headlinePrefix: {
      en: 'Teen Sports & Commuting',
      ta: 'இளைஞர் விளையாட்டு & பயணம்',
      hi: 'किशोर खेल एवं आवागमन',
    },
    whyDiffers: {
      en: 'High-intensity sports and cycling substantially increase minute ventilation, so timing training away from diurnal pollution peaks matters most.',
      ta: 'தீவிர விளையாட்டு மற்றும் சைக்கிள் ஓட்டத்தின் போது சுவாச அளவு அதிகரிப்பதால், மாசு குறைந்த நேரங்களைத் தேர்வு செய்வது முக்கியம்.',
      hi: 'तीव्र खेल और साइकिलिंग के दौरान सांस लेने की गति बढ़ जाती है, इसलिए कम प्रदूषण वाले समय का चयन आवश्यक होता है।',
    },
    activityAdvice: {
      en: {
        low: 'Good window for cycling, track practice, and active school commutes.',
        elevated:
          'Move high-exertion training to lower-AQI morning windows and choose green routes away from traffic corridors.',
      },
      ta: {
        low: 'சைக்கிள் ஓட்டுதல், விளையாட்டுப் பயிற்சி மற்றும் பள்ளிப் பயணத்திற்கு உகந்த நேரம்.',
        elevated:
          'தீவிர பயிற்சிகளை மாசு குறைந்த காலை நேரத்திற்கு மாற்றி போக்குவரத்து நெரிசலற்ற பாதைகளைப் பயன்படுத்தவும்.',
      },
      hi: {
        low: 'साइकिल चलाने, खेल अभ्यास और आवागमन के लिए उपयुक्त स्थिति।',
        elevated: 'तीव्र अभ्यास सुबह के कम प्रदूषण वाले समय में करें और मुख्य यातायात सड़कों से दूर मार्ग चुनें।',
      },
    },
    precautions: {
      en: {
        low: ['Use parks or quiet streets for training', 'Stay hydrated during endurance sessions'],
        elevated: [
          'Check hourly forecast before afternoon sports',
          'Reduce duration of intense cardio near heavy traffic',
        ],
      },
      ta: {
        low: ['பயிற்சிக்கு பூங்காக்கள் அல்லது அமைதியான தெருக்களைப் பயன்படுத்தவும்', 'போதுமான நீர் அருந்தவும்'],
        elevated: [
          'மதிய விளையாட்டுக்கு முன் மணிநேர முன்னறிவிப்பைச் சரிபார்க்கவும்',
          'நெரிசல் சாலைகளில் தீவிர ஓட்டத்தைக் குறைக்கவும்',
        ],
      },
      hi: {
        low: ['अभ्यास के लिए पार्क या शांत सड़कें चुनें', 'सहनशक्ति अभ्यास के दौरान पानी पिएं'],
        elevated: ['दोपहर के खेल से पहले प्रति घंटा पूर्वानुमान देखें', 'भारी ट्रैफिक के पास तीव्र कार्डियो कम करें'],
      },
    },
  },
  ADULT: {
    headlinePrefix: {
      en: 'Daily Commute & Routine',
      ta: 'தினசரி பயணம் & பணிகள்',
      hi: 'दैनिक आवागमन और दिनचर्या',
    },
    whyDiffers: {
      en: 'Adult guidance balances daily commuting, outdoor errands, and indoor ventilation decisions against pollutant persistence and weather context.',
      ta: 'தினசரி வேலை, பயணம் மற்றும் வீட்டு காற்றோட்ட முடிவுகளை மாசு அளவு மற்றும் வானிலையுடன் இணைத்து வழிகாட்டுகிறது.',
      hi: 'वयस्क मार्गदर्शन दैनिक आवागमन, बाहरी कार्यों और घर के वेंटिलेशन निर्णयों को मौसम के संदर्भ में संतुलित करता है।',
    },
    activityAdvice: {
      en: {
        low: 'Suitable conditions for routine jogging, outdoor errands, and cross-ventilating indoor rooms.',
        elevated:
          'Plan errands during comparatively lower forecast windows and moderate prolonged outdoor exertion.',
      },
      ta: {
        low: 'தினசரி நடைபயிற்சி, வேலைகள் மற்றும் வீட்டைக் காற்றோட்டமாக்க உகந்த சூழல்.',
        elevated:
          'ஒப்பீட்டளவில் குறைந்த மாசு நேரங்களில் வெளிப்பணிகளை திட்டமிட்டு நீண்ட நேர வெளிப்புற உழைப்பைக் குறைக்கவும்.',
      },
      hi: {
        low: 'दैनिक जॉगिंग, बाहरी कार्यों और घर में प्राकृतिक वेंटिलेशन के लिए अनुकूल स्थिति।',
        elevated: 'तुलनात्मक रूप से कम प्रदूषण वाले समय में बाहरी कार्य निपटाएं और लंबे श्रम को सीमित करें।',
      },
    },
    precautions: {
      en: {
        low: [
          'Keep indoor ventilation active when outdoor AQI stays low',
          'Monitor dominant pollutant trends',
        ],
        elevated: [
          'Buffer road-facing windows during rush hours',
          'Check Outdoor Planner for cleaner commute windows',
        ],
      },
      ta: {
        low: ['வெளிப்புற காற்று நன்றாக இருக்கும்போது ஜன்னல்களைத் திறக்கவும்', 'முக்கிய மாசு போக்கைக் கவனிக்கவும்'],
        elevated: [
          'நெரிசல் நேரங்களில் சாலைப் பக்க ஜன்னல்களை மூடவும்',
          'சிறந்த நேர திட்டத்தில் பயண நேரத்தைச் சரிபார்க்கவும்',
        ],
      },
      hi: {
        low: ['बाहरी हवा अच्छी रहने पर खिड़कियां खुली रखें', 'प्रमुख प्रदूषक प्रवृत्ति पर ध्यान दें'],
        elevated: ['पीक ट्रैफिक में सड़क की ओर की खिड़कियां बंद रखें', 'बेहतर समय के लिए आउटडोर प्लानर देखें'],
      },
    },
  },
  SENIOR: {
    headlinePrefix: {
      en: 'Senior Comfort & Gentle Walks',
      ta: 'முதியோர் நலன் & மென்மையான நடை',
      hi: 'वरिष्ठ नागरिक आराम एवं सैर',
    },
    whyDiffers: {
      en: 'Guidance for older adults emphasizes gentle pacing, avoiding peak traffic dust/cold drafts, and prioritizing high-clarity readable summaries.',
      ta: 'முதியோர்களுக்கு மென்மையான நடை வேகம், தூசு/போக்குவரத்து நெரிசலைத் தவிர்த்தல் மற்றும் தெளிவான எளிய வழிகாட்டலுக்கு முன்னுரிமை அளிக்கப்படுகிறது.',
      hi: 'वरिष्ठ नागरिकों के लिए धीमी गति से सैर, धूल व ठंडी हवा के झोंकों से बचाव और स्पष्ट जानकारी को प्राथमिकता दी जाती है।',
    },
    activityAdvice: {
      en: {
        low: 'Comfortable conditions for gentle morning or evening walks in quiet parks.',
        elevated:
          'Prefer brief, relaxed walks during the cleanest forecast window and avoid dusty roadside corridors.',
      },
      ta: {
        low: 'அமைதியான பூங்காக்களில் காலை அல்லது மாலை மென்மையான நடைப்பயிற்சிக்கு ஏற்ற சூழல்.',
        elevated: 'மாசு குறைந்த நேரத்தில் குறுகிய நடைப்பயிற்சி மேற்கொண்டு தூசு நிறைந்த சாலைகளைத் தவிர்க்கவும்.',
      },
      hi: {
        low: 'शांत पार्कों में सुबह या शाम की हल्की सैर के लिए सुखद परिस्थिति।',
        elevated: 'सबसे स्वच्छ पूर्वानुमान समय में संक्षिप्त सैर चुनें और धूल भरी सड़कों से दूर रहें।',
      },
    },
    precautions: {
      en: {
        low: ['Maintain comfortable walking pace and hydration', 'Prefer shaded green spaces'],
        elevated: [
          'Avoid prolonged outdoor stay during peak traffic hours',
          'Keep bedroom air calm and low-dust',
        ],
      },
      ta: {
        low: ['மிதமான வேகத்தில் நடந்து போதிய நீர் அருந்தவும்', 'மரங்கள் நிறைந்த இடங்களைத் தேர்ந்தெடுக்கவும்'],
        elevated: [
          'நெரிசல் நேரங்களில் வெளியில் நீண்ட நேரம் நிற்பதைத் தவிர்க்கவும்',
          'படுக்கையறையை தூசின்றி பராமரிக்கவும்',
        ],
      },
      hi: {
        low: ['आरामदायक गति से टहलें और पानी पिएं', 'हरित व छायादार मार्ग चुनें'],
        elevated: ['पीक ट्रैफिक के दौरान लंबे समय तक बाहर न रहें', 'शयनकक्ष को धूल से मुक्त रखें'],
      },
    },
  },
  GENERAL: {
    headlinePrefix: {
      en: 'General Household Overview',
      ta: 'பொது குடும்பக் கண்ணோட்டம்',
      hi: 'सामान्य पारिवारिक सारांश',
    },
    whyDiffers: {
      en: 'Provides a balanced household baseline without age-specific assumptions, suitable when mixed ages share outdoor and indoor routines.',
      ta: 'குடும்பத்தின் அனைத்து வயதினருக்கும் பொருந்தக்கூடிய சமநிலையான பொது வழிகாட்டலை வழங்குகிறது.',
      hi: 'सभी आयु वर्गों वाले परिवार के लिए बिना किसी आयु-विशेष धारणा के संतुलित सामान्य मार्गदर्शन प्रदान करता है।',
    },
    activityAdvice: {
      en: {
        low: 'Standard outdoor schedules and household ventilation are generally well-supported.',
        elevated:
          'Coordinate shared family errands and outdoor time around comparatively cleaner forecast slots.',
      },
      ta: {
        low: 'வழக்கமான குடும்ப வெளிப்புற பணிகள் மற்றும் வீட்டுக் காற்றோட்டத்திற்கு உகந்த நிலை.',
        elevated: 'குடும்ப வெளிப்பணிகளை ஒப்பீட்டளவில் குறைந்த மாசு நேரங்களில் திட்டமிடவும்.',
      },
      hi: {
        low: 'सामान्य पारिवारिक बाहरी कार्यक्रम और घर के वेंटिलेशन के लिए अनुकूल।',
        elevated: 'परिवार की बाहरी गतिविधियों को तुलनात्मक रूप से स्वच्छ समय के अनुसार व्यवस्थित करें।',
      },
    },
    precautions: {
      en: {
        low: [
          'Keep indoor combustion (incense/smoke) minimal',
          'Check forecast transitions before travel',
        ],
        elevated: [
          'Adjust window timing when regional AQI worsens',
          'Use damp wiping instead of dry sweeping',
        ],
      },
      ta: {
        low: ['வீட்டுக்குள் புகை உண்டாக்கும் பொருட்களைக் குறைக்கவும்', 'பயணத்திற்கு முன் முன்னறிவிப்பைப் பார்க்கவும்'],
        elevated: ['மாசு அதிகரிக்கும் போது ஜன்னல் நேரத்தை மாற்றவும்', 'ஈரத்துணி துடைப்பைப் பயன்படுத்தவும்'],
      },
      hi: {
        low: ['घर के अंदर धुआं उत्पन्न करने वाली वस्तुएं कम करें', 'यात्रा से पहले पूर्वानुमान देखें'],
        elevated: ['प्रदूषण बढ़ने पर खिड़की खोलने का समय बदलें', 'सूखे झाड़ू के बजाय गीले पोंछे का उपयोग करें'],
      },
    },
  },
};
