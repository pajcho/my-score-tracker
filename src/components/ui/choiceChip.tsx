import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ChoiceChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  children: ReactNode;
}

/**
 * 44px pill for tap-first form inputs (dates, opponents, durations) —
 * the form-sized sibling of the smaller FilterChip used in list filters.
 */
export const ChoiceChip = forwardRef<HTMLButtonElement, ChoiceChipProps>(
  ({ active, children, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      className={cn(
        'flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors active:scale-[0.97]',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
ChoiceChip.displayName = 'ChoiceChip';
