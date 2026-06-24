import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
      warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
      error: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
      info: 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]',
      default: 'bg-[var(--color-bg-section)] text-[var(--color-text-secondary)]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  className?: string;
  children: ReactNode;
}

function Badge({ variant, className, children }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))}>{children}</span>;
}

export { Badge, badgeVariants };
