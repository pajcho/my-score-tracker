import {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {Filter, History, Search} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {ScoreList} from '@/components/scores/ScoreList';
import {GameTypeIcon} from '@/components/ui/game-type-icon';
import {supabaseAuth} from '@/lib/supabase-auth';
import {Score, Training, supabaseDb} from '@/lib/supabase-database';
import {getGameTypeLabel} from '@/lib/game-types';
import {cn} from '@/lib/utils';

type ScoreWithFriend = Score & { friend_name?: string | null };

interface HistoryPageProps {
  view: 'scores' | 'training';
}

export function HistoryPage({ view }: HistoryPageProps) {
  const [scores, setScores] = useState<ScoreWithFriend[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scoreSearchTerm, setScoreSearchTerm] = useState('');
  const [scoreGameFilter, setScoreGameFilter] = useState<string>('all');
  const [trainingSearchTerm, setTrainingSearchTerm] = useState('');
  const [trainingGameFilter, setTrainingGameFilter] = useState<string>('all');
  const [, setUser] = useState(supabaseAuth.getCurrentProfile());

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [userScores, userTrainings] = await Promise.all([
        supabaseDb.getScoresByUserId() as Promise<ScoreWithFriend[]>,
        supabaseDb.getTrainingsByUserId(),
      ]);
      setScores(userScores);
      setTrainings(userTrainings);
    } catch (error) {
      console.error('Failed to load history data:', error);
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
        setTrainings([]);
        setIsLoading(false);
      }
    });
  }, []);

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
        to="/history/scores"
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm font-medium transition-smooth',
          view === 'scores'
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
        Training
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
                  <div key={training.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <GameTypeIcon gameType={training.game} className="mt-2 hidden h-8 w-8 shrink-0 text-muted-foreground sm:block" />
                        <div>
                          <p className="font-semibold text-foreground">{training.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {getGameTypeLabel(training.game)} • {new Date(training.training_date).toLocaleDateString()}
                          </p>
                          {training.notes ? (
                            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                              {training.notes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-foreground">
                        {training.duration_minutes} min
                      </div>
                    </div>
                  </div>
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
              onScoreUpdated={loadData}
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
