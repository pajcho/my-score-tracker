import { ReactElement, ReactNode, cloneElement, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useHasHover } from '@/hooks/useHasHover';
import { cn } from '@/lib/utils';

interface ChartHintProps {
  /** The detail shown in the floating hint. */
  content: ReactNode;
  /** The trigger mark (a heatmap cell / recent-form pill button). */
  children: ReactElement;
  className?: string;
}

/**
 * A hover-or-tap detail hint shared by the chart marks (heatmap cells and
 * recent-form pills). On pointer devices it opens on hover and closes when
 * the pointer leaves; on touch devices it opens on tap. Either way it also
 * closes on a tap/click outside or Escape (handled by Radix).
 */
export function ChartHint({ content, children, className }: ChartHintProps) {
  const hasHover = useHasHover();
  const [open, setOpen] = useState(false);

  // Wire hover only on pointer devices. Touch devices keep Radix's default
  // tap-to-open / tap-outside-to-close, so hover handlers stay off there.
  const trigger = hasHover
    ? cloneElement(children, {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
      })
    : children;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        // These marks are read-only hints, not dialogs: don't pull focus in
        // on open, and — crucially for the hover path — don't push focus back
        // onto the trigger on close, which would leave a lingering focus ring.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className={cn('w-auto max-w-56 px-3 py-2 text-xs', className)}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
