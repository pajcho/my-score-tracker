import { useState, useEffect } from 'react';
import { Plus, Triangle, Trophy, Zap, TrendingUp, Calendar, Medal, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScoreForm } from '@/components/scores/ScoreForm';
import { ScoreList } from '@/components/scores/ScoreList';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb, Score } from '@/lib/supabase-database';

export function HomePage() {
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scores, setScores] = useState<Score[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(supabaseAuth.getCurrentProfile());

  const loadScores = async () => {
    try {
      setIsLoading(true);
      const userScores = await supabaseDb.getScoresByUserId();
      setScores(userScores); // Store all scores for stats calculation
    } catch (error) {
      console.error('Failed to load scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = supabaseAuth.subscribe((authState) => {
      setUser(authState.profile);

      if (authState.isAuthenticated) {
        void loadScores();
      } else {
        setScores([]);
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleScoreAdded = () => {
    setShowScoreForm(false);
    loadScores();
  };

  const gameIcons = {
    Pool: Triangle,
    'Ping Pong': Zap,
  };

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
              {scores.length > 0 ? Math.round((scores.filter(s => {
                const [p1, p2] = s.score.split('-').map(Number);
                return p1 > p2;
              }).length / scores.length) * 100) : 0}%
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/live">
                <Button className="w-full">
                  <Play className="h-4 w-4" />
                  Start Live Game
                </Button>
              </Link>
              <Button 
                variant="outline"
                onClick={() => setShowScoreForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4" />
                Add Finished Score
              </Button>
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
              onScoreUpdated={loadScores}
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
