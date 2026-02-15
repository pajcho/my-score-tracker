import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggleGroup';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_GAME_TYPE, GAME_TYPE_OPTIONS, type GameType } from '@/lib/gameTypes';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { supabaseDb, Training } from '@/lib/supabaseDatabase';
import { GameTypeIcon } from '@/components/ui/gameTypeIcon';
import { cn } from '@/lib/utils';
import { invalidateTrackerQueries } from '@/lib/queryCache';
import { ResponsiveFormModal } from '@/components/ui/responsiveFormModal';

const toggleOptionClassName =
  'h-10 justify-start rounded-md px-3 text-foreground hover:bg-muted/60 hover:text-foreground dark:bg-muted/40 dark:hover:bg-muted/55 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground data-[state=on]:shadow-none dark:data-[state=on]:bg-muted/65';
const quickDurationOptions = [30, 60, 90];

interface TrainingEditDialogProps {
  training: Training | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TrainingEditDialog({ training, open, onOpenChange, onSuccess }: TrainingEditDialogProps) {
  const [game, setGame] = useState<GameType>(training?.game || DEFAULT_GAME_TYPE);
  const [title, setTitle] = useState(training?.title || '');
  const [trainingDate, setTrainingDate] = useState<Date>(training?.training_date ? new Date(training.training_date) : new Date());
  const [notes, setNotes] = useState(training?.notes || '');
  const [durationMinutes, setDurationMinutes] = useState(training?.duration_minutes ? String(training.duration_minutes) : '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!training) return;
    setGame(training.game);
    setTitle(training.title);
    setTrainingDate(new Date(training.training_date));
    setNotes(training.notes || '');
    setDurationMinutes(String(training.duration_minutes));
  }, [training]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!training) return;

    const parsedDurationMinutes = Number(durationMinutes);
    const normalizedTitle = title.trim() || 'Training';

    if (!durationMinutes) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!Number.isInteger(parsedDurationMinutes) || parsedDurationMinutes <= 0) {
      toast({
        title: 'Invalid duration',
        description: 'Total training duration must be a positive number of minutes',
        variant: 'destructive',
      });
      return;
    }

    if (!supabaseAuth.isAuthenticated()) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to edit trainings.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await supabaseDb.updateTraining(training.id, {
        game,
        title: normalizedTitle,
        training_date: format(trainingDate, 'yyyy-MM-dd'),
        duration_minutes: parsedDurationMinutes,
        notes: notes.trim() || null,
      });
      await invalidateTrackerQueries({
        trainings: true,
      });

      toast({
        title: 'Training updated!',
        description: `${normalizedTitle} (${parsedDurationMinutes} min)`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: 'Failed to update training',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Game Type *</Label>
            <ToggleGroup
              type="single"
              value={game}
              onValueChange={(value) => {
                if (!value) return;
                setGame(value as GameType);
              }}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {GAME_TYPE_OPTIONS.map(({ value, label }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  variant="outline"
                  className={toggleOptionClassName}
                >
                  <GameTypeIcon gameType={value} className="mr-2 h-4 w-4" />
                  {label}
                  <span
                    className={`ml-auto h-2.5 w-2.5 rounded-full border ${game === value ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
                  />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label>Training Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal dark:bg-muted/40 dark:hover:bg-muted/55',
                    !trainingDate && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {trainingDate ? format(trainingDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={trainingDate}
                  onSelect={(nextDate) => nextDate && setTrainingDate(nextDate)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-training-duration">Total Duration (minutes) *</Label>
            <Input
              id="edit-training-duration"
              type="number"
              inputMode="numeric"
              min={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Quick fill:</span>
              {quickDurationOptions.map((minutes) => (
                <a
                  key={minutes}
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setDurationMinutes(String(minutes));
                  }}
                  className="underline-offset-2 hover:text-foreground hover:underline"
                >
                  {minutes}m
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-training-title">Training Name</Label>
            <Input
              id="edit-training-title"
              type="text"
              placeholder="Optional training name"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-training-notes">Notes</Label>
          <Textarea
            id="edit-training-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes about what you practiced and how it went"
          />
        </div>
      </div>

      <div className="mt-2 flex flex-row gap-3 border-t px-4 pt-3">
        <Button type="submit" disabled={isLoading} className="flex-1">
          <Save className="h-4 w-4" />
          {isLoading ? 'Updating...' : 'Update Training'}
        </Button>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <ResponsiveFormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Training"
    >
      {formContent}
    </ResponsiveFormModal>
  );
}
