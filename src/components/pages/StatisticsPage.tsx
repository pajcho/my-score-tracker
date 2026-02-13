import {useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {BarChart3, CalendarRange, Filter, Flame, Target, TrendingUp, Trophy, Users,} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {supabaseAuth} from '@/lib/supabase-auth';
import {Score, supabaseDb} from '@/lib/supabase-database';
import {cn} from '@/lib/utils';
import { getDisplayGameLabel, getGameTypeLabel, getPoolTypeLabel, isPoolGameType } from '@/lib/game-types';

type ScoreWithFriend = Score & { friend_name?: string | null };

interface MatchPerspective {
  didWin: boolean;
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
}

interface HeatmapCell {
  date: Date;
  key: string;
  count: number;
  isFuture: boolean;
}

const HEATMAP_WEEKS = 12;

function formatDateKey(dateValue: Date): string {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parsePerspective(matchScore: ScoreWithFriend, currentUserId?: string): MatchPerspective {
  const [leftScore = 0, rightScore = 0] = matchScore.score.split('-').map((part) => Number(part) || 0);
  const isCreatorPerspective = matchScore.user_id === currentUserId;
  const userScore = isCreatorPerspective ? leftScore : rightScore;
  const opponentScore = isCreatorPerspective ? rightScore : leftScore;

  return {
    didWin: userScore > opponentScore,
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

function buildHeatmapData(scoreList: ScoreWithFriend[]): { weeks: HeatmapCell[][]; maxCount: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekMonday = startOfWeekMonday(today);
  const rangeStart = new Date(currentWeekMonday);
  rangeStart.setDate(currentWeekMonday.getDate() - (HEATMAP_WEEKS - 1) * 7);

  const countsByDate = new Map<string, number>();

  for (const score of scoreList) {
    const playedAt = new Date(score.date);
    const key = formatDateKey(playedAt);
    countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
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

function getHeatmapIntensityClass(activityCount: number, maxCount: number, isFuture: boolean): string {
  if (isFuture) return 'bg-muted/35 border-dashed';
  if (activityCount === 0 || maxCount === 0) return 'bg-muted/60';

  const normalizedValue = activityCount / maxCount;
  if (normalizedValue < 0.34) return 'bg-primary/30';
  if (normalizedValue < 0.67) return 'bg-primary/55';
  return 'bg-primary/80';
}

export function StatisticsPage() {
  const [searchParams] = useSearchParams();
  const [scores, setScores] = useState<ScoreWithFriend[]>([]);
  const [gameFilter, setGameFilter] = useState<string>(searchParams.get('game') || 'all');
  const [poolTypeFilter, setPoolTypeFilter] = useState<string>(searchParams.get('poolType') || 'all');
  const [opponentFilter, setOpponentFilter] = useState<string>(searchParams.get('opponent') || 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeRecentFormIndex, setActiveRecentFormIndex] = useState<number | null>(null);
  const [activeHeatmapCellKey, setActiveHeatmapCellKey] = useState<string | null>(null);
  const [user, setUser] = useState(supabaseAuth.getCurrentProfile());

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userScores = await supabaseDb.getScoresByUserId();
      setScores(userScores as ScoreWithFriend[]);
    } catch (error) {
      console.error('Failed to load scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return supabaseAuth.subscribe((authState) => {
      setUser(authState.profile);
      if (authState.isAuthenticated) {
        void loadData();
      } else {
        setScores([]);
        setIsLoading(false);
      }
    });
  }, []);

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

  const filteredScores = useMemo(() => {
    return scores.filter((score) => {
      if (gameFilter !== 'all' && score.game !== gameFilter) {
        return false;
      }

      if (poolTypeFilter !== 'all') {
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
  }, [gameFilter, opponentFilter, poolTypeFilter, scores]);

  const perspectiveScores = useMemo(
    () => filteredScores.map((score) => parsePerspective(score, user?.user_id)),
    [filteredScores, user?.user_id]
  );

  const totalGames = filteredScores.length;
  const totalWins = perspectiveScores.filter((item) => item.didWin).length;
  const totalLosses = totalGames - totalWins;
  const winPercentage = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const averageScore =
    totalGames > 0
      ? perspectiveScores.reduce((sumValue, perspectiveItem) => sumValue + perspectiveItem.userScore, 0) / totalGames
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

  const mostPlayedOpponent = useMemo(() => {
    if (perspectiveScores.length === 0) return 'N/A';

    const opponentCountMap = new Map<string, number>();
    for (const match of perspectiveScores) {
      opponentCountMap.set(match.opponentName, (opponentCountMap.get(match.opponentName) || 0) + 1);
    }

    return (
      Array.from(opponentCountMap.entries()).sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])[0]?.[0] ||
      'N/A'
    );
  }, [perspectiveScores]);

  const sortedMatches = useMemo(
    () =>
      filteredScores
        .map((score) => ({
          score,
          perspective: parsePerspective(score, user?.user_id),
        }))
        .sort((leftItem, rightItem) => rightItem.perspective.playedAt.getTime() - leftItem.perspective.playedAt.getTime()),
    [filteredScores, user?.user_id]
  );

  const lastTenForm = useMemo(() => sortedMatches.slice(0, 10), [sortedMatches]);

  const lastTenFormChronological = useMemo(() => [...lastTenForm].reverse(), [lastTenForm]);

  const streakInfo = useMemo(() => {
    if (sortedMatches.length === 0) {
      return {
        currentType: 'none' as 'win' | 'loss' | 'none',
        currentCount: 0,
        bestWinStreak: 0,
      };
    }

    const chronologicalResults = [...sortedMatches].reverse().map((item) => item.perspective.didWin);

    let currentCount = 1;
    const latestResult = chronologicalResults[chronologicalResults.length - 1];
    for (let index = chronologicalResults.length - 2; index >= 0; index -= 1) {
      if (chronologicalResults[index] === latestResult) {
        currentCount += 1;
      } else {
        break;
      }
    }

    let bestWinStreak = 0;
    let activeWinStreak = 0;
    for (const didWin of chronologicalResults) {
      if (didWin) {
        activeWinStreak += 1;
        bestWinStreak = Math.max(bestWinStreak, activeWinStreak);
      } else {
        activeWinStreak = 0;
      }
    }

    return {
      currentType: latestResult ? 'win' : 'loss',
      currentCount,
      bestWinStreak,
    };
  }, [sortedMatches]);

  const closeGamesCount = useMemo(
    () => perspectiveScores.filter((match) => match.margin <= 2).length,
    [perspectiveScores]
  );

  const topOpponents = useMemo(() => {
    const opponentSummaryMap = new Map<string, OpponentSummary>();

    for (const match of perspectiveScores) {
      const existingSummary = opponentSummaryMap.get(match.opponentName) || {
        opponentName: match.opponentName,
        games: 0,
        wins: 0,
        losses: 0,
      };

      existingSummary.games += 1;
      if (match.didWin) {
        existingSummary.wins += 1;
      } else {
        existingSummary.losses += 1;
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

  const heatmapData = useMemo(() => buildHeatmapData(filteredScores), [filteredScores]);

  const gamesInHeatmapRange = useMemo(
    () => heatmapData.weeks.flat().reduce((sumValue, cell) => sumValue + cell.count, 0),
    [heatmapData.weeks]
  );

  const heatmapMonthLabels = useMemo(() => {
    return heatmapData.weeks.map((weekColumn, weekIndex) => {
      const currentMonth = weekColumn[0].date.getMonth();
      if (weekIndex === 0) {
        return weekColumn[0].date.toLocaleString('en-US', { month: 'short' });
      }

      const previousMonth = heatmapData.weeks[weekIndex - 1][0].date.getMonth();
      if (currentMonth !== previousMonth) {
        return weekColumn[0].date.toLocaleString('en-US', { month: 'short' });
      }

      return '';
    });
  }, [heatmapData.weeks]);

  const heatmapWeekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-muted-foreground">Analyze your gaming performance and track your progress</p>
        </div>
      </div>

      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter statistics by game type or opponent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select value={gameFilter} onValueChange={setGameFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {uniqueGames.map((game) => (
                    <SelectItem key={game} value={game}>
                      {getGameTypeLabel(game)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={poolTypeFilter} onValueChange={setPoolTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by pool type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pool Types</SelectItem>
                  {uniquePoolTypes.map((poolType) => (
                    <SelectItem key={poolType} value={poolType}>
                      {getPoolTypeLabel(poolType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={opponentFilter} onValueChange={setOpponentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by opponent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Opponents</SelectItem>
                  {uniqueOpponents.map((opponent) => (
                    <SelectItem key={opponent} value={opponent}>
                      {opponent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-card border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                <Trophy className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalGames}</div>
                <p className="text-xs text-muted-foreground">Games played</p>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">{winPercentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {totalWins} wins, {totalLosses} losses
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Target className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Points per game</p>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favorite Game</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mostPlayedGame}</div>
                <p className="text-xs text-muted-foreground">Most played</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <span className="text-sm text-muted-foreground">Close games (≤2 pts)</span>
                  <span className="font-semibold">{closeGamesCount}</span>
                </div>
              </CardContent>
            </Card>

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
                          aria-label={`${match.perspective.didWin ? 'Win' : 'Loss'} vs ${match.perspective.opponentName}, score ${match.score.score}`}
                          className={cn(
                            'w-full aspect-square rounded-sm sm:rounded-md text-xs font-semibold flex items-center justify-center border',
                            match.perspective.didWin
                              ? 'border-secondary/40 bg-secondary/15 text-secondary'
                              : 'border-destructive/30 bg-destructive/10 text-destructive'
                          )}
                        >
                          {match.perspective.didWin ? 'W' : 'L'}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto max-w-56 px-3 py-2 text-xs">
                        {match.perspective.didWin ? 'Win' : 'Loss'} vs {match.perspective.opponentName} ({match.score.score})
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
                  <CalendarRange className="h-5 w-5 text-primary" />
                  Activity Heatmap
                </CardTitle>
                <CardDescription>Last 12 weeks ({gamesInHeatmapRange} games)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[16px_1fr] gap-x-2 gap-y-1">
                  <div />
                  <div className="grid grid-cols-12 gap-1">
                    {heatmapMonthLabels.map((monthLabel, index) => (
                      <div key={`month-${index}`} className="text-[10px] text-muted-foreground leading-none h-3">
                        {monthLabel}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-rows-7 gap-1">
                    {heatmapWeekdayLabels.map((dayLabel, dayIndex) => (
                      <div
                        key={`day-${dayIndex}`}
                        className="h-full flex items-center justify-start text-[10px] text-muted-foreground leading-none"
                      >
                        {dayLabel}
                      </div>
                    ))}
                  </div>

                  <div className="w-full grid grid-cols-12 gap-1">
                    {heatmapData.weeks.map((weekColumn, weekIndex) => (
                      <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                        {weekColumn.map((cell) => (
                          <Popover
                            key={cell.key}
                            open={activeHeatmapCellKey === cell.key}
                            onOpenChange={(isOpen) => {
                              setActiveHeatmapCellKey(isOpen ? cell.key : null);
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label={`${cell.key}: ${cell.count} game${cell.count === 1 ? '' : 's'}`}
                                className={cn(
                                  'w-full aspect-square rounded-[3px] border border-border/60',
                                  getHeatmapIntensityClass(cell.count, heatmapData.maxCount, cell.isFuture)
                                )}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto max-w-56 px-3 py-2 text-xs">
                              {cell.key}: {cell.count} game{cell.count === 1 ? '' : 's'}
                            </PopoverContent>
                          </Popover>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-muted/60 border border-border/60" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary/30 border border-border/60" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary/55 border border-border/60" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary/80 border border-border/60" />
                  </div>
                  <span>More</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Game Performance</CardTitle>
                <CardDescription>Your best and worst performances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                  <div>
                    <div className="font-medium text-secondary">Best Game</div>
                    <div className="text-sm text-muted-foreground">
                      {bestScore
                        ? `${getDisplayGameLabel(bestScore.score.game, bestScore.score.pool_settings?.pool_type)} vs ${bestScore.perspective.opponentName}`
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-secondary">{bestScore?.score.score || 'N/A'}</div>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">Worst Game</div>
                    <div className="text-sm text-muted-foreground">
                      {worstScore
                        ? `${getDisplayGameLabel(worstScore.score.game, worstScore.score.pool_settings?.pool_type)} vs ${worstScore.perspective.opponentName}`
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="text-lg font-bold">{worstScore?.score.score || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Social Stats</CardTitle>
                <CardDescription>Opponents and matchup trends</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Most Played Opponent</span>
                    <span className="font-medium">{mostPlayedOpponent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Unique Opponents</span>
                    <span className="font-medium">{uniqueOpponents.length}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="text-sm font-medium">Top Matchups</div>
                  {topOpponents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No opponent data yet</div>
                  ) : (
                    topOpponents.map((opponent) => (
                      <div key={opponent.opponentName} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{opponent.opponentName}</span>
                        <span className="text-muted-foreground">
                          {opponent.wins}-{opponent.losses} ({opponent.games} games)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
