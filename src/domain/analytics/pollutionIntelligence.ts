import { AirSnapshot, CorePollutantId, Language } from '@/types';
import { POLLUTANT_EDUCATION } from '@/domain/pollutants/educationalInfo';
import { POLLUTANT_SPECS } from '@/domain/aqi';

export interface PollutionInsightReport {
  headline: string;
  dominantPollutantExplanation: string;
  aqiInterpretation: string;
  forecastOutlook: string;
  practicalTakeaways: string[];
  anomaliesDetected: string[];
}

export function buildPollutionIntelligence(
  snapshot: AirSnapshot,
  language: Language = 'en'
): PollutionInsightReport {
  const { computedAqi, current, trendSummary, events, weather } = snapshot;
  const aqiVal = computedAqi.value;
  const cat = computedAqi.categoryLabel;
  const dom = computedAqi.dominantPollutant;
  const domSpec = dom ? POLLUTANT_SPECS[dom] : null;
  const domMeas = dom ? current.find((m) => m.pollutant === dom) : undefined;
  const edu =
    dom &&
    (dom === 'pm2_5' ||
      dom === 'pm10' ||
      dom === 'no2' ||
      dom === 'so2' ||
      dom === 'co' ||
      dom === 'o3')
      ? POLLUTANT_EDUCATION[dom as CorePollutantId]
      : null;

  const anomaliesDetected = events.map((e) => e.summary);

  if (language === 'ta') {
    const headline =
      aqiVal !== null
        ? `${snapshot.location.name}: ${cat} (IN NAQI ${aqiVal})`
        : `${snapshot.location.name}: முழுமையான AQI தரவு இல்லை`;
    const dominantPollutantExplanation =
      dom && domSpec && edu
        ? `${domSpec.formula} (${domMeas?.value ?? '--'} ${domMeas?.unit ?? domSpec.standardUnit}) தற்போதைய குறியீட்டில் முதன்மை காரணியாக உள்ளது. ${edu.plainSummary.ta}`
        : 'முதன்மை மாசு காரணியை நிர்ணயிக்க போதுமான தரவு இல்லை.';
    const aqiInterpretation =
      aqiVal !== null
        ? `இது CAMS வளிமண்டல மாதிரி (24h/8h சராசரி) அடிப்படையிலான ${cat} நிலை.`
        : 'குறைந்தபட்சம் 3 மாசு அளவுகள் தேவைப்படுவதால் குறியீடு கணிக்கப்படவில்லை.';
    const forecastOutlook =
      trendSummary.forecastMeanAqi !== null
        ? `அடுத்த நாட்களுக்கான சராசரி முன்னறிவிப்பு ${trendSummary.forecastMeanAqi} IN NAQI (${trendSummary.trendDirection}).`
        : 'முன்னறிவிப்பு போக்கு தரவு குறைவாக உள்ளது.';

    return {
      headline,
      dominantPollutantExplanation,
      aqiInterpretation,
      forecastOutlook,
      practicalTakeaways: [
        weather && weather.windSpeed < 8
          ? `காற்றின் வேகம் குறைவாக (${weather.windSpeed} km/h) உள்ளதால் மாசு பரவல் மெதுவாக இருக்கலாம்.`
          : `தற்போதைய காற்றின் வேகம் ${weather?.windSpeed ?? '--'} km/h.`,
        'உள்ளக மற்றும் வெளிப்புற நேரங்களை முன்னறிவிப்பு அட்டவணை மூலம் ஒப்பிட்டுத் திட்டமிடவும்.',
      ],
      anomaliesDetected,
    };
  }

  if (language === 'hi') {
    const headline =
      aqiVal !== null
        ? `${snapshot.location.name}: ${cat} (IN NAQI ${aqiVal})`
        : `${snapshot.location.name}: पर्याप्त AQI डेटा उपलब्ध नहीं`;
    const dominantPollutantExplanation =
      dom && domSpec && edu
        ? `${domSpec.formula} (${domMeas?.value ?? '--'} ${domMeas?.unit ?? domSpec.standardUnit}) वर्तमान सूचकांक का प्रमुख कारक है। ${edu.plainSummary.hi}`
        : 'प्रमुख प्रदूषक निर्धारित करने के लिए पर्याप्त डेटा नहीं है।';
    const aqiInterpretation =
      aqiVal !== null
        ? `यह CAMS वायुमंडलीय मॉडल के 24h/8h रोलिंग औसत पर आधारित सांकेतिक ${cat} स्तर है।`
        : 'कम से कम 3 मानदंड प्रदूषक न होने के कारण सूचकांक गणना उपलब्ध नहीं है।';
    const forecastOutlook =
      trendSummary.forecastMeanAqi !== null
        ? `आगामी पूर्वानुमान अवधि का औसत ${trendSummary.forecastMeanAqi} IN NAQI (${trendSummary.trendDirection}) अनुमानित है।`
        : 'पूर्वानुमान प्रवृत्ति डेटा सीमित है।';

    return {
      headline,
      dominantPollutantExplanation,
      aqiInterpretation,
      forecastOutlook,
      practicalTakeaways: [
        weather && weather.windSpeed < 8
          ? `हवा की धीमी गति (${weather.windSpeed} km/h) से प्रदूषकों का फैलाव सीमित रह सकता है।`
          : `वर्तमान हवा की गति ${weather?.windSpeed ?? '--'} km/h है।`,
        'अधिक भारी बाहरी गतिविधियों के लिए पूर्वानुमान तुलना विंडो की जांच करें।',
      ],
      anomaliesDetected,
    };
  }

  const headline =
    aqiVal !== null
      ? `${snapshot.location.name}: ${cat} (Indicative IN NAQI ${aqiVal})`
      : `${snapshot.location.name}: Indicative IN NAQI Unavailable`;

  const dominantPollutantExplanation =
    dom && domSpec && edu
      ? `${domSpec.formula} is driving the index (sub-index ${computedAqi.subIndices[dom] ?? '--'}, current hourly ${domMeas?.value ?? '--'} ${domMeas?.unit ?? domSpec.standardUnit}). ${edu.plainSummary.en}`
      : 'Insufficient criteria pollutants to identify a single dominant pollutant.';

  const aqiInterpretation =
    aqiVal !== null
      ? `Based on CAMS atmospheric model data and CPCB 2014 breakpoints (${computedAqi.methodology === 'CPCB_NAQI_ROLLING_MODEL' ? '24h/8h rolling model mean' : 'indicative hourly estimate'}), conditions fall in the ${cat} tier.`
      : 'CPCB requires at least 3 valid pollutants including PM₂.₅ or PM₁₀; no fabricated fallback index is substituted.';

  const forecastOutlook =
    trendSummary.forecastMeanAqi !== null && trendSummary.pastMeanAqi !== null
      ? `Projected forecast mean (${trendSummary.forecastMeanAqi} IN NAQI) vs trailing model mean (${trendSummary.pastMeanAqi} IN NAQI) indicates a ${trendSummary.trendDirection.toLowerCase()} outlook (${trendSummary.aqiDeltaPercent !== null && trendSummary.aqiDeltaPercent >= 0 ? '+' : ''}${trendSummary.aqiDeltaPercent ?? 0}%).`
      : 'Review hourly forecast bars for diurnal peaks and dispersion windows.';

  const practicalTakeaways: string[] = [];
  if (weather) {
    practicalTakeaways.push(
      weather.windSpeed < 8
        ? `Light surface winds (${weather.windSpeed} km/h) may slow pollutant dispersion.`
        : `Moderate winds (${weather.windSpeed} km/h from ${weather.windDirection}°) support atmospheric mixing.`
    );
    if (weather.precipitation >= 0.5) {
      practicalTakeaways.push(
        `Precipitation (${weather.precipitation} mm) may help settle coarse particulates.`
      );
    }
  }
  practicalTakeaways.push(
    'Compare 2-hour windows in the Outdoor Planner rather than relying solely on a single daily number.'
  );

  return {
    headline,
    dominantPollutantExplanation,
    aqiInterpretation,
    forecastOutlook,
    practicalTakeaways,
    anomaliesDetected,
  };
}
