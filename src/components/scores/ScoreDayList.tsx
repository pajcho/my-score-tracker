import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, ChevronRight, Pencil, Trash2 } from 'lucide-react';
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

type ScoreWithFriend = Score & { friend_name?: string | null };
type ScoreResult = 'win' | 'loss' | 'tie';

interface ScoreDayListProps {
  scores: ScoreWithFriend[];
  currentUserId: string | undefined;
  onScoreUpdated: () => void;
}

const DAY_GROUPS_PAGE_SIZE = 10;

function getScoreResult(scoreString: string, isCreator: boolean): ScoreResult {
  const [score1, score2] = scoreString.split('-').map(Number);
  const userScore = isCreator ? score1 : score2;
  const opponentScore = isCreator ? score2 : score1;
  if (userScore > opponentScore) return 'win';
  if (userScore < opponentScore) return 'loss';
  return 'tie';
}

function getOpponentDisplayName(score: ScoreWithFriend): string {
  return score.friend_name || score.opponent_name || 'Unknown';
}

/** Score as the current user reads it: their points first. */
function getPerspectiveScore(score: ScoreWithFriend, isOwnScore: boolean): string {
  const [score1, score2] = score.score.split('-');
  return isOwnScore ? `${score1}–${score2}` : `${score2}–${score1}`;
}

interface DayGroup {
  date: string;
  scores: ScoreWithFriend[];
}

function groupScoresByDay(scores: ScoreWithFriend[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const indexByDate = new Map<string, number>();
  for (const score of scores) {
    let groupIndex = indexByDate.get(score.date);
    if (groupIndex === undefined) {
      groupIndex = groups.length;
      indexByDate.set(score.date, groupIndex);
      groups.push({ date: score.date, scores: [] });
    }
    groups[groupIndex].scores.push(score);
  }
  return groups;
}

/** "You 3–1 Marko" when the whole evening was one opponent, else "3W · 1L". */
function getDayTally(dayScores: ScoreWithFriend[], currentUserId: string | undefined): string {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  const opponents = new Set<string>();

  for (const score of dayScores) {
    const isOwnScore = score.user_id === currentUserId;
    const result = getScoreResult(score.score, isOwnScore);
    if (result === 'win') wins += 1;
    else if (result === 'loss') losses += 1;
    else ties += 1;
    opponents.add(getOpponentDisplayName(score));
  }

  if (opponents.size === 1) {
    const firstName = [...opponents][0].split(' ')[0];
    return `You ${wins}–${losses} ${firstName}`;
  }

  return [`${wins}W`, `${losses}L`, ...(ties > 0 ? [`${ties}T`] : [])].join(' · ');
}

const resultStripeStyles: Record<ScoreResult, string> = {
  win: 'bg-secondary',
  loss: 'bg-destructive',
  tie: 'bg-accent',
};

const resultScoreStyles: Record<ScoreResult, string> = {
  win: 'text-secondary',
  loss: 'text-destructive',
  tie: 'text-accent',
};

/**
 * Day-grouped compact score history. Each evening gets a header with its
 * tally; rows are one line each and open a detail sheet with edit/delete.
 * Day groups render incrementally as the list scrolls.
 */
export function ScoreDayList({ scores, currentUserId, onScoreUpdated }: ScoreDayListProps) {
  const [selectedScore, setSelectedScore] = useState<ScoreWithFriend | null>(null);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const dayGroups = groupScoresByDay(scores);
  // Pagination resets whenever the incoming (already filtered) list changes
  // identity in length — tracked via render-time key comparison, no effects.
  const [pagination, setPagination] = useState({ key: '', count: DAY_GROUPS_PAGE_SIZE });
  const paginationKey = `${scores.length}:${scores[0]?.id ?? ''}`;
  const visibleDayCount = pagination.key === paginationKey ? pagination.count : DAY_GROUPS_PAGE_SIZE;
  const visibleGroups = dayGroups.slice(0, visibleDayCount);
  const hasMore = dayGroups.length > visibleDayCount;

  const showMoreRef = useRef(() => undefined as void);
  showMoreRef.current = () => {
    setPagination({ key: paginationKey, count: visibleDayCount + DAY_GROUPS_PAGE_SIZE });
  };

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

  const handleDelete = async (scoreId: string) => {
    setIsDeleting(true);
    try {
      await supabaseDb.deleteScore(scoreId);
      await invalidateTrackerQueries({ scores: true, opponents: true });
      toast({
        title: 'Score deleted',
        description: 'The score has been removed from your history',
      });
      setSelectedScore(null);
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

  const selectedIsOwn = !!selectedScore && selectedScore.user_id === currentUserId;
  const selectedResult = selectedScore
    ? getScoreResult(selectedScore.score, selectedIsOwn)
    : null;

  return (
    <div className="space-y-5">
      {visibleGroups.map((group) => (
        <section key={group.date} aria-label={format(new Date(group.date), 'MMMM d, yyyy')}>
          <div className="flex items-baseline justify-between px-1 pb-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {format(new Date(group.date), 'EEE · MMM d, yyyy')}
            </span>
            <span className="text-xs font-semibold text-primary">
              {getDayTally(group.scores, currentUserId)}
            </span>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {group.scores.map((score) => {
              const isOwnScore = score.user_id === currentUserId;
              const result = getScoreResult(score.score, isOwnScore);
              const opponentName = getOpponentDisplayName(score);
              return (
                <button
                  key={score.id}
                  type="button"
                  onClick={() => setSelectedScore(score)}
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <span className={cn('h-9 w-1 shrink-0 rounded-full', resultStripeStyles[result])} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {isOwnScore ? `vs ${opponentName}` : `${opponentName} vs You`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {getGameTypeLabel(score.game)}
                      {isPoolGameType(score.game)
                        ? ` · ${getPoolTypeLabel(score.pool_settings?.pool_type || DEFAULT_POOL_TYPE)}`
                        : ''}
                    </span>
                  </span>
                  <span className={cn('shrink-0 text-base font-bold tabular-nums', resultScoreStyles[result])}>
                    {getPerspectiveScore(score, isOwnScore)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {hasMore && <div ref={sentinelRef} data-testid="history-load-more" className="h-1" />}

      <ResponsiveFormModal
        open={!!selectedScore}
        onOpenChange={(open) => !open && setSelectedScore(null)}
        title="Game details"
        height="fit"
      >
        {selectedScore && selectedResult && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-5 sm:px-5">
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <Badge
                  variant="outline"
                  className={cn(
                    'h-6 rounded-sm border bg-transparent px-2.5 text-[11px] font-semibold tracking-wide',
                    selectedResult === 'win' && 'border-secondary/70 bg-secondary/10 text-secondary',
                    selectedResult === 'loss' && 'border-destructive/70 bg-destructive/10 text-destructive',
                    selectedResult === 'tie' && 'border-accent/70 bg-accent/10 text-accent'
                  )}
                >
                  {selectedResult === 'win' ? 'WIN' : selectedResult === 'loss' ? 'LOSS' : 'TIE'}
                </Badge>
                <div className={cn('text-5xl font-bold tabular-nums', resultScoreStyles[selectedResult])}>
                  {getPerspectiveScore(selectedScore, selectedIsOwn)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedIsOwn
                    ? `You vs ${getOpponentDisplayName(selectedScore)}`
                    : `${getOpponentDisplayName(selectedScore)} vs You`}
                </div>
              </div>

              <div className="divide-y divide-border rounded-xl border border-border">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Game</span>
                  <span className="flex items-center gap-2 font-medium">
                    {isPoolGameType(selectedScore.game) ? (
                      <PoolTypeIcon
                        poolType={selectedScore.pool_settings?.pool_type || DEFAULT_POOL_TYPE}
                        className="h-4 w-4"
                      />
                    ) : (
                      <GameTypeIcon gameType={selectedScore.game} className="h-4 w-4" />
                    )}
                    {getGameTypeLabel(selectedScore.game)}
                    {isPoolGameType(selectedScore.game)
                      ? ` · ${getPoolTypeLabel(selectedScore.pool_settings?.pool_type || DEFAULT_POOL_TYPE)}`
                      : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Date
                  </span>
                  <span className="font-medium">{format(new Date(selectedScore.date), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {selectedIsOwn && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 gap-2"
                    onClick={() => {
                      setEditingScore(selectedScore);
                      setSelectedScore(null);
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
                          onClick={() => void handleDelete(selectedScore.id)}
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
    </div>
  );
}
