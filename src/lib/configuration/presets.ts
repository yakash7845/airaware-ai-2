import { FamilyProfile, GeoLocation, ProfileCategory } from '@/types';

export const PROFILE_CATEGORY_DEFAULTS: Record<
  ProfileCategory,
  { ageRange: string; avatarColor: string }
> = {
  CHILD: { ageRange: '< 12 yrs', avatarColor: '#15803d' },
  TEEN: { ageRange: '13–17 yrs', avatarColor: '#0369a1' },
  ADULT: { ageRange: '18–59 yrs', avatarColor: '#4338ca' },
  SENIOR: { ageRange: '60+ yrs', avatarColor: '#b45309' },
  GENERAL: { ageRange: 'All Ages', avatarColor: '#0f766e' },
};

/** Create a normalized FamilyProfile record using centralized category defaults. */
export function buildFamilyProfile(
  id: string,
  name: string,
  category: ProfileCategory,
  createdAt: string = new Date().toISOString()
): FamilyProfile {
  const defaults = PROFILE_CATEGORY_DEFAULTS[category];
  return {
    id,
    name: name.trim().slice(0, 60),
    category,
    ageRange: defaults.ageRange,
    avatarColor: defaults.avatarColor,
    createdAt,
  };
}

/** Compare two GeoLocation records by normalized name and approximate coordinates. */
export function isSameGeoLocation(a: GeoLocation, b: GeoLocation): boolean {
  return (
    a.name.toLowerCase() === b.name.toLowerCase() &&
    Math.abs(a.latitude - b.latitude) < 0.05 &&
    Math.abs(a.longitude - b.longitude) < 0.05
  );
}

export const DEFAULT_LOCATION: GeoLocation = {
  id: 1264527,
  name: 'Chennai',
  latitude: 13.08784,
  longitude: 80.27847,
  country: 'India',
  admin1: 'Tamil Nadu',
  timezone: 'Asia/Kolkata',
  countryCode: 'IN',
};

export const PRESET_CITIES: readonly GeoLocation[] = [
  DEFAULT_LOCATION,
  {
    id: 1273294,
    name: 'Delhi',
    latitude: 28.65195,
    longitude: 77.23149,
    country: 'India',
    admin1: 'Delhi',
    timezone: 'Asia/Kolkata',
    countryCode: 'IN',
  },
  {
    id: 1275339,
    name: 'Mumbai',
    latitude: 19.07283,
    longitude: 72.88261,
    country: 'India',
    admin1: 'Maharashtra',
    timezone: 'Asia/Kolkata',
    countryCode: 'IN',
  },
  {
    id: 1277333,
    name: 'Bengaluru',
    latitude: 12.97194,
    longitude: 77.59369,
    country: 'India',
    admin1: 'Karnataka',
    timezone: 'Asia/Kolkata',
    countryCode: 'IN',
  },
  {
    id: 1275004,
    name: 'Kolkata',
    latitude: 22.56263,
    longitude: 88.36304,
    country: 'India',
    admin1: 'West Bengal',
    timezone: 'Asia/Kolkata',
    countryCode: 'IN',
  },
  {
    id: 1273865,
    name: 'Coimbatore',
    latitude: 11.00555,
    longitude: 76.96612,
    country: 'India',
    admin1: 'Tamil Nadu',
    timezone: 'Asia/Kolkata',
    countryCode: 'IN',
  },
  {
    id: 1269843,
    name: 'Hyderabad',
    latitude: 17.38405,
    longitude: 78.45636,
    country: 'India',
    admin1: 'Telangana',
    timezone: 'Asia/Kolkata',
    countryCode: 'IN',
  },
  {
    id: 1259229,
    name: 'Pune',
    latitude: 18.51957,
    longitude: 73.85535,
    country: 'India',
    admin1: 'Maharashtra',
    timezone: 'Asia/Kolkata',
    countryCode: 'IN',
  },
];

export const DEFAULT_FAMILY_PROFILES: readonly FamilyProfile[] = [
  buildFamilyProfile(
    'profile-general',
    'Household Baseline',
    'GENERAL',
    '2026-01-01T00:00:00.000Z'
  ),
  buildFamilyProfile('profile-child', 'Aarav', 'CHILD', '2026-01-01T00:00:00.000Z'),
  buildFamilyProfile('profile-teen', 'Diya', 'TEEN', '2026-01-01T00:00:00.000Z'),
  buildFamilyProfile('profile-adult', 'Karthik', 'ADULT', '2026-01-01T00:00:00.000Z'),
  buildFamilyProfile('profile-senior', 'Lakshmi', 'SENIOR', '2026-01-01T00:00:00.000Z'),
];
