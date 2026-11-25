import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import { EnvironmentProvider } from '@/hooks/useEnvironmentContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AirAware AI 2.0 — Urban Air Quality Intelligence Platform',
  description:
    'Understand Your Air. Predict Your Exposure. Make Better Decisions. Scientifically grounded CPCB India NAQI intelligence powered by Copernicus CAMS & Google Gemini.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="font-sans">
        <EnvironmentProvider>
          <AppShell>{children}</AppShell>
        </EnvironmentProvider>
      </body>
    </html>
  );
}
