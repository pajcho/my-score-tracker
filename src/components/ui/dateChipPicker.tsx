import { useState } from 'react';
import { format, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ChoiceChip } from '@/components/ui/choiceChip';

interface DateChipPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

/**
 * Date entry as chips: Today · Yesterday · Pick date… The calendar only
 * appears on demand — backfilled games are almost always from today or
 * last night.
 */
export function DateChipPicker({ value, onChange }: DateChipPickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const todayActive = isToday(value);
  const yesterdayActive = isYesterday(value);
  const customActive = !todayActive && !yesterdayActive;

  return (
    <div className="flex flex-wrap gap-2">
      <ChoiceChip active={todayActive} onClick={() => onChange(startOfDay(new Date()))}>
        Today
      </ChoiceChip>
      <ChoiceChip active={yesterdayActive} onClick={() => onChange(startOfDay(subDays(new Date(), 1)))}>
        Yesterday
      </ChoiceChip>
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <ChoiceChip active={customActive}>
            <CalendarIcon className="h-4 w-4" />
            {customActive ? format(value, 'MMM d, yyyy') : 'Pick date…'}
          </ChoiceChip>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={value}
            onSelect={(nextDate) => {
              if (!nextDate) return;
              onChange(nextDate);
              setIsCalendarOpen(false);
            }}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
