import { CpcbCategoryKey, Language } from '@/types';

const HEALTH_GUIDANCE: Record<Language, Record<CpcbCategoryKey, string>> = {
  en: {
    GOOD: 'Minimal environmental impact. Routine outdoor activities and natural home ventilation are generally favorable.',
    SATISFACTORY:
      'Minor breathing discomfort may occur for unusually sensitive people; general outdoor routines remain suitable for most.',
    MODERATE:
      'Breathing discomfort may occur for children, older adults, and people with respiratory or heart sensitivities. Consider moderating prolonged heavy exertion.',
    POOR: 'Prolonged outdoor exposure may cause breathing discomfort to most people. Prefer shorter or lower-exertion outdoor periods when possible.',
    VERY_POOR:
      'Prolonged exposure increases the risk of respiratory irritation. Shift strenuous activities indoors and prioritize clean indoor air.',
    SEVERE:
      'High pollution impact across the population. Minimize outdoor exertion and limit outdoor air infiltration indoors.',
  },
  ta: {
    GOOD: 'குறைந்தபட்ச தாக்கம் மட்டுமே. வழக்கமான வெளிப்புற செயல்பாடுகள் மற்றும் இயற்கையான காற்றோட்டத்திற்கு சாதகமான சூழல்.',
    SATISFACTORY:
      'அதிக உணர்திறன் கொண்டவர்களுக்கு லேசான சுவாச அசௌகரியம் ஏற்படலாம்; பெரும்பாலானோருக்கு இயல்பான நிலை.',
    MODERATE:
      'குழந்தைகள், முதியவர்கள் மற்றும் சுவாச/இதய பாதிப்பு உள்ளவர்களுக்கு அசௌகரியம் ஏற்படலாம். நீண்ட நேர கடின வெளிப்புற உடற்பயிற்சியை மிதப்படுத்தவும்.',
    POOR: 'நீண்ட நேரம் வெளியில் இருந்தால் பெரும்பாலானோருக்கு சுவாச அசௌகரியம் ஏற்படலாம். வெளிப்புற நேரத்தைக் குறைக்கவும்.',
    VERY_POOR: 'நீண்ட நேர வெளிப்பாடு சுவாச எரிச்சலை அதிகரிக்கலாம். கடின உடற்பயிற்சிகளை உள்ளரங்கிற்கு மாற்றவும்.',
    SEVERE:
      'அனைவருக்கும் கடுமையான காற்று மாசு தாக்கம். வெளிப்புற செயல்பாடுகளை குறைத்து உள்ளக காற்றுத் தூய்மையைப் பாதுகாக்கவும்.',
  },
  hi: {
    GOOD: 'न्यूनतम पर्यावरणीय प्रभाव। सामान्य बाहरी गतिविधियां और प्राकृतिक वेंटिलेशन आमतौर पर अनुकूल हैं।',
    SATISFACTORY:
      'अत्यधिक संवेदनशील लोगों को हल्की सांस की असुविधा हो सकती है; अधिकांश लोगों के लिए सामान्य स्थिति।',
    MODERATE:
      'बच्चों, वरिष्ठ नागरिकों और श्वसन या हृदय संबंधी संवेदनशीलता वाले लोगों को असुविधा हो सकती है। लंबे भारी श्रम को सीमित करें।',
    POOR: 'लंबे समय तक बाहर रहने से अधिकांश लोगों को सांस लेने में असुविधा हो सकती है। बाहरी समय को कम रखें।',
    VERY_POOR: 'लंबे संपर्क से श्वसन जलन बढ़ सकती है। कठिन व्यायाम घर के अंदर करें और इनडोर वायु को स्वच्छ रखें।',
    SEVERE: 'सभी वर्गों पर गंभीर प्रभाव। बाहरी गतिविधियों को न्यूनतम रखें और बाहर की धूल-धुएं को अंदर आने से रोकें।',
  },
};

export function getCpcbHealthGuidance(
  categoryKey: CpcbCategoryKey | null,
  language: Language = 'en'
): string {
  if (!categoryKey) {
    if (language === 'ta')
      return 'போதுமான மாசு அளவு தரவு கிடைக்காததால் வழிகாட்டுதல் வரையறுக்கப்பட்டுள்ளது.';
    if (language === 'hi') return 'पर्याप्त प्रदूषक डेटा उपलब्ध न होने के कारण मार्गदर्शन सीमित है।';
    return 'Insufficient pollutant data to determine official CPCB category guidance.';
  }
  return HEALTH_GUIDANCE[language][categoryKey];
}
