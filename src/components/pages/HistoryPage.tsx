import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { History, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/pageHeader';
import { FilterChip } from '@/components/ui/filterChip';
import { ScoreDayList } from '@/components/scores/ScoreDayList';
import { TrainingDayList } from '@/components/trainings/TrainingDayList';
import { Score, Training } from '@/lib/supabaseDatabase';
import { getGameTypeLabel, type GameType } from '@/lib/gameTypes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/authContext';
import { useScoresQuery, useTrainingsQuery } from '@/hooks/useTrackerData';

type ScoreWithFriend = Score & { friend_name?: string | null };

/** Margin at or under which a game counts as "close" (Statistics links here). */
const CLOSE_GAME_MARGIN = 2;

interface HistoryPageProps {
  view: 'score' | 'training';
}

interface FilterChipsRowProps {
  games: GameType[];
  gameFilter: string;
  onGameFilterChange: (value: string) => void;
  opponents?: string[];
  opponentFilter?: string;
  onOpponentFilterChange?: (value: string) => void;
  closeGamesOnly?: boolean;
  onCloseGamesOnlyChange?: (value: boolean) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  searchPlaceholder: string;
}

/**
 * One sticky row of tappable filters replaces the old full-width filter
 * card: search toggle + game types + most-played opponents.
 */
function FilterChipsRow({
  games,
  gameFilter,
  onGameFilterChange,
  opponents = [],
  opponentFilter = '',
  onOpponentFilterChange,
  closeGamesOnly = false,
  onCloseGamesOnlyChange,
  searchTerm,
  onSearchTermChange,
  searchPlaceholder,
}: FilterChipsRowProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const showSearch = isSearchOpen || !!searchTerm;

  return (
    <div className="sticky top-0 z-30 -mx-4 space-y-2 bg-background/95 px-4 py-2 backdrop-blur">
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
        <button
          type="button"
          aria-label={showSearch ? 'Hide search' : 'Search'}
          onClick={() => {
            if (showSearch) onSearchTermChange('');
            setIsSearchOpen(!showSearch);
          }}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
            showSearch
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground'
          )}
        >
          {showSearch ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
        </button>
        {/* The "close games" filter only arrives via the Statistics
            drill-down link — show its chip only while it's active. */}
        {closeGamesOnly && onCloseGamesOnlyChange && (
          <FilterChip label="Close games (≤2)" active onClick={() => onCloseGamesOnlyChange(false)} />
        )}
        <FilterChip label="All" active={gameFilter === 'all'} onClick={() => onGameFilterChange('all')} />
        {games.map((game) => (
          <FilterChip
            key={game}
            label={getGameTypeLabel(game)}
            active={gameFilter === game}
            onClick={() => onGameFilterChange(gameFilter === game ? 'all' : game)}
          />
        ))}
        {onOpponentFilterChange &&
          opponents.map((opponent) => (
            <FilterChip
              key={opponent}
              label={opponent.split(' ')[0]}
              active={opponentFilter === opponent}
              onClick={() => onOpponentFilterChange(opponentFilter === opponent ? '' : opponent)}
            />
          ))}
      </div>
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="h-10 pl-10"
          />
        </div>
      )}
    </div>
  );
}

export function HistoryPage({ view }: HistoryPageProps) {
  // Statistics drill-downs link here with ?game/?opponent/?close — read
  // once as initial state, then the chips own the filters.
  const [searchParams] = useSearchParams();
  const [scoreSearchTerm, setScoreSearchTerm] = useState('');
  const [scoreGameFilter, setScoreGameFilter] = useState<string>(searchParams.get('game') || 'all');
  const [opponentFilter, setOpponentFilter] = useState(searchParams.get('opponent') || '');
  const [closeGamesOnly, setCloseGamesOnly] = useState(searchParams.get('close') === '1');
  const [trainingSearchTerm, setTrainingSearchTerm] = useState('');
  const [trainingGameFilter, setTrainingGameFilter] = useState<string>('all');
  const { isAuthenticated, user } = useAuth();
  const currentUserId = isAuthenticated ? user?.id : undefined;
  const isQueryEnabled = !!currentUserId;
  const scoresQuery = useScoresQuery(currentUserId);
  const trainingsQuery = useTrainingsQuery(currentUserId);
  const scores: ScoreWithFriend[] = isAuthenticated ? (scoresQuery.data ?? []) : [];
  const trainings: Training[] = isAuthenticated ? (trainingsQuery.data ?? []) : [];
  const isLoading = isQueryEnabled && (scoresQuery.isLoading || trainingsQuery.isLoading);

  useEffect(() => {
    if (!scoresQuery.error && !trainingsQuery.error) return;
    console.error('Failed to load history data:', scoresQuery.error ?? trainingsQuery.error);
  }, [scoresQuery.error, trainingsQuery.error]);

  const filteredScores = useMemo(() => {
    return scores.filter((score) => {
      if (scoreGameFilter !== 'all' && score.game !== scoreGameFilter) {
        return false;
      }

      const displayName = score.friend_name || score.opponent_name || '';
      if (opponentFilter && displayName !== opponentFilter) {
        return false;
      }

      if (closeGamesOnly) {
        const [leftScore = 0, rightScore = 0] = score.score.split('-').map((part) => Number(part) || 0);
        if (Math.abs(leftScore - rightScore) > CLOSE_GAME_MARGIN) {
          return false;
        }
      }

      if (!scoreSearchTerm) {
        return true;
      }

      const searchLower = scoreSearchTerm.toLowerCase();
      const opponentName = score.opponent_name?.toLowerCase() || '';
      const friendName = score.friend_name?.toLowerCase() || '';
      return opponentName.includes(searchLower) || friendName.includes(searchLower);
    });
  }, [closeGamesOnly, opponentFilter, scoreGameFilter, scoreSearchTerm, scores]);

  const filteredTrainings = useMemo(() => {
    return trainings.filter((training) => {
      if (trainingGameFilter !== 'all' && training.game !== trainingGameFilter) {
        return false;
      }

      if (!trainingSearchTerm) {
        return true;
      }

      const searchLower = trainingSearchTerm.toLowerCase();
      return training.title.toLowerCase().includes(searchLower) || (training.notes || '').toLowerCase().includes(searchLower);
    });
  }, [trainingGameFilter, trainingSearchTerm, trainings]);

  const uniqueScoreGames = useMemo(() => [...new Set(scores.map((score) => score.game))], [scores]);
  const uniqueTrainingGames = useMemo(() => [...new Set(trainings.map((training) => training.game))], [trainings]);

  // Most-played opponents become one-tap chips — with a couple of regular
  // opponents this beats typing into a search field every time.
  const opponentChips = useMemo(() => {
    const countByName = new Map<string, number>();
    for (const score of scores) {
      const name = score.friend_name || score.opponent_name;
      if (!name) continue;
      countByName.set(name, (countByName.get(name) ?? 0) + 1);
    }
    const topNames = [...countByName.entries()]
      .sort((first, second) => second[1] - first[1])
      .slice(0, 6)
      .map(([name]) => name);
    // A URL-provided opponent may not be in the top six — surface it so
    // the active filter is always visible and dismissible.
    if (opponentFilter && !topNames.includes(opponentFilter)) {
      topNames.unshift(opponentFilter);
    }
    return topNames;
  }, [opponentFilter, scores]);

  const historyViewTabs = (
    <div className="flex items-center gap-2">
      <Link
        to="/history/score"
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
        to="/history/training"
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

  if (view === 'training') {
    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader
          title="History"
          description="Browse all your recorded training sessions"
          icon={History}
          actions={historyViewTabs}
        />

        <FilterChipsRow
          games={uniqueTrainingGames}
          gameFilter={trainingGameFilter}
          onGameFilterChange={setTrainingGameFilter}
          searchTerm={trainingSearchTerm}
          onSearchTermChange={setTrainingSearchTerm}
          searchPlaceholder="Search by training name or notes..."
        />

        <p className="px-1 text-xs text-muted-foreground">
          {filteredTrainings.length} {filteredTrainings.length === 1 ? 'training' : 'trainings'}
          {trainingSearchTerm || trainingGameFilter !== 'all' ? ` of ${trainings.length}` : ''}
        </p>

        {isLoading ? (
          <div className="space-y-3">
            <span className="sr-only">Loading your training history...</span>
            {[0, 1, 2, 3].map((skeletonIndex) => (
              <div key={skeletonIndex} aria-hidden="true" className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filteredTrainings.length > 0 ? (
          <TrainingDayList trainings={filteredTrainings} onTrainingUpdated={() => undefined} />
        ) : trainings.length > 0 ? (
          <div className="space-y-2 py-12 text-center">
            <div className="text-lg text-muted-foreground">No trainings match your filters</div>
            <div className="text-sm text-muted-foreground">Try adjusting your search or game filter</div>
          </div>
        ) : (
          <div className="space-y-2 py-12 text-center">
            <div className="text-lg text-muted-foreground">No trainings recorded yet</div>
            <div className="text-sm text-muted-foreground">Start by adding your first training on the home page</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="History"
        description="View and manage all your recorded games"
        icon={History}
        actions={historyViewTabs}
      />

      <FilterChipsRow
        games={uniqueScoreGames}
        gameFilter={scoreGameFilter}
        onGameFilterChange={setScoreGameFilter}
        opponents={opponentChips}
        opponentFilter={opponentFilter}
        onOpponentFilterChange={setOpponentFilter}
        closeGamesOnly={closeGamesOnly}
        onCloseGamesOnlyChange={setCloseGamesOnly}
        searchTerm={scoreSearchTerm}
        onSearchTermChange={setScoreSearchTerm}
        searchPlaceholder="Search by opponent name..."
      />

      <p className="px-1 text-xs text-muted-foreground">
        {filteredScores.length} {filteredScores.length === 1 ? 'game' : 'games'}
        {scoreSearchTerm || scoreGameFilter !== 'all' || opponentFilter || closeGamesOnly ? ` of ${scores.length}` : ''}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          <span className="sr-only">Loading your game history...</span>
          {[0, 1, 2, 3].map((skeletonIndex) => (
            <div key={skeletonIndex} aria-hidden="true" className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredScores.length > 0 ? (
        <ScoreDayList
          scores={filteredScores}
          currentUserId={currentUserId}
          onScoreUpdated={() => undefined}
        />
      ) : scores.length > 0 ? (
        <div className="space-y-2 py-12 text-center">
          <div className="text-lg text-muted-foreground">No games match your filters</div>
          <div className="text-sm text-muted-foreground">Try adjusting your search or game filter</div>
        </div>
      ) : (
        <div className="space-y-2 py-12 text-center">
          <div className="text-lg text-muted-foreground">No games recorded yet</div>
          <div className="text-sm text-muted-foreground">Start by adding your first score on the home page</div>
        </div>
      )}
    </div>
  );
}
