/**
 * @module storageSchemas
 * Zod schemas and default values validating persisted client preferences in `localStorage`.
 */
import { z } from 'zod';
import { AccessibilitySettings, EnvironmentalInterest, GeoLocation } from '@/types';
import { PRESET_CITIES } from '@/lib/configuration/presets';

/** Zod schemas validating localStorage-persisted user preferences on read. */
export const LanguageStorageSchema = z.enum(['en', 'ta', 'hi']);

export const AccessibilityStorageSchema = z.object({
  highContrast: z.boolean(),
  fontSize: z.enum(['normal', 'large', 'extra-large']),
  reducedMotion: z.boolean(),
});

export const GeoLocationSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country: z.string(),
  admin1: z.string().optional(),
  admin2: z.string().optional(),
  timezone: z.string(),
  population: z.number().optional(),
  countryCode: z.string(),
});

export const FamilyProfilesSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(60),
      category: z.enum(['CHILD', 'TEEN', 'ADULT', 'SENIOR', 'GENERAL']),
      ageRange: z.string(),
      avatarColor: z.string(),
      createdAt: z.string(),
    })
  )
  .min(1);

export const InterestsSchema = z.array(
  z.enum(['FAMILY_HEALTH', 'OUTDOOR_SPORTS', 'COMMUTING', 'AIR_SCIENCE', 'URBAN_PLANNING'])
);

export const IndoorSetupStorageSchema = z.object({
  naturallyVentilated: z.enum(['YES', 'NO', 'PARTIAL']).nullable(),
  windowsStatus: z.enum(['OPEN', 'CLOSED', 'TIME_DEPENDENT']).nullable(),
  cookingNearby: z.enum(['YES', 'NO', 'OCCASIONALLY']).nullable(),
  visibleDustOrSmoke: z.enum(['YES', 'NO', 'SOMETIMES']).nullable(),
  airPurifierAvailable: z.enum(['YES', 'NO']).nullable(),
  roadFacingArea: z.enum(['YES', 'NO']).nullable(),
  updatedAt: z.string().optional(),
});

export const BooleanSchema = z.boolean();
export const SavedLocationsSchema = z.array(GeoLocationSchema).min(1).max(8);
export const ActiveProfileIdSchema = z.string().min(1);

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  highContrast: false,
  fontSize: 'normal',
  reducedMotion: false,
};

export const DEFAULT_SAVED_LOCATIONS: GeoLocation[] = [
  PRESET_CITIES[0]!,
  PRESET_CITIES[1]!,
  PRESET_CITIES[5]!,
];

export const DEFAULT_INTERESTS: EnvironmentalInterest[] = ['FAMILY_HEALTH', 'COMMUTING'];
