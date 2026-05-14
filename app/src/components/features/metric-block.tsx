import { Skeleton } from '@/components/ui/skeleton';

export interface MetricBlockProps {
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}

export function MetricBlock({ label, value, sub, loading }: MetricBlockProps) {
  return (
    <div className="flex flex-col gap-1 py-3 px-1 sm:px-6 sm:py-4">
      <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
      {loading ? (
        <div className="flex flex-col gap-1.5 mt-1">
          <Skeleton className="h-7 w-24" />
          {sub && <Skeleton className="h-3 w-16" />}
        </div>
      ) : (
        <div className="mt-1">
          <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{sub}</p>}
        </div>
      )}
    </div>
  );
}
