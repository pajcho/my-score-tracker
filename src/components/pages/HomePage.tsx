import {useEffect, useState} from 'react';
import {Calendar, Medal, Play, Plus, TrendingUp, Triangle, Trophy, Zap} from 'lucide-react';
import {Link} from 'react-router-dom';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {ScoreForm} from '@/components/scores/ScoreForm';
import {ScoreList} from '@/components/scores/ScoreList';
import {supabaseAuth} from '@/lib/supabase-auth';
import {Score, supabaseDb} from '@/lib/supabase-database';

export function HomePage() {
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scores, setScores] = useState<Score[]>([]);
  const [liveGameCount, setLiveGameCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(supabaseAuth.getCurrentProfile());

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [userScores, liveGames] = await Promise.all([
        supabaseDb.getScoresByUserId(),
        supabaseDb.getLiveGames(),
      ]);
      setScores(userScores);
      setLiveGameCount(liveGames.length);
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
        setLiveGameCount(0);
        setIsLoading(false);
      }
    });
  }, []);

  const handleScoreAdded = () => {
    setShowScoreForm(false);
    void loadDashboardData();
  };

  const gameIcons = {
    Pool: Triangle,
    'Ping Pong': Zap,
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
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-muted-foreground text-lg">Ready to track your game scores?</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* Add Score Section */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {showScoreForm ? 'Add New Score' : 'Quick Actions'}
          </CardTitle>
          <CardDescription>
            {showScoreForm ? 'Fill in the details of your game' : 'Start tracking your games'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showScoreForm ? (
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
                onClick={() => setShowScoreForm(true)}
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
            </div>
          ) : (
            <ScoreForm 
              onCancel={() => setShowScoreForm(false)}
              onSuccess={handleScoreAdded}
            />
          )}
        </CardContent>
      </Card>

      {/* Recent Scores */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Games
          </CardTitle>
          <CardDescription>
            Your latest score entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                {Object.entries(gameIcons).map(([game, Icon]) => (
                  <div key={game} className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-muted rounded-full">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">{game}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
