import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperInputProps {
  value: number;
  onValueChange: (value: number) => void;
  /** Accessible name for the whole control, e.g. "Your score". */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/**
 * 44px +/− stepper around a large read-only number. Faster than the
 * keyboard for values that live in 0-9 and can't produce "5e" or an
 * accidentally empty field.
 */
export function StepperInput({
  value,
  onValueChange,
  label,
  min = 0,
  max,
  step = 1,
  className,
}: StepperInputProps) {
  const buttonClassName =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted/60 active:scale-[0.95] disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={value - step < min}
        onClick={() => onValueChange(Math.max(min, value - step))}
        className={buttonClassName}
      >
        <Minus className="h-5 w-5" />
      </button>
      <output aria-label={label} className="flex-1 text-center text-3xl font-bold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={max !== undefined && value + step > max}
        onClick={() => onValueChange(max === undefined ? value + step : Math.min(max, value + step))}
        className={buttonClassName}
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
