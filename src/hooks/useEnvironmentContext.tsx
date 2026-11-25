'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  DEFAULT_FAMILY_PROFILES,
  DEFAULT_LOCATION,
  PRESET_CITIES,
} from '@/lib/configuration/presets';
import { DEFAULT_INDOOR_SETUP } from '@/domain/recommendations/indoorAdvisor';
import { getTranslations, AppTranslations } from '@/i18n';
import {
  AccessibilitySettings,
  AirSnapshot,
  ApiResponse,
  EnvironmentalInterest,
  FamilyProfile,
  GeoLocation,
  IndoorEnvironmentSetup,
  Language,
} from '@/types';
import { useLocalStorageState } from './useLocalStorageState';

const LanguageStorageSchema = z.enum(['en', 'ta', 'hi']);

const AccessibilityStorageSchema = z.object({
  highContrast: z.boolean(),
  fontSize: z.enum(['normal', 'large', 'extra-large']),
  reducedMotion: z.boolean(),
});

const GeoLocationSchema = z.object({
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

const FamilyProfilesSchema = z
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

const InterestsSchema = z.array(
  z.enum(['FAMILY_HEALTH', 'OUTDOOR_SPORTS', 'COMMUTING', 'AIR_SCIENCE', 'URBAN_PLANNING'])
);

const IndoorSetupStorageSchema = z.object({
  naturallyVentilated: z.enum(['YES', 'NO', 'PARTIAL']).nullable(),
  windowsStatus: z.enum(['OPEN', 'CLOSED', 'TIME_DEPENDENT']).nullable(),
  cookingNearby: z.enum(['YES', 'NO', 'OCCASIONALLY']).nullable(),
  visibleDustOrSmoke: z.enum(['YES', 'NO', 'SOMETIMES']).nullable(),
  airPurifierAvailable: z.enum(['YES', 'NO']).nullable(),
  roadFacingArea: z.enum(['YES', 'NO']).nullable(),
  updatedAt: z.string().optional(),
});

const BooleanSchema = z.boolean();
const SavedLocationsSchema = z.array(GeoLocationSchema).min(1).max(8);

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  highContrast: false,
  fontSize: 'normal',
  reducedMotion: false,
};

const DEFAULT_SAVED_LOCATIONS: GeoLocation[] = [
  PRESET_CITIES[0]!,
  PRESET_CITIES[1]!,
  PRESET_CITIES[5]!,
];

const DEFAULT_INTERESTS: EnvironmentalInterest[] = ['FAMILY_HEALTH', 'COMMUTING'];

interface EnvironmentContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: AppTranslations;
  accessibility: AccessibilitySettings;
  setAccessibility: (next: AccessibilitySettings) => void;
  currentLocation: GeoLocation;
  selectLocation: (loc: GeoLocation) => void;
  savedLocations: GeoLocation[];
  addSavedLocation: (loc: GeoLocation) => void;
  removeSavedLocation: (id: number, name: string) => void;
  profiles: FamilyProfile[];
  setProfiles: (profiles: FamilyProfile[]) => void;
  activeProfile: FamilyProfile;
  setActiveProfileId: (id: string) => void;
  interests: EnvironmentalInterest[];
  setInterests: (interests: EnvironmentalInterest[]) => void;
  indoorSetup: IndoorEnvironmentSetup;
  setIndoorSetup: (setup: IndoorEnvironmentSetup) => void;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (done: boolean) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  snapshot: AirSnapshot | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  geolocationStatus: string | null;
  requestBrowserGeolocation: () => void;
  refreshSnapshot: () => void;
  resetAllLocalData: () => void;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useLocalStorageState<Language>(
    'airaware2_language',
    'en',
    LanguageStorageSchema
  );
  const [accessibility, setAccessibility] = useLocalStorageState<AccessibilitySettings>(
    'airaware2_accessibility',
    DEFAULT_ACCESSIBILITY,
    AccessibilityStorageSchema
  );
  const [currentLocation, setCurrentLocation] = useLocalStorageState<GeoLocation>(
    'airaware2_current_location',
    DEFAULT_LOCATION,
    GeoLocationSchema
  );
  const [savedLocations, setSavedLocations] = useLocalStorageState<GeoLocation[]>(
    'airaware2_saved_locations',
    DEFAULT_SAVED_LOCATIONS,
    SavedLocationsSchema
  );
  const [profiles, setProfiles] = useLocalStorageState<FamilyProfile[]>(
    'airaware2_profiles',
    [...DEFAULT_FAMILY_PROFILES],
    FamilyProfilesSchema
  );
  const [activeProfileId, setActiveProfileId] = useLocalStorageState<string>(
    'airaware2_active_profile',
    DEFAULT_FAMILY_PROFILES[0]!.id,
    z.string().min(1)
  );
  const [interests, setInterests] = useLocalStorageState<EnvironmentalInterest[]>(
    'airaware2_interests',
    DEFAULT_INTERESTS,
    InterestsSchema
  );
  const [indoorSetup, setIndoorSetup] = useLocalStorageState<IndoorEnvironmentSetup>(
    'airaware2_indoor_setup',
    DEFAULT_INDOOR_SETUP,
    IndoorSetupStorageSchema
  );
  const [onboardingCompleted, setOnboardingCompleted] = useLocalStorageState<boolean>(
    'airaware2_onboarding_done',
    false,
    BooleanSchema
  );

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<AirSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [geolocationStatus, setGeolocationStatus] = useState<string | null>(null);

  const t = useMemo(() => getTranslations(language), [language]);

  const activeProfile = useMemo(
    () =>
      profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? DEFAULT_FAMILY_PROFILES[0]!,
    [profiles, activeProfileId]
  );

  // Sync HTML attributes for WCAG language & accessible display tokens
  useEffect(() => {
    const html = document.documentElement;
    html.lang = language;
    html.dataset.textSize = accessibility.fontSize;
    html.dataset.contrast = accessibility.highContrast ? 'high' : 'normal';
    html.dataset.reducedMotion = accessibility.reducedMotion ? 'true' : 'false';
  }, [language, accessibility]);

  // Fetch environmental snapshot whenever location or manual refresh changes
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function load() {
      const force = refreshTick > 0;
      try {
        const params = new URLSearchParams({
          lat: String(currentLocation.latitude),
          lon: String(currentLocation.longitude),
          name: currentLocation.name,
          timezone: currentLocation.timezone || 'auto',
          ...(force ? { refresh: 'true' } : {}),
        });
        const res = await fetch(`/api/air?${params.toString()}`, { signal: controller.signal });
        const json = (await res.json()) as ApiResponse<AirSnapshot>;
        if (!mounted) return;

        if (json.success && json.data) {
          setSnapshot(json.data);
          setError(null);
        } else {
          setError(json.error?.message ?? 'Unable to load verified environmental data.');
        }
      } catch (err: unknown) {
        if (!mounted || (err instanceof Error && err.name === 'AbortError')) return;
        setError(err instanceof Error ? err.message : 'Network error loading environmental data.');
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [currentLocation, refreshTick]);

  const selectLocation = useCallback(
    (loc: GeoLocation) => {
      setIsLoading(true);
      setError(null);
      setCurrentLocation(loc);
    },
    [setCurrentLocation]
  );

  const addSavedLocation = useCallback(
    (loc: GeoLocation) => {
      const exists = savedLocations.some(
        (item) =>
          item.name.toLowerCase() === loc.name.toLowerCase() &&
          Math.abs(item.latitude - loc.latitude) < 0.05
      );
      if (!exists) {
        setSavedLocations([...savedLocations.slice(0, 7), loc]);
      }
    },
    [savedLocations, setSavedLocations]
  );

  const removeSavedLocation = useCallback(
    (id: number, name: string) => {
      if (savedLocations.length <= 1) return;
      setSavedLocations(savedLocations.filter((l) => !(l.id === id && l.name === name)));
    },
    [savedLocations, setSavedLocations]
  );

  const refreshSnapshot = useCallback(() => {
    setIsRefreshing(true);
    setError(null);
    setRefreshTick((n) => n + 1);
  }, []);

  const requestBrowserGeolocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeolocationStatus(t.common.locationDenied);
      return;
    }
    setGeolocationStatus(t.common.geolocating);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto';
        const geoLoc: GeoLocation = {
          id: Math.round(Math.abs(lat * 1000 + lon * 100)),
          name: `My Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
          latitude: lat,
          longitude: lon,
          country: 'Browser Geolocation',
          timezone: tz,
          countryCode: 'GPS',
        };
        setGeolocationStatus(null);
        selectLocation(geoLoc);
      },
      () => {
        setGeolocationStatus(t.common.locationDenied);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  }, [selectLocation, t.common.geolocating, t.common.locationDenied]);

  const resetAllLocalData = useCallback(() => {
    setLanguage('en');
    setAccessibility(DEFAULT_ACCESSIBILITY);
    setCurrentLocation(DEFAULT_LOCATION);
    setSavedLocations(DEFAULT_SAVED_LOCATIONS);
    setProfiles([...DEFAULT_FAMILY_PROFILES]);
    setActiveProfileId(DEFAULT_FAMILY_PROFILES[0]!.id);
    setInterests(DEFAULT_INTERESTS);
    setIndoorSetup(DEFAULT_INDOOR_SETUP);
    setOnboardingCompleted(false);
    setIsOnboardingOpen(false);
  }, [
    setAccessibility,
    setActiveProfileId,
    setCurrentLocation,
    setIndoorSetup,
    setInterests,
    setLanguage,
    setOnboardingCompleted,
    setProfiles,
    setSavedLocations,
  ]);

  const value: EnvironmentContextValue = {
    language,
    setLanguage,
    t,
    accessibility,
    setAccessibility,
    currentLocation,
    selectLocation,
    savedLocations,
    addSavedLocation,
    removeSavedLocation,
    profiles,
    setProfiles,
    activeProfile,
    setActiveProfileId,
    interests,
    setInterests,
    indoorSetup,
    setIndoorSetup,
    onboardingCompleted,
    setOnboardingCompleted,
    isOnboardingOpen,
    setIsOnboardingOpen,
    snapshot,
    isLoading,
    isRefreshing,
    error,
    geolocationStatus,
    requestBrowserGeolocation,
    refreshSnapshot,
    resetAllLocalData,
  };

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}

export function useEnvironment(): EnvironmentContextValue {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) {
    throw new Error('useEnvironment must be used within EnvironmentProvider');
  }
  return ctx;
}
