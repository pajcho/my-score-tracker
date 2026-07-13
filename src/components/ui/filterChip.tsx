import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Pill-shaped filter toggle used in the sticky filter rows on History and
 * Statistics. One tap selects, tapping the active chip deselects (handled
 * by the caller).
 */
export function FilterChip({ label, active, onClick, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors active:scale-[0.97]',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {label}
    </button>
  );
}
