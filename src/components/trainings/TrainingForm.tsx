import { useState } from 'react';
import { format } from 'date-fns';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SegmentedControl } from '@/components/ui/segmentedControl';
import { DateChipPicker } from '@/components/ui/dateChipPicker';
import { DurationField } from '@/components/trainings/DurationField';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_GAME_TYPE, GAME_TYPE_OPTIONS, type GameType } from '@/lib/gameTypes';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { supabaseDb } from '@/lib/supabaseDatabase';
import { GameTypeIcon } from '@/components/ui/gameTypeIcon';
import { invalidateTrackerQueries } from '@/lib/queryCache';

interface TrainingFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function TrainingForm({ onCancel, onSuccess }: TrainingFormProps) {
  const [game, setGame] = useState<GameType>(DEFAULT_GAME_TYPE);
  const [title, setTitle] = useState('');
  const [trainingDate, setTrainingDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedTitle = title.trim() || 'Training';

    if (durationMinutes <= 0) {
      toast({
        title: 'Missing information',
        description: 'Set the training duration before saving',
        variant: 'destructive',
      });
      return;
    }

    if (!supabaseAuth.isAuthenticated()) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to save trainings.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await supabaseDb.createTraining(
        game,
        normalizedTitle,
        format(trainingDate, 'yyyy-MM-dd'),
        durationMinutes,
        notes
      );
      await invalidateTrackerQueries({
        trainings: true,
      });

      toast({
        title: 'Training added!',
        description: `${normalizedTitle} (${durationMinutes} min)`,
      });

      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: 'Failed to save training',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Pinned footer, same treatment as the wizard and score form: only the
    // fields scroll, the actions stay under the thumb.
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        <div className="space-y-2">
          <Label>Game *</Label>
          <SegmentedControl
            aria-label="Game type"
            value={game}
            onValueChange={setGame}
            options={GAME_TYPE_OPTIONS.map(({ value, label }) => ({
              value,
              label,
              icon: <GameTypeIcon gameType={value} className="h-4 w-4" />,
            }))}
          />
        </div>

        <div className="space-y-2">
          <Label>When *</Label>
          <DateChipPicker value={trainingDate} onChange={setTrainingDate} />
        </div>

        <DurationField value={durationMinutes} onChange={setDurationMinutes} idPrefix="training" />

        <div className="space-y-2">
          <Label htmlFor="training-title">Training Name</Label>
          <Input
            id="training-title"
            type="text"
            placeholder="Optional training name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="training-notes">Notes</Label>
          <Textarea
            id="training-notes"
            placeholder="Optional notes about what you practiced and how it went"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-row gap-3 border-t px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 flex-1">
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || durationMinutes <= 0} className="h-11 flex-1">
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Training'}
        </Button>
      </div>
    </form>
  );
}
