'use client';

/** Relative micron scale SVG illustrating human hair vs PM10 vs PM2.5. */
export function ParticleScaleDiagram({ title }: { title: string }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <svg
        viewBox="0 0 640 130"
        role="img"
        aria-label="Scale comparison showing a 70 micrometer human hair next to a 10 micrometer PM10 particle and a 2.5 micrometer PM2.5 particle"
        className="w-full max-w-2xl h-32"
      >
        <circle cx="95" cy="65" r="52" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
        <text x="95" y="68" textAnchor="middle" className="fill-slate-900 text-xs font-bold">
          Hair ~70 µm
        </text>

        <circle cx="320" cy="65" r="18" fill="#f59e0b" stroke="#92400e" strokeWidth="1.5" />
        <text x="320" y="108" textAnchor="middle" className="fill-slate-900 text-xs font-bold">
          PM₁₀ (≤10 µm)
        </text>

        <circle cx="515" cy="65" r="6" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
        <text x="515" y="108" textAnchor="middle" className="fill-slate-900 text-xs font-bold">
          PM₂.₅ (≤2.5 µm)
        </text>
      </svg>
    </section>
  );
}
