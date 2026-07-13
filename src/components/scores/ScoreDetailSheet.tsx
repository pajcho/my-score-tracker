import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { ScoreEditDialog } from '@/components/scores/ScoreEditDialog';
import { GameTypeIcon, PoolTypeIcon } from '@/components/ui/gameTypeIcon';
import { useToast } from '@/hooks/useToast';
import { supabaseDb, Score } from '@/lib/supabaseDatabase';
import { invalidateTrackerQueries } from '@/lib/queryCache';
import { DEFAULT_POOL_TYPE, getGameTypeLabel, getPoolTypeLabel, isPoolGameType } from '@/lib/gameTypes';
import { cn } from '@/lib/utils';
import {
  getOpponentDisplayName,
  getPerspectiveScore,
  getScoreResult,
  resultScoreStyles,
  type ScoreWithFriend,
} from '@/components/scores/scoreDisplay';

interface ScoreDetailSheetProps {
  score: ScoreWithFriend | null;
  currentUserId: string | undefined;
  onClose: () => void;
  onScoreUpdated: () => void;
}

/**
 * Bottom sheet with a finished game's full detail — result, score, game,
 * date — plus Edit/Delete for the user's own games. Shared by the History
 * day list and the Statistics best/worst drill-downs.
 */
export function ScoreDetailSheet({ score, currentUserId, onClose, onScoreUpdated }: ScoreDetailSheetProps) {
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const isOwnScore = !!score && score.user_id === currentUserId;
  const result = score ? getScoreResult(score.score, isOwnScore) : null;

  const handleDelete = async (scoreId: string) => {
    setIsDeleting(true);
    try {
      await supabaseDb.deleteScore(scoreId);
      await invalidateTrackerQueries({ scores: true, opponents: true });
      toast({
        title: 'Score deleted',
        description: 'The score has been removed from your history',
      });
      onClose();
      onScoreUpdated();
    } catch (error) {
      toast({
        title: 'Failed to delete score',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ResponsiveFormModal
        open={!!score}
        onOpenChange={(open) => !open && onClose()}
        title="Game details"
        height="fit"
      >
        {score && result && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-5 sm:px-5">
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <Badge
                  variant="outline"
                  className={cn(
                    'h-6 rounded-sm border bg-transparent px-2.5 text-[11px] font-semibold tracking-wide',
                    result === 'win' && 'border-secondary/70 bg-secondary/10 text-secondary',
                    result === 'loss' && 'border-destructive/70 bg-destructive/10 text-destructive',
                    result === 'tie' && 'border-accent/70 bg-accent/10 text-accent'
                  )}
                >
                  {result === 'win' ? 'WIN' : result === 'loss' ? 'LOSS' : 'TIE'}
                </Badge>
                <div className={cn('text-5xl font-bold tabular-nums', resultScoreStyles[result])}>
                  {getPerspectiveScore(score, isOwnScore)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isOwnScore
                    ? `You vs ${getOpponentDisplayName(score)}`
                    : `${getOpponentDisplayName(score)} vs You`}
                </div>
              </div>

              <div className="divide-y divide-border rounded-xl border border-border">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Game</span>
                  <span className="flex items-center gap-2 font-medium">
                    {isPoolGameType(score.game) ? (
                      <PoolTypeIcon
                        poolType={score.pool_settings?.pool_type || DEFAULT_POOL_TYPE}
                        className="h-4 w-4"
                      />
                    ) : (
                      <GameTypeIcon gameType={score.game} className="h-4 w-4" />
                    )}
                    {getGameTypeLabel(score.game)}
                    {isPoolGameType(score.game)
                      ? ` · ${getPoolTypeLabel(score.pool_settings?.pool_type || DEFAULT_POOL_TYPE)}`
                      : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Date
                  </span>
                  <span className="font-medium">{format(new Date(score.date), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {isOwnScore && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 gap-2"
                    onClick={() => {
                      setEditingScore(score);
                      onClose();
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
                        <AlertDialogTitle>Delete Score</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this score? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row justify-end gap-2 space-x-0">
                        <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleDelete(score.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        )}
      </ResponsiveFormModal>

      <ScoreEditDialog
        score={editingScore}
        open={!!editingScore}
        onOpenChange={(open) => !open && setEditingScore(null)}
        onSuccess={onScoreUpdated}
      />
    </>
  );
}
