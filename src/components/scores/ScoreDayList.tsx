import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { ScoreDetailSheet } from '@/components/scores/ScoreDetailSheet';
import { DEFAULT_POOL_TYPE, getGameTypeLabel, getPoolTypeLabel, isPoolGameType } from '@/lib/gameTypes';
import { cn } from '@/lib/utils';
import {
  getOpponentDisplayName,
  getPerspectiveScore,
  getScoreResult,
  resultScoreStyles,
  resultStripeStyles,
  type ScoreWithFriend,
} from '@/components/scores/scoreDisplay';

interface ScoreDayListProps {
  scores: ScoreWithFriend[];
  currentUserId: string | undefined;
  onScoreUpdated: () => void;
}

const DAY_GROUPS_PAGE_SIZE = 10;

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

/**
 * The evening's headline. One opponent: "You 3–1 Marko". Two or three
 * opponents (the usual pool-night shape): a per-rival tally like
 * "You 2–1 Marko · 1–1 Ana". More than that: an aggregate "3W · 2L".
 */
function getDayTally(dayScores: ScoreWithFriend[], currentUserId: string | undefined): string {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  const tallyByOpponent = new Map<string, { wins: number; losses: number; games: number }>();

  for (const score of dayScores) {
    const isOwnScore = score.user_id === currentUserId;
    const result = getScoreResult(score.score, isOwnScore);
    if (result === 'win') wins += 1;
    else if (result === 'loss') losses += 1;
    else ties += 1;

    const opponentName = getOpponentDisplayName(score);
    const tally = tallyByOpponent.get(opponentName) ?? { wins: 0, losses: 0, games: 0 };
    tally.games += 1;
    if (result === 'win') tally.wins += 1;
    else if (result === 'loss') tally.losses += 1;
    tallyByOpponent.set(opponentName, tally);
  }

  if (tallyByOpponent.size <= 3 && tallyByOpponent.size > 0) {
    const perOpponent = [...tallyByOpponent.entries()]
      .sort((first, second) => second[1].games - first[1].games)
      .map(([name, tally]) => `${tally.wins}–${tally.losses} ${name.split(' ')[0]}`)
      .join(' · ');
    return `You ${perOpponent}`;
  }

  return [`${wins}W`, `${losses}L`, ...(ties > 0 ? [`${ties}T`] : [])].join(' · ');
}

/**
 * Day-grouped compact score history. Each evening gets a header with its
 * tally; rows are one line each and open a detail sheet with edit/delete.
 * Day groups render incrementally as the list scrolls.
 */
export function ScoreDayList({ scores, currentUserId, onScoreUpdated }: ScoreDayListProps) {
  const [selectedScore, setSelectedScore] = useState<ScoreWithFriend | null>(null);

  const dayGroups = groupScoresByDay(scores);
  // Pagination resets whenever the incoming (already filtered) list changes
  // identity in length — tracked via render-time key comparison, no effects.
  const [pagination, setPagination] = useState({ key: '', count: DAY_GROUPS_PAGE_SIZE });
  const paginationKey = `${scores.length}:${scores[0]?.id ?? ''}`;
  const visibleDayCount = pagination.key === paginationKey ? pagination.count : DAY_GROUPS_PAGE_SIZE;
  const visibleGroups = dayGroups.slice(0, visibleDayCount);
  const hasMore = dayGroups.length > visibleDayCount;

  // The observer callback reads the latest values through a ref that is
  // re-pointed after every render (writing refs during render is not
  // allowed; an always-running effect is the sanctioned equivalent).
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

      <ScoreDetailSheet
        score={selectedScore}
        currentUserId={currentUserId}
        onClose={() => setSelectedScore(null)}
        onScoreUpdated={onScoreUpdated}
      />
    </div>
  );
}
