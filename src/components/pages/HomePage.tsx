import {useEffect, useState} from 'react';
import {Calendar, Dumbbell, Medal, Play, Plus, TrendingUp, Trophy} from 'lucide-react';
import {Link} from 'react-router-dom';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {ScoreForm} from '@/components/scores/ScoreForm';
import {ScoreList} from '@/components/scores/ScoreList';
import {TrainingCard} from '@/components/trainings/TrainingCard';
import {TrainingForm} from '@/components/trainings/TrainingForm';
import {supabaseAuth} from '@/lib/supabase-auth';
import {Score, Training, supabaseDb} from '@/lib/supabase-database';
import {GAME_TYPE_OPTIONS} from '@/lib/game-types';
import { GameTypeIcon } from '@/components/ui/game-type-icon';

export function HomePage() {
  const [activeQuickAction, setActiveQuickAction] = useState<'score' | 'training' | null>(null);
  const [activeRecentTab, setActiveRecentTab] = useState<'scores' | 'trainings'>('scores');
  const [scores, setScores] = useState<Score[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [liveGameCount, setLiveGameCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(supabaseAuth.getCurrentProfile());

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [userScores, liveGames, userTrainings] = await Promise.all([
        supabaseDb.getScoresByUserId(),
        supabaseDb.getLiveGames(),
        supabaseDb.getTrainingsByUserId(),
      ]);
      setScores(userScores);
      setLiveGameCount(liveGames.length);
      setTrainings(userTrainings);
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
        void loadDashboardData();
      } else {
        setScores([]);
        setTrainings([]);
        setLiveGameCount(0);
        setIsLoading(false);
      }
    });
  }, []);

  const handleScoreAdded = () => {
    setActiveQuickAction(null);
    void loadDashboardData();
  };

  const handleTrainingAdded = () => {
    setActiveQuickAction(null);
    void loadDashboardData();
  };

  const currentUserId = supabaseAuth.getCurrentUser()?.id;
  const winCount = scores.filter((scoreEntry) => {
    const [firstScore, secondScore] = scoreEntry.score.split('-').map((scoreValue) => Number(scoreValue));
    if (Number.isNaN(firstScore) || Number.isNaN(secondScore) || !currentUserId) {
      return false;
    }

    const isScoreOwner = scoreEntry.user_id === currentUserId;
    const userScore = isScoreOwner ? firstScore : secondScore;
    const opponentScore = isScoreOwner ? secondScore : firstScore;

    return userScore > opponentScore;
  }).length;
  const winRate = scores.length > 0 ? Math.round((winCount / scores.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-2 sm:py-8">
        <h1 className="mx-auto max-w-full bg-gradient-primary bg-clip-text text-xl font-bold leading-tight text-transparent sm:mb-3 sm:text-4xl">
          Welcome back, {user?.name}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-lg">Ready to track your game scores?</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card border-0 hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scores.length}</div>
            <p className="text-xs text-muted-foreground">
              Games recorded
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {winRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Your success rate
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorite Game</CardTitle>
            <Medal className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                if (scores.length === 0) return 'Pool';
                const gameCounts = scores.reduce((acc, score) => {
                  acc[score.game] = (acc[score.game] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                
                return Object.keys(gameCounts).reduce((a, b) => 
                  gameCounts[a] > gameCounts[b] ? a : b
                );
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Most played game
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Sessions</CardTitle>
            <Dumbbell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainings.length}</div>
            <p className="text-xs text-muted-foreground">
              Logged sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Score Section */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {activeQuickAction === 'score' ? 'Add New Score' : activeQuickAction === 'training' ? 'Add Training' : 'Quick Actions'}
          </CardTitle>
          <CardDescription>
            {activeQuickAction === 'score'
              ? 'Fill in the details of your game'
              : activeQuickAction === 'training'
                ? 'Log what and how long you trained'
                : 'Start tracking your games and trainings'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activeQuickAction ? (
            <div className="flex flex-wrap gap-3">
              <Link to="/live" className="w-full sm:w-[280px]">
                <div className="h-full rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Play className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {liveGameCount > 0 ? `Continue Live Game (${liveGameCount})` : 'Start Live Game'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {liveGameCount > 0 ? 'You have active live tracking sessions' : 'Track points live in real time'}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setActiveQuickAction('score')}
                className="w-full sm:w-[280px] text-left"
              >
                <div className="h-full rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <Plus className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Add Finished Score</p>
                      <p className="text-sm text-muted-foreground">Save a game that is already completed</p>
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveQuickAction('training')}
                className="w-full sm:w-[280px] text-left"
              >
                <div className="h-full rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Add Training</p>
                      <p className="text-sm text-muted-foreground">Save a training session with notes and duration</p>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ) : activeQuickAction === 'score' ? (
            <ScoreForm
              onCancel={() => setActiveQuickAction(null)}
              onSuccess={handleScoreAdded}
            />
          ) : (
            <TrainingForm
              onCancel={() => setActiveQuickAction(null)}
              onSuccess={handleTrainingAdded}
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="order-2 sm:order-1">
            <CardTitle className="flex items-center gap-2">
              {activeRecentTab === 'scores' ? <Calendar className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
              {activeRecentTab === 'scores' ? 'Recent Scores' : 'Recent Trainings'}
            </CardTitle>
            <CardDescription>
              {activeRecentTab === 'scores' ? 'Your latest score entries' : 'Your latest training sessions'}
            </CardDescription>
          </div>
          <div className="order-1 sm:order-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveRecentTab('scores')}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-smooth ${
                activeRecentTab === 'scores'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Scores
            </button>
            <button
              type="button"
              onClick={() => setActiveRecentTab('trainings')}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-smooth ${
                activeRecentTab === 'trainings'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Trainings
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {activeRecentTab === 'scores' ? (
            isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading scores...
              </div>
            ) : scores.length > 0 ? (
              <ScoreList
                scores={scores.slice(0, 5)}
                onScoreUpdated={() => {
                  void loadDashboardData();
                }}
                compact={true}
              />
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="text-muted-foreground">
                  No scores recorded yet. Start your first game above!
                </div>
                <div className="flex justify-center gap-4">
                  {GAME_TYPE_OPTIONS.map(({ value, label }) => (
                    <div key={value} className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-muted rounded-full">
                        <GameTypeIcon gameType={value} className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading trainings...
            </div>
          ) : trainings.length > 0 ? (
            <div className="space-y-3">
              {trainings.slice(0, 5).map((training) => (
                <TrainingCard
                  key={training.id}
                  training={training}
                  notesClassName="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2"
                  showActions={true}
                  onTrainingUpdated={() => {
                    void loadDashboardData();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No trainings recorded yet. Add your first training above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
