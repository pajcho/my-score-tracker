import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface StepResultEntryProps {
  playerName: string;
  opponentName: string;
  date: Date;
  setDate: (date: Date) => void;
  yourScore: string;
  setYourScore: (score: string) => void;
  opponentScore: string;
  setOpponentScore: (score: string) => void;
}

export function StepResultEntry({
  playerName,
  opponentName,
  date,
  setDate,
  yourScore,
  setYourScore,
  opponentScore,
  setOpponentScore,
}: StepResultEntryProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base mb-3 block">When did you play?</Label>
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {format(date, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  setDate(newDate);
                  setDatePopoverOpen(false);
                }
              }}
              disabled={(date) =>
                date > new Date() || date < new Date('1900-01-01')
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label className="text-base mb-3 block">What were the final scores?</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              {playerName}
            </Label>
            <Input
              type="number"
              min="0"
              value={yourScore}
              onChange={(e) => setYourScore(e.target.value)}
              placeholder="Your score"
              className="text-lg font-semibold text-center"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              {opponentName}
            </Label>
            <Input
              type="number"
              min="0"
              value={opponentScore}
              onChange={(e) => setOpponentScore(e.target.value)}
              placeholder="Opponent score"
              className="text-lg font-semibold text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
