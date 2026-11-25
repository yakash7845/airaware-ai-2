'use client';

import dynamic from 'next/dynamic';
import { ComparedLocationSnapshot } from '@/types';

const LazyPollutionMap = dynamic(() => import('./PollutionMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] sm:h-[420px] rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-600">
      Loading interactive map...
    </div>
  ),
});

export function DynamicPollutionMap(props: {
  locations: readonly ComparedLocationSnapshot[];
  selectedName: string;
  onSelectLocation: (loc: ComparedLocationSnapshot) => void;
}) {
  return <LazyPollutionMap {...props} />;
}
