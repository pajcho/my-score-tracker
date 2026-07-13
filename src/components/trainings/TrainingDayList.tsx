import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alertDialog';
import { ResponsiveFormModal } from '@/components/ui/responsiveFormModal';
import { TrainingEditDialog } from '@/components/trainings/TrainingEditDialog';
import { GameTypeIcon } from '@/components/ui/gameTypeIcon';
import { useToast } from '@/hooks/useToast';
import { supabaseDb, Training } from '@/lib/supabaseDatabase';
import { invalidateTrackerQueries } from '@/lib/queryCache';
import { getGameTypeLabel } from '@/lib/gameTypes';
import { formatMinutes } from '@/lib/duration';

interface TrainingDayListProps {
  trainings: Training[];
  onTrainingUpdated: () => void;
}

const DAY_GROUPS_PAGE_SIZE = 10;

interface DayGroup {
  date: string;
  trainings: Training[];
}

function groupTrainingsByDay(trainings: Training[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const indexByDate = new Map<string, number>();
  for (const training of trainings) {
    let groupIndex = indexByDate.get(training.training_date);
    if (groupIndex === undefined) {
      groupIndex = groups.length;
      indexByDate.set(training.training_date, groupIndex);
      groups.push({ date: training.training_date, trainings: [] });
    }
    groups[groupIndex].trainings.push(training);
  }
  return groups;
}

/**
 * Day-grouped compact training history, mirroring the score day list: day
 * headers carry the total time trained, rows are one line each and open a
 * detail sheet with edit/delete. Day groups render incrementally.
 */
export function TrainingDayList({ trainings, onTrainingUpdated }: TrainingDayListProps) {
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const dayGroups = groupTrainingsByDay(trainings);
  // Same render-time pagination-reset pattern as ScoreDayList — no effects.
  const [pagination, setPagination] = useState({ key: '', count: DAY_GROUPS_PAGE_SIZE });
  const paginationKey = `${trainings.length}:${trainings[0]?.id ?? ''}`;
  const visibleDayCount = pagination.key === paginationKey ? pagination.count : DAY_GROUPS_PAGE_SIZE;
  const visibleGroups = dayGroups.slice(0, visibleDayCount);
  const hasMore = dayGroups.length > visibleDayCount;

  // Same latest-values-through-a-ref pattern as ScoreDayList.
  const showMoreRef = useRef(() => undefined as void);
  useEffect(() => {
    showMoreRef.current = () => {
      setPagination({ key: paginationKey, count: visibleDayCount + DAY_GROUPS_PAGE_SIZE });
    };
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = (node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          showMoreRef.current();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(node);
    observerRef.current = observer;
  };

  const handleDelete = async (trainingId: string) => {
    setIsDeleting(true);
    try {
      await supabaseDb.deleteTraining(trainingId);
      await invalidateTrackerQueries({ trainings: true });
      toast({
        title: 'Training deleted',
        description: 'The training has been removed from your history',
      });
      setSelectedTraining(null);
      onTrainingUpdated();
    } catch (error) {
      toast({
        title: 'Failed to delete training',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {visibleGroups.map((group) => (
        <section key={group.date} aria-label={format(new Date(group.date), 'MMMM d, yyyy')}>
          <div className="flex items-baseline justify-between px-1 pb-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {format(new Date(group.date), 'EEE · MMM d, yyyy')}
            </span>
            <span className="text-xs font-semibold text-primary">
              {formatMinutes(group.trainings.reduce((sum, training) => sum + training.duration_minutes, 0))} trained
            </span>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {group.trainings.map((training) => (
              <button
                key={training.id}
                type="button"
                onClick={() => setSelectedTraining(training)}
                className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <GameTypeIcon gameType={training.game} className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{training.title}</span>
                  <span className="block text-xs text-muted-foreground">{getGameTypeLabel(training.game)}</span>
                </span>
                <span className="shrink-0 text-base font-bold tabular-nums text-muted-foreground">
                  {training.duration_minutes} min
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ))}

      {hasMore && <div ref={sentinelRef} data-testid="trainings-load-more" className="h-1" />}

      <ResponsiveFormModal
        open={!!selectedTraining}
        onOpenChange={(open) => !open && setSelectedTraining(null)}
        title="Training details"
        height="fit"
      >
        {selectedTraining && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-5 sm:px-5">
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="text-5xl font-bold tabular-nums">{formatMinutes(selectedTraining.duration_minutes)}</div>
                <div className="text-sm text-muted-foreground">{selectedTraining.title}</div>
              </div>

              <div className="divide-y divide-border rounded-xl border border-border">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Game</span>
                  <span className="flex items-center gap-2 font-medium">
                    <GameTypeIcon gameType={selectedTraining.game} className="h-4 w-4" />
                    {getGameTypeLabel(selectedTraining.game)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Date
                  </span>
                  <span className="font-medium">
                    {format(new Date(selectedTraining.training_date), 'MMM d, yyyy')}
                  </span>
                </div>
                {selectedTraining.notes ? (
                  <div className="space-y-1 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="whitespace-pre-wrap font-medium">{selectedTraining.notes}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="h-11 flex-1 gap-2"
                  onClick={() => {
                    setEditingTraining(selectedTraining);
                    setSelectedTraining(null);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isDeleting}
                      className="h-11 flex-1 gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Training</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this training? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row justify-end gap-2 space-x-0">
                      <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleDelete(selectedTraining.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
      </ResponsiveFormModal>

      <TrainingEditDialog
        training={editingTraining}
        open={!!editingTraining}
        onOpenChange={(open) => !open && setEditingTraining(null)}
        onSuccess={onTrainingUpdated}
      />
    </div>
  );
}
