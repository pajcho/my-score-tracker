import { useEffect, useMemo, useState } from 'react';
import {Link} from 'react-router-dom';
import {Filter, History, Search} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {ScoreList} from '@/components/scores/ScoreList';
import {TrainingCard} from '@/components/trainings/TrainingCard';
import { Score, Training } from '@/lib/supabase-database';
import {getGameTypeLabel} from '@/lib/game-types';
import {cn} from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-context';
import { useScoresQuery, useTrainingsQuery } from '@/hooks/use-tracker-data';
import { invalidateTrackerQueries } from '@/lib/query-cache';

type ScoreWithFriend = Score & { friend_name?: string | null };

interface HistoryPageProps {
  view: 'score' | 'training';
}

export function HistoryPage({ view }: HistoryPageProps) {
  const [scoreSearchTerm, setScoreSearchTerm] = useState('');
  const [scoreGameFilter, setScoreGameFilter] = useState<string>('all');
  const [trainingSearchTerm, setTrainingSearchTerm] = useState('');
  const [trainingGameFilter, setTrainingGameFilter] = useState<string>('all');
  const { isAuthenticated, user } = useAuth();
  const isQueryEnabled = isAuthenticated && !!user?.id;
  const scoresQuery = useScoresQuery(isQueryEnabled);
  const trainingsQuery = useTrainingsQuery(isQueryEnabled);
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

      if (!scoreSearchTerm) {
        return true;
      }

      const searchLower = scoreSearchTerm.toLowerCase();
      const opponentName = score.opponent_name?.toLowerCase() || '';
      const friendName = score.friend_name?.toLowerCase() || '';
      return opponentName.includes(searchLower) || friendName.includes(searchLower);
    });
  }, [scoreGameFilter, scoreSearchTerm, scores]);

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
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Training History</h1>
              <p className="text-muted-foreground">
                Browse all your recorded training sessions
              </p>
            </div>
          </div>
          {historyViewTabs}
        </div>

        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter trainings by game type or search by name and notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by training name or notes..."
                    value={trainingSearchTerm}
                    onChange={(event) => setTrainingSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={trainingGameFilter} onValueChange={setTrainingGameFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by game" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Games</SelectItem>
                    {uniqueTrainingGames.map((game) => (
                      <SelectItem key={game} value={game}>
                        {getGameTypeLabel(game)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle>
              {filteredTrainings.length} {filteredTrainings.length === 1 ? 'Training' : 'Trainings'}
            </CardTitle>
            <CardDescription>
              {trainingSearchTerm || trainingGameFilter !== 'all'
                ? `Filtered results from ${trainings.length} total trainings`
                : 'All your recorded trainings'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading your training history...
              </div>
            ) : filteredTrainings.length > 0 ? (
              <div className="space-y-3">
                {filteredTrainings.map((training) => (
                  <TrainingCard
                    key={training.id}
                    training={training}
                    showActions={true}
                    onTrainingUpdated={() => {
                      void invalidateTrackerQueries({ trainings: true });
                    }}
                  />
                ))}
              </div>
            ) : trainings.length > 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="text-muted-foreground text-lg">
                  No trainings match your filters
                </div>
                <div className="text-sm text-muted-foreground">
                  Try adjusting your search or game filter
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-2">
                <div className="text-muted-foreground text-lg">
                  No trainings recorded yet
                </div>
                <div className="text-sm text-muted-foreground">
                  Start by adding your first training on the home page
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Score History</h1>
            <p className="text-muted-foreground">
              View and manage all your recorded games
            </p>
          </div>
        </div>
        {historyViewTabs}
      </div>

      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter your scores by game type or search for specific opponents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by opponent name..."
                  value={scoreSearchTerm}
                  onChange={(event) => setScoreSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={scoreGameFilter} onValueChange={setScoreGameFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {uniqueScoreGames.map((game) => (
                    <SelectItem key={game} value={game}>
                      {getGameTypeLabel(game)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle>
            {filteredScores.length} {filteredScores.length === 1 ? 'Game' : 'Games'}
          </CardTitle>
          <CardDescription>
            {scoreSearchTerm || scoreGameFilter !== 'all'
              ? `Filtered results from ${scores.length} total games`
              : 'All your recorded games'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading your game history...
            </div>
          ) : filteredScores.length > 0 ? (
            <ScoreList
              scores={filteredScores}
              onScoreUpdated={() => {
                void invalidateTrackerQueries({ scores: true });
              }}
            />
          ) : scores.length > 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="text-muted-foreground text-lg">
                No games match your filters
              </div>
              <div className="text-sm text-muted-foreground">
                Try adjusting your search or game filter
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <div className="text-muted-foreground text-lg">
                No games recorded yet
              </div>
              <div className="text-sm text-muted-foreground">
                Start by adding your first score on the home page
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
