'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BookOpen,
  CalendarClock,
  Compass,
  Home,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { Language } from '@/types';
import { LocationSearchBar } from './LocationSearchBar';
import { OnboardingModal } from './OnboardingModal';

interface NavItem {
  href: string;
  key: keyof ReturnType<typeof useEnvironment>['t']['nav'];
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', key: 'overview', icon: LayoutDashboard },
  { href: '/live', key: 'live', icon: Activity },
  { href: '/explore', key: 'explore', icon: MapIcon },
  { href: '/forecast', key: 'forecast', icon: TrendingUp },
  { href: '/exposure', key: 'exposure', icon: Users },
  { href: '/planner', key: 'planner', icon: CalendarClock },
  { href: '/indoor', key: 'indoor', icon: Home },
  { href: '/assistant', key: 'assistant', icon: MessageSquare },
  { href: '/learn', key: 'learn', icon: BookOpen },
  { href: '/settings', key: 'settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, setLanguage, t, setIsOnboardingOpen, onboardingCompleted } = useEnvironment();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-800 focus:text-white focus:rounded-xl focus:font-semibold"
      >
        {t.nav.skipToMain}
      </a>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t.nav.openMenu}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <div
                aria-hidden="true"
                className="w-9 h-9 rounded-xl bg-teal-700 text-white font-black text-sm flex items-center justify-center shrink-0"
              >
                A2
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                    {t.brand.name}
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                    {t.brand.scaleBadge}
                  </span>
                </div>
                <p className="hidden md:block text-[11px] text-slate-600 truncate">
                  {t.brand.tagline}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label="Language"
              className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200"
            >
              {(
                [
                  { code: 'en', label: 'EN' },
                  { code: 'ta', label: 'தமிழ்' },
                  { code: 'hi', label: 'हिन्दी' },
                ] as Array<{ code: Language; label: string }>
              ).map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  aria-pressed={language === lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    language === lang.code
                      ? 'bg-white text-teal-800 shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>{t.onboarding.reopenBtn}</span>
            </button>

            <Link
              href="/settings"
              aria-label={t.nav.settings}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Responsive Shell */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex">
        {/* Desktop Sidebar */}
        <aside
          aria-label="Primary navigation"
          className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-200 bg-white px-3 py-5 gap-1"
        >
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-900 border border-teal-200'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t.nav[item.key]}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="fixed inset-0 z-50 lg:hidden flex"
          >
            <div
              className="fixed inset-0 bg-slate-950/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full p-4 flex flex-col border-r border-slate-200 shadow-xl overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <span className="font-bold text-sm text-slate-900">{t.brand.name}</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={t.nav.closeMenu}
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                        isActive
                          ? 'bg-teal-50 text-teal-900 border border-teal-200'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t.nav[item.key]}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Workspace Column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 space-y-6">
            {!onboardingCompleted && pathname === '/' && (
              <section
                aria-label={t.onboarding.title}
                className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-bold text-teal-950">{t.onboarding.title}</p>
                  <p className="text-teal-900">{t.onboarding.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardingOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  {t.onboarding.reopenBtn}
                </button>
              </section>
            )}

            <section aria-label="Location controls">
              <LocationSearchBar />
            </section>

            {children}
          </main>

          <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-4 text-[11px] text-slate-600">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p>{t.brand.attributionFooter}</p>
              <span className="font-mono text-slate-500 shrink-0">CPCB 2014 • Open-Meteo CAMS</span>
            </div>
          </footer>
        </div>
      </div>

      <OnboardingModal />
    </div>
  );
}
