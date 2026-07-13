import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  CalendarRange,
  ChevronRight,
  Dumbbell,
  Flame,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PageHeader } from '@/components/ui/pageHeader';
import { FilterChip } from '@/components/ui/filterChip';
import { ScoreDetailSheet } from '@/components/scores/ScoreDetailSheet';
import { Score, Training } from '@/lib/supabaseDatabase';
import { cn } from '@/lib/utils';
import { getDisplayGameLabel, getGameTypeLabel, getPoolTypeLabel, isPoolGameType } from '@/lib/gameTypes';
import { useAuth } from '@/components/auth/authContext';
import { useScoresQuery, useTrainingsQuery } from '@/hooks/useTrackerData';

type ScoreWithFriend = Score & { friend_name?: string | null };

type MatchOutcome = 'win' | 'loss' | 'draw';

interface MatchPerspective {
  didWin: boolean;
  outcome: MatchOutcome;
  userScore: number;
  opponentScore: number;
  margin: number;
  opponentName: string;
  playedAt: Date;
}

interface OpponentSummary {
  opponentName: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
}

interface TrainingGameSummary {
  gameType: string;
  sessionCount: number;
  totalDurationMinutes: number;
}

interface HeatmapCell {
  date: Date;
  key: string;
  count: number;
  isFuture: boolean;
}

const HEATMAP_WEEKS = 12;
const TREND_WEEKS = 12;
const CLOSE_GAME_MARGIN = 2;
const MAX_OPPONENT_CHIPS = 8;

function formatDateKey(dateValue: Date): string {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTooltipDate(dateValue: Date): string {
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  const year = dateValue.getFullYear();
  return `${month}-${day}-${year}`;
}

function parsePerspective(matchScore: ScoreWithFriend, currentUserId?: string): MatchPerspective {
  const [leftScore = 0, rightScore = 0] = matchScore.score.split('-').map((part) => Number(part) || 0);
  const isCreatorPerspective = matchScore.user_id === currentUserId;
  const userScore = isCreatorPerspective ? leftScore : rightScore;
  const opponentScore = isCreatorPerspective ? rightScore : leftScore;

  const outcome: MatchOutcome = userScore > opponentScore ? 'win' : userScore < opponentScore ? 'loss' : 'draw';

  return {
    didWin: outcome === 'win',
    outcome,
    userScore,
    opponentScore,
    margin: Math.abs(userScore - opponentScore),
    opponentName: matchScore.friend_name || matchScore.opponent_name || 'Unknown',
    playedAt: new Date(matchScore.date),
  };
}

function startOfWeekMonday(dateValue: Date): Date {
  const normalizedDate = new Date(dateValue);
  normalizedDate.setHours(0, 0, 0, 0);
  const mondayBasedDayIndex = (normalizedDate.getDay() + 6) % 7;
  normalizedDate.setDate(normalizedDate.getDate() - mondayBasedDayIndex);
  return normalizedDate;
}

interface WeightedDateEntry {
  dateValue: string;
  weight: number;
}

function buildWeightedHeatmapData(weightedDateEntries: WeightedDateEntry[]): { weeks: HeatmapCell[][]; maxCount: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekMonday = startOfWeekMonday(today);
  const rangeStart = new Date(currentWeekMonday);
  rangeStart.setDate(currentWeekMonday.getDate() - (HEATMAP_WEEKS - 1) * 7);

  const countsByDate = new Map<string, number>();

  for (const weightedDateEntry of weightedDateEntries) {
    const playedAt = new Date(weightedDateEntry.dateValue);
    const key = formatDateKey(playedAt);
    countsByDate.set(key, (countsByDate.get(key) || 0) + weightedDateEntry.weight);
  }

  const weeks: HeatmapCell[][] = [];

  for (let weekIndex = 0; weekIndex < HEATMAP_WEEKS; weekIndex += 1) {
    const weekStartDate = new Date(rangeStart);
    weekStartDate.setDate(rangeStart.getDate() + weekIndex * 7);

    const weekCells: HeatmapCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const cellDate = new Date(weekStartDate);
      cellDate.setDate(weekStartDate.getDate() + dayIndex);
      const key = formatDateKey(cellDate);

      weekCells.push({
        date: cellDate,
        key,
        count: countsByDate.get(key) || 0,
        isFuture: cellDate.getTime() > today.getTime(),
      });
    }

    weeks.push(weekCells);
  }

  const maxCount = weeks.flat().reduce((maxValue, cell) => Math.max(maxValue, cell.count), 0);
  return { weeks, maxCount };
}

function buildHeatmapData(scoreList: ScoreWithFriend[]): { weeks: HeatmapCell[][]; maxCount: number } {
  return buildWeightedHeatmapData(scoreList.map((score) => ({ dateValue: score.date, weight: 1 })));
}

function getHeatmapIntensityClass(activityCount: number, maxCount: number, isFuture: boolean): string {
  if (isFuture) return 'bg-muted/35 border-dashed';
  if (activityCount === 0 || maxCount === 0) return 'bg-muted/60';

  const normalizedValue = activityCount / maxCount;
  if (normalizedValue < 0.34) return 'bg-primary/30';
  if (normalizedValue < 0.67) return 'bg-primary/55';
  return 'bg-primary/80';
}

function buildMonthLabels(weeks: HeatmapCell[][]): string[] {
  return weeks.map((weekColumn, weekIndex) => {
    const currentMonth = weekColumn[0].date.getMonth();
    if (weekIndex === 0) {
      return weekColumn[0].date.toLocaleString('en-US', { month: 'short' });
    }

    const previousMonth = weeks[weekIndex - 1][0].date.getMonth();
    if (currentMonth !== previousMonth) {
      return weekColumn[0].date.toLocaleString('en-US', { month: 'short' });
    }

    return '';
  });
}

const HEATMAP_WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface ActivityHeatmapGridProps {
  weeks: HeatmapCell[][];
  maxCount: number;
  cellAriaLabel: (cell: HeatmapCell) => string;
  cellDetail: (cell: HeatmapCell) => ReactNode;
}

/**
 * 12-week activity grid with fixed-size (legible) cells: on narrow screens
 * the weeks scroll horizontally with the current week docked at the right,
 * instead of the cells shrinking to fit.
 */
function ActivityHeatmapGrid({ weeks, maxCount, cellAriaLabel, cellDetail }: ActivityHeatmapGridProps) {
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);

  // Dock the scroll position at the current week once on mount; inline
  // arrows would re-run on every render and fight the user's scrolling.
  const dockRight = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollLeft = node.scrollWidth;
  }, []);

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 pt-4">
          {HEATMAP_WEEKDAY_LABELS.map((dayLabel, dayIndex) => (
            <div
              key={`day-${dayIndex}`}
              className="flex h-6 items-center text-[10px] leading-none text-muted-foreground"
            >
              {dayLabel}
            </div>
          ))}
        </div>

        <div ref={dockRight} className="scrollbar-none overflow-x-auto">
          <div className="w-max space-y-1">
            <div className="flex gap-1">
              {monthLabels.map((monthLabel, index) => (
                <div key={`month-${index}`} className="h-3 w-6 text-[10px] leading-none text-muted-foreground">
                  {monthLabel}
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              {weeks.map((weekColumn, weekIndex) => (
                <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                  {weekColumn.map((cell) => (
                    <Popover
                      key={cell.key}
                      open={activeCellKey === cell.key}
                      onOpenChange={(isOpen) => {
                        setActiveCellKey(isOpen ? cell.key : null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={cellAriaLabel(cell)}
                          className={cn(
                            'h-6 w-6 rounded-[4px] border border-border/60',
                            getHeatmapIntensityClass(cell.count, maxCount, cell.isFuture)
                          )}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto max-w-56 px-3 py-2 text-xs">
                        {cellDetail(cell)}
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-border/60 bg-muted/60" />
          <span className="h-2.5 w-2.5 rounded-sm border border-border/60 bg-primary/30" />
          <span className="h-2.5 w-2.5 rounded-sm border border-border/60 bg-primary/55" />
          <span className="h-2.5 w-2.5 rounded-sm border border-border/60 bg-primary/80" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

interface WeekTrendPoint {
  label: string;
  winRate: number | null;
  wins: number;
  losses: number;
  games: number;
}

function buildWeeklyTrend(perspectives: MatchPerspective[]): WeekTrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekMonday = startOfWeekMonday(today);

  const buckets = new Map<number, { wins: number; losses: number; games: number }>();
  for (const match of perspectives) {
    const weekStart = startOfWeekMonday(match.playedAt).getTime();
    const bucket = buckets.get(weekStart) ?? { wins: 0, losses: 0, games: 0 };
    bucket.games += 1;
    if (match.outcome === 'win') bucket.wins += 1;
    else if (match.outcome === 'loss') bucket.losses += 1;
    buckets.set(weekStart, bucket);
  }

  const points: WeekTrendPoint[] = [];
  for (let weekIndex = TREND_WEEKS - 1; weekIndex >= 0; weekIndex -= 1) {
    const weekStart = new Date(currentWeekMonday);
    weekStart.setDate(currentWeekMonday.getDate() - weekIndex * 7);
    const bucket = buckets.get(weekStart.getTime());
    points.push({
      label: weekStart.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
      winRate: bucket ? Math.round((bucket.wins / bucket.games) * 100) : null,
      wins: bucket?.wins ?? 0,
      losses: bucket?.losses ?? 0,
      games: bucket?.games ?? 0,
    });
  }
  return points;
}

const formPillStyles: Record<MatchOutcome, string> = {
  win: 'bg-secondary/15 text-secondary',
  loss: 'bg-destructive/10 text-destructive',
  draw: 'bg-muted text-muted-foreground',
};

function FormPill({ outcome }: { outcome: MatchOutcome }) {
  return (
    <span
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-xs font-extrabold',
        formPillStyles[outcome]
      )}
    >
      {outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : 'D'}
    </span>
  );
}

interface StatisticsPageProps {
  view: 'score' | 'training';
}

export function StatisticsPage({ view }: StatisticsPageProps) {
  // The chips write straight to the URL, so FriendsPage can deep-link to
  // /statistics/score?opponent=NAME and a chosen matchup survives reloads.
  const [searchParams, setSearchParams] = useSearchParams();
  const gameFilter = searchParams.get('game') || 'all';
  const poolTypeFilter = searchParams.get('poolType') || 'all';
  const opponentFilter = searchParams.get('opponent') || 'all';
  const [trainingGameFilter, setTrainingGameFilter] = useState<string>('all');
  const [activeRecentFormIndex, setActiveRecentFormIndex] = useState<number | null>(null);
  const [detailScore, setDetailScore] = useState<ScoreWithFriend | null>(null);
  const { profile, isAuthenticated, user } = useAuth();
  const currentUserId = isAuthenticated ? user?.id : undefined;
  const isQueryEnabled = !!currentUserId;
  const scoresQuery = useScoresQuery(currentUserId);
  const trainingsQuery = useTrainingsQuery(currentUserId);
  const scores: ScoreWithFriend[] = isAuthenticated ? (scoresQuery.data ?? []) : [];
  const trainings: Training[] = isAuthenticated ? (trainingsQuery.data ?? []) : [];
  const isLoading = isQueryEnabled && (scoresQuery.isLoading || trainingsQuery.isLoading);

  useEffect(() => {
    if (!scoresQuery.error && !trainingsQuery.error) return;
    console.error('Failed to load scores:', scoresQuery.error ?? trainingsQuery.error);
  }, [scoresQuery.error, trainingsQuery.error]);

  const updateFilters = (updates: Partial<Record<'game' | 'poolType' | 'opponent', string>>) => {
    const nextParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === 'all') nextParams.delete(key);
      else nextParams.set(key, value);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleGameChipClick = (game: string) => {
    const nextGame = gameFilter === game ? 'all' : game;
    updateFilters({
      game: nextGame,
      // Pool-type only applies while Pool is the selected game.
      ...(isPoolGameType(nextGame) ? {} : { poolType: 'all' }),
    });
  };

  const uniqueGames = useMemo(() => [...new Set(scores.map((score) => score.game))], [scores]);

  const uniqueOpponents = useMemo(
    () => [...new Set(scores.map((score) => score.friend_name || score.opponent_name).filter(Boolean))] as string[],
    [scores]
  );

  const uniquePoolTypes = useMemo(
    () =>
      [...new Set(scores
        .filter((score) => isPoolGameType(score.game))
        .map((score) => score.pool_settings?.pool_type)
        .filter(Boolean))] as string[],
    [scores]
  );

  // Opponent chips are first-class: everyone you've played, ranked by
  // games played, capped to keep the row scannable.
  const opponentChips = useMemo(() => {
    const countByName = new Map<string, number>();
    for (const score of scores) {
      const name = score.friend_name || score.opponent_name;
      if (!name) continue;
      countByName.set(name, (countByName.get(name) ?? 0) + 1);
    }
    const topNames = [...countByName.entries()]
      .sort((first, second) => second[1] - first[1])
      .slice(0, MAX_OPPONENT_CHIPS)
      .map(([name]) => name);
    if (opponentFilter !== 'all' && !topNames.includes(opponentFilter)) {
      topNames.unshift(opponentFilter);
    }
    return topNames;
  }, [opponentFilter, scores]);

  const shouldShowPoolTypeFilter = isPoolGameType(gameFilter);

  const filteredScores = useMemo(() => {
    return scores.filter((score) => {
      if (gameFilter !== 'all' && score.game !== gameFilter) {
        return false;
      }

      if (shouldShowPoolTypeFilter && poolTypeFilter !== 'all') {
        if (!isPoolGameType(score.game)) {
          return false;
        }

        if (score.pool_settings?.pool_type !== poolTypeFilter) {
          return false;
        }
      }

      const scoreOpponentName = score.friend_name || score.opponent_name;

      return !(opponentFilter !== 'all' && scoreOpponentName !== opponentFilter);
    });
  }, [gameFilter, opponentFilter, poolTypeFilter, scores, shouldShowPoolTypeFilter]);

  const perspectiveScores = useMemo(
    () => filteredScores.map((score) => parsePerspective(score, profile?.user_id)),
    [filteredScores, profile?.user_id]
  );

  const totalGames = filteredScores.length;
  const totalWins = perspectiveScores.filter((item) => item.outcome === 'win').length;
  const totalLosses = perspectiveScores.filter((item) => item.outcome === 'loss').length;
  const totalDraws = perspectiveScores.filter((item) => item.outcome === 'draw').length;
  const winPercentage = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const averageUserScore =
    totalGames > 0
      ? perspectiveScores.reduce((sumValue, perspectiveItem) => sumValue + perspectiveItem.userScore, 0) / totalGames
      : 0;
  const averageOpponentScore =
    totalGames > 0
      ? perspectiveScores.reduce((sumValue, perspectiveItem) => sumValue + perspectiveItem.opponentScore, 0) / totalGames
      : 0;

  const mostPlayedGame = useMemo(() => {
    if (filteredScores.length === 0) return 'N/A';

    const gameCountMap = new Map<string, number>();
    for (const score of filteredScores) {
      gameCountMap.set(score.game, (gameCountMap.get(score.game) || 0) + 1);
    }

    return getGameTypeLabel(
      Array.from(gameCountMap.entries()).sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])[0]?.[0] || 'N/A'
    );
  }, [filteredScores]);

  const sortedMatches = useMemo(
    () =>
      filteredScores
        .map((score) => ({
          score,
          perspective: parsePerspective(score, profile?.user_id),
        }))
        .sort((leftItem, rightItem) => rightItem.perspective.playedAt.getTime() - leftItem.perspective.playedAt.getTime()),
    [filteredScores, profile?.user_id]
  );

  const lastTenForm = useMemo(() => sortedMatches.slice(0, 10), [sortedMatches]);

  const lastTenFormChronological = useMemo(() => [...lastTenForm].reverse(), [lastTenForm]);

  const lastFiveChronological = useMemo(() => [...sortedMatches.slice(0, 5)].reverse(), [sortedMatches]);

  const streakInfo = useMemo(() => {
    if (sortedMatches.length === 0) {
      return {
        currentType: 'none' as 'win' | 'loss' | 'none',
        currentCount: 0,
        bestWinStreak: 0,
      };
    }

    const chronologicalOutcomes = [...sortedMatches].reverse().map((item) => item.perspective.outcome);

    let currentCount = 1;
    const latestOutcome = chronologicalOutcomes[chronologicalOutcomes.length - 1];
    for (let index = chronologicalOutcomes.length - 2; index >= 0; index -= 1) {
      if (chronologicalOutcomes[index] === latestOutcome) {
        currentCount += 1;
      } else {
        break;
      }
    }

    let bestWinStreak = 0;
    let activeWinStreak = 0;
    for (const outcome of chronologicalOutcomes) {
      if (outcome === 'win') {
        activeWinStreak += 1;
        bestWinStreak = Math.max(bestWinStreak, activeWinStreak);
      } else {
        activeWinStreak = 0;
      }
    }

    return {
      currentType: latestOutcome === 'draw' ? 'none' : latestOutcome,
      currentCount: latestOutcome === 'draw' ? 0 : currentCount,
      bestWinStreak,
    };
  }, [sortedMatches]);

  const closeGames = useMemo(
    () => perspectiveScores.filter((match) => match.margin <= CLOSE_GAME_MARGIN),
    [perspectiveScores]
  );
  const closeGamesCount = closeGames.length;
  const closeGamesWinRate =
    closeGamesCount > 0
      ? Math.round((closeGames.filter((match) => match.outcome === 'win').length / closeGamesCount) * 100)
      : 0;

  const closeGamesHref = useMemo(() => {
    const params = new URLSearchParams({ close: '1' });
    if (gameFilter !== 'all') params.set('game', gameFilter);
    if (opponentFilter !== 'all') params.set('opponent', opponentFilter);
    return `/history/score?${params.toString()}`;
  }, [gameFilter, opponentFilter]);

  const topOpponents = useMemo(() => {
    const opponentSummaryMap = new Map<string, OpponentSummary>();

    for (const match of perspectiveScores) {
      const existingSummary = opponentSummaryMap.get(match.opponentName) || {
        opponentName: match.opponentName,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };

      existingSummary.games += 1;
      if (match.outcome === 'win') {
        existingSummary.wins += 1;
      } else if (match.outcome === 'loss') {
        existingSummary.losses += 1;
      } else {
        existingSummary.draws += 1;
      }

      opponentSummaryMap.set(match.opponentName, existingSummary);
    }

    return Array.from(opponentSummaryMap.values())
      .sort((leftOpponent, rightOpponent) => {
        if (rightOpponent.games !== leftOpponent.games) return rightOpponent.games - leftOpponent.games;
        return rightOpponent.wins - leftOpponent.wins;
      })
      .slice(0, 3);
  }, [perspectiveScores]);

  const bestScore = useMemo(() => {
    if (sortedMatches.length === 0) return null;

    return [...sortedMatches].sort((leftItem, rightItem) => {
      if (leftItem.perspective.didWin !== rightItem.perspective.didWin) {
        return leftItem.perspective.didWin ? -1 : 1;
      }
      return rightItem.perspective.margin - leftItem.perspective.margin;
    })[0];
  }, [sortedMatches]);

  const worstScore = useMemo(() => {
    if (sortedMatches.length === 0) return null;

    return [...sortedMatches].sort((leftItem, rightItem) => {
      if (leftItem.perspective.didWin !== rightItem.perspective.didWin) {
        return leftItem.perspective.didWin ? 1 : -1;
      }
      return rightItem.perspective.margin - leftItem.perspective.margin;
    })[0];
  }, [sortedMatches]);

  const weeklyTrend = useMemo(() => buildWeeklyTrend(perspectiveScores), [perspectiveScores]);
  const trendHasData = useMemo(() => weeklyTrend.some((point) => point.winRate !== null), [weeklyTrend]);

  const heatmapData = useMemo(() => buildHeatmapData(filteredScores), [filteredScores]);

  const gamesInHeatmapRange = useMemo(
    () => heatmapData.weeks.flat().reduce((sumValue, cell) => sumValue + cell.count, 0),
    [heatmapData.weeks]
  );

  // Per-day win counts so a heatmap tap can answer "Jun 12 · 5 games · 3W".
  const winsByDateKey = useMemo(() => {
    const wins = new Map<string, number>();
    for (const match of perspectiveScores) {
      if (match.outcome !== 'win') continue;
      const key = formatDateKey(match.playedAt);
      wins.set(key, (wins.get(key) ?? 0) + 1);
    }
    return wins;
  }, [perspectiveScores]);

  const trainingGames = useMemo(
    () => [...new Set(trainings.map((training) => training.game))],
    [trainings]
  );

  const filteredTrainings = useMemo(
    () =>
      trainings.filter((training) => {
        if (trainingGameFilter === 'all') return true;
        return training.game === trainingGameFilter;
      }),
    [trainingGameFilter, trainings]
  );

  const totalTrainingSessions = filteredTrainings.length;
  const totalTrainingMinutes = useMemo(
    () => filteredTrainings.reduce((sumValue, training) => sumValue + training.duration_minutes, 0),
    [filteredTrainings]
  );
  const averageTrainingDurationMinutes = totalTrainingSessions > 0
    ? totalTrainingMinutes / totalTrainingSessions
    : 0;

  const trainingHeatmapData = useMemo(
    () => buildWeightedHeatmapData(
      filteredTrainings.map((training) => ({
        dateValue: training.training_date,
        weight: training.duration_minutes,
      }))
    ),
    [filteredTrainings]
  );
  const trainingMinutesInHeatmapRange = useMemo(
    () => trainingHeatmapData.weeks.flat().reduce((sumValue, cell) => sumValue + cell.count, 0),
    [trainingHeatmapData.weeks]
  );

  const trainingSummaryByGame = useMemo(() => {
    const summaryMap = new Map<string, TrainingGameSummary>();

    for (const training of filteredTrainings) {
      const existingSummary = summaryMap.get(training.game) || {
        gameType: training.game,
        sessionCount: 0,
        totalDurationMinutes: 0,
      };
      existingSummary.sessionCount += 1;
      existingSummary.totalDurationMinutes += training.duration_minutes;
      summaryMap.set(training.game, existingSummary);
    }

    return Array.from(summaryMap.values()).sort((leftSummary, rightSummary) => rightSummary.sessionCount - leftSummary.sessionCount);
  }, [filteredTrainings]);

  const longestTrainingSessionMinutes = useMemo(
    () => filteredTrainings.reduce((maxValue, training) => Math.max(maxValue, training.duration_minutes), 0),
    [filteredTrainings]
  );

  const mostTrainedGame = trainingSummaryByGame[0]?.gameType;
  const trainingDaysInHeatmapRange = useMemo(
    () => trainingHeatmapData.weeks.flat().filter((cell) => !cell.isFuture && cell.count > 0).length,
    [trainingHeatmapData.weeks]
  );

  const currentTrainingStreakDays = useMemo(() => {
    const uniqueTrainingDates = Array.from(new Set(filteredTrainings.map((training) => training.training_date)))
      .map((dateValue) => {
        const normalizedDate = new Date(dateValue);
        normalizedDate.setHours(0, 0, 0, 0);
        return normalizedDate;
      })
      .sort((leftDate, rightDate) => rightDate.getTime() - leftDate.getTime());

    if (uniqueTrainingDates.length === 0) return 0;

    let streakDays = 1;
    for (let index = 1; index < uniqueTrainingDates.length; index += 1) {
      const previousDate = uniqueTrainingDates[index - 1];
      const currentDate = uniqueTrainingDates[index];
      const dayDifference = Math.round((previousDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000));

      if (dayDifference === 1) {
        streakDays += 1;
      } else if (dayDifference > 1) {
        break;
      }
    }

    return streakDays;
  }, [filteredTrainings]);

  const statisticsViewTabs = (
    <div className="flex items-center gap-2">
      <Link
        to="/statistics/score"
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-smooth',
          view === 'score'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground'
        )}
      >
        Scores
      </Link>
      <Link
        to="/statistics/training"
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-smooth',
          view === 'training'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground'
        )}
      >
        Trainings
      </Link>
    </div>
  );

  const opponentFirstName = opponentFilter === 'all' ? '' : opponentFilter.split(' ')[0];
  const isHeadToHead = opponentFilter !== 'all' && totalGames > 0;

  const headToHeadCard = (
    <Card className="shadow-card border-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">You vs {opponentFilter}</h2>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{totalGames} games</span>
        </div>

        <div>
          <div className="flex h-3.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-player-one" style={{ width: `${(totalWins / Math.max(totalGames, 1)) * 100}%` }} />
            <div className="bg-muted" style={{ width: `${(totalDraws / Math.max(totalGames, 1)) * 100}%` }} />
            <div className="bg-player-two" style={{ width: `${(totalLosses / Math.max(totalGames, 1)) * 100}%` }} />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-sm font-bold">
            <span className="text-player-one">
              You {totalWins}W · {winPercentage}%
            </span>
            <span className="text-player-two">
              {opponentFirstName} {totalLosses}W · {totalGames > 0 ? Math.round((totalLosses / totalGames) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your form</p>
            <div className="flex gap-1">
              {lastFiveChronological.map((match, index) => (
                <FormPill key={`you-${match.score.id}-${index}`} outcome={match.perspective.outcome} />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {opponentFirstName}'s form
            </p>
            <div className="flex gap-1">
              {lastFiveChronological.map((match, index) => (
                <FormPill
                  key={`opp-${match.score.id}-${index}`}
                  outcome={
                    match.perspective.outcome === 'win'
                      ? 'loss'
                      : match.perspective.outcome === 'loss'
                        ? 'win'
                        : 'draw'
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Current streak</span>
          <span
            className={cn(
              'font-semibold',
              streakInfo.currentType === 'win' && 'text-secondary',
              streakInfo.currentType === 'loss' && 'text-destructive'
            )}
          >
            {streakInfo.currentCount > 0
              ? `${streakInfo.currentCount} ${streakInfo.currentType === 'win' ? 'W' : 'L'}`
              : 'No streak'}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Average score</span>
          <span className="font-semibold tabular-nums">
            {averageUserScore.toFixed(1)} – {averageOpponentScore.toFixed(1)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const headlineRecordCard = (
    <Card className="border-0 shadow-card">
      <CardContent className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-4">
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">Total Games</p>
            <Trophy className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-lg font-semibold leading-tight">{totalGames}</p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">Win Rate</p>
            <TrendingUp className="h-3.5 w-3.5 text-secondary" />
          </div>
          <p className="text-lg font-semibold leading-tight text-secondary">{winPercentage}%</p>
          <p className="text-[11px] text-muted-foreground">
            {totalWins}W {totalLosses}L{totalDraws > 0 ? ` ${totalDraws}D` : ''}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">Favorite Game</p>
            <Target className="h-3.5 w-3.5 text-accent" />
          </div>
          <p className="text-lg font-semibold leading-tight">{mostPlayedGame}</p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">Opponents</p>
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-lg font-semibold leading-tight">{uniqueOpponents.length}</p>
          {topOpponents[0] ? (
            <p className="truncate text-[11px] text-muted-foreground">Most played: {topOpponents[0].opponentName}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  const trainingStatisticsSection = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <Card className="shadow-card border-0 order-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              Training Heatmap
            </CardTitle>
            <CardDescription>Last 12 weeks ({(trainingMinutesInHeatmapRange / 60).toFixed(1)}h)</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmapGrid
              weeks={trainingHeatmapData.weeks}
              maxCount={trainingHeatmapData.maxCount}
              cellAriaLabel={(cell) => `${formatTooltipDate(cell.date)}: ${cell.count} training minutes`}
              cellDetail={(cell) => (
                <>
                  {formatTooltipDate(cell.date)}: {cell.count} min ({(cell.count / 60).toFixed(1)}h)
                </>
              )}
            />
            {totalTrainingSessions === 0 ? (
              <div className="mt-4 text-sm text-muted-foreground">
                No trainings found for the selected filter.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="order-2 lg:col-span-3 grid grid-cols-2 gap-6">
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Dumbbell className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTrainingSessions}</div>
              <p className="text-xs text-muted-foreground">Training sessions</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <CalendarRange className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(totalTrainingMinutes / 60).toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Time spent training</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
              <Target className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageTrainingDurationMinutes.toFixed(0)} min</div>
              <p className="text-xs text-muted-foreground">Average session length</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Trained Game</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mostTrainedGame ? getGameTypeLabel(mostTrainedGame) : 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Longest: {longestTrainingSessionMinutes} min</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Days (12w)</CardTitle>
              <CalendarRange className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainingDaysInHeatmapRange}</div>
              <p className="text-xs text-muted-foreground">Days with at least one training</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentTrainingStreakDays} days</div>
              <p className="text-xs text-muted-foreground">Consecutive training days</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );

  if (view === 'training') {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader
          title="Statistics"
          description="Analyze your training consistency and load"
          icon={BarChart3}
          actions={statisticsViewTabs}
        />

        <div className="sticky top-0 z-30 -mx-4 bg-background/95 px-4 py-2 backdrop-blur">
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
            <FilterChip
              label="All Games"
              active={trainingGameFilter === 'all'}
              onClick={() => setTrainingGameFilter('all')}
            />
            {trainingGames.map((game) => (
              <FilterChip
                key={game}
                label={getGameTypeLabel(game)}
                active={trainingGameFilter === game}
                onClick={() => setTrainingGameFilter(trainingGameFilter === game ? 'all' : game)}
              />
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading statistics...</div>
        ) : (
          trainingStatisticsSection
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Statistics"
        description="Analyze your gaming performance"
        icon={BarChart3}
        actions={statisticsViewTabs}
      />

      <div className="sticky top-0 z-30 -mx-4 space-y-2 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip
            label="All"
            active={opponentFilter === 'all'}
            onClick={() => updateFilters({ opponent: 'all' })}
          />
          {opponentChips.map((opponent) => (
            <FilterChip
              key={opponent}
              label={opponent.split(' ')[0]}
              active={opponentFilter === opponent}
              onClick={() => updateFilters({ opponent: opponentFilter === opponent ? 'all' : opponent })}
            />
          ))}
        </div>
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip
            label="All games"
            active={gameFilter === 'all'}
            onClick={() => updateFilters({ game: 'all', poolType: 'all' })}
            className="px-3 py-1.5 text-[11px]"
          />
          {uniqueGames.map((game) => (
            <FilterChip
              key={game}
              label={getGameTypeLabel(game)}
              active={gameFilter === game}
              onClick={() => handleGameChipClick(game)}
              className="px-3 py-1.5 text-[11px]"
            />
          ))}
          {shouldShowPoolTypeFilter &&
            uniquePoolTypes.map((poolType) => (
              <FilterChip
                key={poolType}
                label={getPoolTypeLabel(poolType)}
                active={poolTypeFilter === poolType}
                onClick={() => updateFilters({ poolType: poolTypeFilter === poolType ? 'all' : poolType })}
                className="px-3 py-1.5 text-[11px]"
              />
            ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading statistics...</div>
      ) : totalGames === 0 ? (
        <Card className="shadow-card border-0">
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground text-lg">No games found matching your filters</div>
            <div className="text-sm text-muted-foreground mt-2">Try adjusting your filters or add more games</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {isHeadToHead ? headToHeadCard : headlineRecordCard}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Recent Form</CardTitle>
                <CardDescription>Last 10 matches</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
                  {lastTenFormChronological.map((match, index) => (
                    <Popover
                      key={`${match.score.id}-${index}`}
                      open={activeRecentFormIndex === index}
                      onOpenChange={(isOpen) => {
                        setActiveRecentFormIndex(isOpen ? index : null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={`${match.perspective.outcome === 'win' ? 'Win' : match.perspective.outcome === 'loss' ? 'Loss' : 'Draw'} vs ${match.perspective.opponentName}, score ${match.score.score}`}
                          className={cn(
                            'w-full aspect-square rounded-sm sm:rounded-md text-xs font-semibold flex items-center justify-center border',
                            match.perspective.outcome === 'win' && 'border-secondary/40 bg-secondary/15 text-secondary',
                            match.perspective.outcome === 'loss' && 'border-destructive/30 bg-destructive/10 text-destructive',
                            match.perspective.outcome === 'draw' && 'border-muted-foreground/40 bg-muted text-muted-foreground'
                          )}
                        >
                          {match.perspective.outcome === 'win' ? 'W' : match.perspective.outcome === 'loss' ? 'L' : 'D'}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto max-w-56 px-3 py-2 text-xs">
                        {match.perspective.outcome === 'win' ? 'Win' : match.perspective.outcome === 'loss' ? 'Loss' : 'Draw'} vs {match.perspective.opponentName} ({match.score.score})
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalWins} wins in {totalGames} games for current filters
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  Streaks
                </CardTitle>
                <CardDescription>Momentum and consistency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span className="text-sm text-muted-foreground">Current streak</span>
                  <span
                    className={cn(
                      'font-semibold',
                      streakInfo.currentType === 'win' && 'text-secondary',
                      streakInfo.currentType === 'loss' && 'text-destructive'
                    )}
                  >
                    {streakInfo.currentCount > 0
                      ? `${streakInfo.currentCount} ${streakInfo.currentType === 'win' ? 'W' : 'L'}`
                      : 'No streak'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span className="text-sm text-muted-foreground">Best win streak</span>
                  <span className="font-semibold">{streakInfo.bestWinStreak}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span className="text-sm text-muted-foreground">Average score</span>
                  <span className="font-semibold tabular-nums">
                    {averageUserScore.toFixed(1)} – {averageOpponentScore.toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Win rate · last 12 weeks
              </CardTitle>
              <CardDescription>Weekly win percentage, dashed line marks 50%</CardDescription>
            </CardHeader>
            <CardContent>
              {trendHasData ? (
                <ChartContainer
                  config={{ winRate: { label: 'Win rate', color: 'hsl(var(--primary))' } }}
                  className="aspect-auto h-44 w-full"
                >
                  <LineChart data={weeklyTrend} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <YAxis domain={[0, 100]} hide />
                    <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => (
                            <span className="font-medium tabular-nums">
                              {value}% · {item?.payload?.wins}W {item?.payload?.losses}L
                            </span>
                          )}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="winRate"
                      stroke="var(--color-winRate)"
                      strokeWidth={2}
                      connectNulls
                      dot={{ r: 3, fill: 'var(--color-winRate)', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No games in the last 12 weeks for these filters
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle>Game Performance</CardTitle>
              <CardDescription>Close games and your extremes — tap to dig in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                to={closeGamesHref}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 transition-colors hover:bg-muted/70 active:bg-muted/60"
              >
                <span>
                  <span className="block text-sm font-medium">Close games (≤2 pts)</span>
                  <span className="block text-xs text-muted-foreground">
                    {closeGamesCount > 0 ? `You win ${closeGamesWinRate}% of them` : 'None yet'}
                  </span>
                </span>
                <span className="flex items-center gap-1 font-semibold tabular-nums">
                  {closeGamesCount}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </Link>

              <button
                type="button"
                onClick={() => bestScore && setDetailScore(bestScore.score)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-secondary/10 px-3 py-2 text-left transition-colors hover:bg-secondary/15 active:bg-secondary/20"
              >
                <span>
                  <span className="block text-sm font-medium text-secondary">Best game</span>
                  <span className="block text-xs text-muted-foreground">
                    {bestScore
                      ? `${getDisplayGameLabel(bestScore.score.game, bestScore.score.pool_settings?.pool_type)} vs ${bestScore.perspective.opponentName}`
                      : 'N/A'}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-lg font-bold tabular-nums text-secondary">
                  {bestScore?.score.score || 'N/A'}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => worstScore && setDetailScore(worstScore.score)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-left transition-colors hover:bg-muted/70 active:bg-muted/60"
              >
                <span>
                  <span className="block text-sm font-medium">Worst game</span>
                  <span className="block text-xs text-muted-foreground">
                    {worstScore
                      ? `${getDisplayGameLabel(worstScore.score.game, worstScore.score.pool_settings?.pool_type)} vs ${worstScore.perspective.opponentName}`
                      : 'N/A'}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-lg font-bold tabular-nums">
                  {worstScore?.score.score || 'N/A'}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                Activity Heatmap
              </CardTitle>
              <CardDescription>Last 12 weeks ({gamesInHeatmapRange} games)</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityHeatmapGrid
                weeks={heatmapData.weeks}
                maxCount={heatmapData.maxCount}
                cellAriaLabel={(cell) =>
                  `${formatTooltipDate(cell.date)}: ${cell.count} game${cell.count === 1 ? '' : 's'}`
                }
                cellDetail={(cell) => (
                  <>
                    {formatTooltipDate(cell.date)}: {cell.count} game{cell.count === 1 ? '' : 's'}
                    {cell.count > 0 ? ` · ${winsByDateKey.get(cell.key) ?? 0}W` : ''}
                  </>
                )}
              />
            </CardContent>
          </Card>

          <ScoreDetailSheet
            score={detailScore}
            currentUserId={currentUserId}
            onClose={() => setDetailScore(null)}
            onScoreUpdated={() => undefined}
          />
        </>
      )}
    </div>
  );
}
