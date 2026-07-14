import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  'aria-label': string;
  className?: string;
}

/**
 * True segmented control for 2-3 exclusive choices: one joined track, the
 * active segment lifted on a card background. Replaces the old
 * radio-dot-inside-outline-button hybrid in the score/training forms.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex gap-1 rounded-lg bg-muted p-1', className)}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-sm font-semibold transition-colors active:scale-[0.98]',
              isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
