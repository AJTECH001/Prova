import { Skeleton } from '@/components/ui/skeleton';

export interface MetricBlockProps {
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}

export function MetricBlock({ label, value, sub, loading }: MetricBlockProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] sm:text-xs">{label}</p>
      )}
      {loading ? (
        <div className="flex flex-col gap-1.5 mt-1">
          <Skeleton className="h-6 w-24 sm:h-7 sm:w-28" />
          {sub && <Skeleton className="h-3 w-16" />}
        </div>
      ) : (
        <div className="mt-1">
          <p className="text-lg font-bold tracking-tight text-[var(--text-primary)] tabular-nums leading-tight sm:text-2xl">{value}</p>
          {sub && <p className="mt-0.5 text-[10px] text-[var(--text-muted)] sm:text-xs">{sub}</p>}
        </div>
      )}
    </div>
  );
}
