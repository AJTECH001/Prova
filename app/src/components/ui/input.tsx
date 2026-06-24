import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm bg-[var(--color-bg-page)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-[var(--color-error)]' : 'border-[var(--color-border-default)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export { Input };
