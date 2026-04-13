const STATS = [
  { value: '$120M+', label: 'Protocol Capacity' },
  { value: '4.2M',   label: 'Policies Issued' },
  { value: '0.05s',  label: 'Settlement Time' },
  { value: '99.9%',  label: 'Uptime' },
];

export function StatsBar() {
  return (
    <div className="border-y border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface-alt))]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 divide-x divide-y divide-[hsl(var(--border-subtle))] md:grid-cols-4 md:divide-y-0">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-6 text-center">
              <span className="text-2xl font-black text-[hsl(var(--text-primary))]">{s.value}</span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-[hsl(var(--text-muted))]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
