/**
 * @module guidanceEngine
 * Deterministic household profile personalization engine.
 * Translates an immutable {@link AirSnapshot} into age/activity-appropriate non-medical
 * guidance across EN/TA/HI while strictly preserving AQI invariance across profiles.
 */
import { AirSnapshot, CpcbCategoryKey, Language, ProfileCategory, ProfileGuidance } from '@/types';
import { getCpcbHealthGuidance, POLLUTANT_SPECS } from '@/domain/aqi';
import { CATEGORY_TEMPLATES } from './categoryTemplates';

const CAUTION_BY_CATEGORY: Record<CpcbCategoryKey, ProfileGuidance['cautionLevel']> = {
  GOOD: 'LOW',
  SATISFACTORY: 'LOW',
  MODERATE: 'MODERATE',
  POOR: 'HIGH',
  VERY_POOR: 'VERY_HIGH',
  SEVERE: 'VERY_HIGH',
};

function formatLocalizedSummary(
  cityName: string,
  aqiVal: number | null,
  catKey: CpcbCategoryKey | null,
  catLabel: string | null,
  language: Language
): string {
  if (aqiVal === null || !catLabel) {
    return getCpcbHealthGuidance(null, language);
  }
  const healthText = getCpcbHealthGuidance(catKey, language);
  if (language === 'ta') {
    return `${cityName} பகுதியில் தற்போதைய மதிப்பிடப்பட்ட IN NAQI ${aqiVal} (${catLabel}). ${healthText}`;
  }
  if (language === 'hi') {
    return `${cityName} में वर्तमान सांकेतिक IN NAQI ${aqiVal} (${catLabel}) है। ${healthText}`;
  }
  return `${cityName} currently records an indicative CPCB NAQI of ${aqiVal} (${catLabel}). ${healthText}`;
}

function formatDominantBreakdown(snapshot: AirSnapshot, language: Language): string {
  const { computedAqi, current } = snapshot;
  const dom = computedAqi.dominantPollutant;
  const domSpec = dom ? POLLUTANT_SPECS[dom] : null;
  if (!dom || !domSpec) {
    if (language === 'ta') return 'முதன்மை மாசு தரவு கிடைக்கவில்லை.';
    if (language === 'hi') return 'प्रमुख प्रदूषक डेटा उपलब्ध नहीं है।';
    return 'Dominant pollutant unavailable due to insufficient inputs.';
  }

  const domMeas = current.find((m) => m.pollutant === dom);
  const valStr = `${domMeas?.value ?? '--'} ${domMeas?.unit ?? domSpec.standardUnit}`;
  if (language === 'ta') return `முதன்மை மாசு: ${domSpec.formula} (${valStr}).`;
  if (language === 'hi') return `प्रमुख प्रदूषक: ${domSpec.formula} (${valStr}).`;
  return `Dominant pollutant: ${domSpec.formula} (hourly ${valStr}, sub-index ${computedAqi.subIndices[dom] ?? '--'}).`;
}

/**
 * Generate personalized non-medical environmental guidance for a profile.
 * Guarantees that underlying AQI readings, dominant pollutant, and timestamps remain
 * strictly invariant across all profiles for the same AirSnapshot.
 */
export function buildProfileGuidance(
  snapshot: AirSnapshot,
  category: ProfileCategory,
  language: Language = 'en',
  profileId?: string
): ProfileGuidance {
  const { computedAqi, current } = snapshot;
  const aqiVal = computedAqi.value;
  const catKey = computedAqi.categoryKey;
  const catLabel = computedAqi.categoryLabel;
  const dom = computedAqi.dominantPollutant;
  const domMeas = dom ? current.find((m) => m.pollutant === dom) : undefined;

  const cautionLevel = catKey ? CAUTION_BY_CATEGORY[catKey] : 'MODERATE';
  const template = CATEGORY_TEMPLATES[category];
  const isElevated = aqiVal !== null && aqiVal > 100;

  const headline =
    aqiVal !== null && catLabel
      ? `${template.headlinePrefix[language]} — ${catLabel} (${aqiVal})`
      : `${template.headlinePrefix[language]} — Data Limited`;

  return {
    profileId,
    profileCategory: category,
    headline,
    summary: formatLocalizedSummary(snapshot.location.name, aqiVal, catKey, catLabel, language),
    activityGuidance: isElevated
      ? template.activityAdvice[language].elevated
      : template.activityAdvice[language].low,
    precautionarySteps: isElevated
      ? template.precautions[language].elevated
      : template.precautions[language].low,
    pollutantBreakdown: formatDominantBreakdown(snapshot, language),
    whyDiffersNote: template.whyDiffers[language],
    cautionLevel,
    language,
    provenance: {
      aqiValue: aqiVal,
      aqiCategory: catLabel,
      dominantPollutant: dom,
      dominantPollutantValue: domMeas?.value,
      dominantPollutantUnit: domMeas?.unit,
      methodology: computedAqi.methodDescription,
      dataSource: computedAqi.sourceName,
      dataSourceKind: computedAqi.dataSourceKind,
      observedAt: computedAqi.observedAt,
      ruleCitation: `CPCB National Air Quality Index (2014) tier: ${catLabel ?? 'Unavailable'}`,
      deterministicRuleId: `CPCB-NAQI-2014-${catKey ?? 'UNAVAILABLE'}-${category}`,
      dataLimitations: [
        ...computedAqi.limitations,
        'General environmental guidance only; does not calculate individual inhaled dose or medical diagnosis.',
      ],
    },
  };
}
