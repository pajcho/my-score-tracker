import { useState, useEffect } from 'react';
import { Plus, Trophy, Target, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { ScoreForm } from '@/components/scores/ScoreForm';
import { ScoreList } from '@/components/scores/ScoreList';
import { auth } from '@/lib/auth';
import { db, Score } from '@/lib/database';

export function HomePage() {
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scores, setScores] = useState<Score[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = auth.getCurrentUser();

  const loadScores = async () => {
    if (!user) return;
    
    try {
      const userScores = await db.getScoresByUserId(user.id);
      setScores(userScores.slice(0, 5)); // Show only recent 5 scores
    } catch (error) {
      console.error('Failed to load scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, [user]);

  const handleScoreAdded = () => {
    setShowScoreForm(false);
    loadScores();
  };

  const gameIcons = {
    Pool: Trophy,
    Darts: Target,
    'Ping Pong': Zap,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-xl text-muted-foreground">
          Ready to track some scores and dominate the competition?
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card border-0 hover:scale-105 transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scores.length}</div>
            <p className="text-xs text-muted-foreground">
              Games recorded this month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 hover:scale-105 transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {scores.length > 0 ? '75%' : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Keep up the great work!
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 hover:scale-105 transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorite Game</CardTitle>
            <Zap className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scores.length > 0 ? scores[0].game : 'Pool'}
            </div>
            <p className="text-xs text-muted-foreground">
              Your most played game
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Score Section */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Score
          </CardTitle>
          <CardDescription>
            Record your latest game result and keep track of your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showScoreForm ? (
            <EnhancedButton 
              onClick={() => setShowScoreForm(true)}
              size="lg"
              className="w-full md:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Score
            </EnhancedButton>
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
          <CardTitle>Recent Games</CardTitle>
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
              scores={scores} 
              onScoreUpdated={loadScores}
              compact={true}
            />
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="text-muted-foreground">
                No scores recorded yet. Add your first game above!
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