import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Filter, Trophy, Target, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb, Score } from '@/lib/supabase-database';

export function StatisticsPage() {
  const [searchParams] = useSearchParams();
  const [scores, setScores] = useState<Score[]>([]);
  const [filteredScores, setFilteredScores] = useState<Score[]>([]);
  const [gameFilter, setGameFilter] = useState<string>(searchParams.get('game') || 'all');
  const [opponentFilter, setOpponentFilter] = useState<string>(searchParams.get('opponent') || 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(supabaseAuth.getCurrentProfile());
  const [opponents, setOpponents] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [userScores, uniqueOpponents] = await Promise.all([
        supabaseDb.getScoresByUserId(),
        supabaseDb.getUniqueOpponents()
      ]);
      setScores(userScores);
      setOpponents(uniqueOpponents);
    } catch (error) {
      console.error('Failed to load scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = supabaseAuth.subscribe((authState) => {
      setUser(authState.profile);
      if (authState.profile) {
        loadData();
      } else {
        setScores([]);
        setOpponents([]);
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    let filtered = scores;

    if (gameFilter !== 'all') {
      filtered = filtered.filter(score => score.game === gameFilter);
    }

    if (opponentFilter !== 'all') {
      filtered = filtered.filter(score => score.opponent_name === opponentFilter);
    }

    setFilteredScores(filtered);
  }, [scores, gameFilter, opponentFilter]);

  const uniqueGames = [...new Set(scores.map(score => score.game))];
  const uniqueOpponents = [...new Set(scores.map(score => score.opponent_name).filter(Boolean))];

  // Calculate statistics
  const totalGames = filteredScores.length;
  const totalWins = filteredScores.filter(score => {
    const [player1Score, player2Score] = score.score.split('-').map(Number);
    return player1Score > player2Score;
  }).length;
  const totalLosses = totalGames - totalWins;
  const winPercentage = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const mostPlayedGame = uniqueGames.reduce((prev, game) => {
    const gameCount = filteredScores.filter(s => s.game === game).length;
    const prevCount = filteredScores.filter(s => s.game === prev).length;
    return gameCount > prevCount ? game : prev;
  }, uniqueGames[0] || 'N/A');

  const mostPlayedOpponent = uniqueOpponents.reduce((prev, opponent) => {
    const opponentCount = filteredScores.filter(s => s.opponent_name === opponent).length;
    const prevCount = filteredScores.filter(s => s.opponent_name === prev).length;
    return opponentCount > prevCount ? opponent : prev;
  }, uniqueOpponents[0] || 'N/A');

  const averageScore = totalGames > 0 ? 
    filteredScores.reduce((sum, score) => {
      const [player1Score] = score.score.split('-').map(Number);
      return sum + player1Score;
    }, 0) / totalGames : 0;

  const bestScore = filteredScores.reduce((best, score) => {
    const [player1Score] = score.score.split('-').map(Number);
    const [bestPlayer1Score] = (best?.score || '0-0').split('-').map(Number);
    return player1Score > bestPlayer1Score ? score : best;
  }, null as Score | null);

  const worstScore = filteredScores.reduce((worst, score) => {
    const [player1Score] = score.score.split('-').map(Number);
    const [worstPlayer1Score] = (worst?.score || '999-999').split('-').map(Number);
    return player1Score < worstPlayer1Score ? score : worst;
  }, null as Score | null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-muted-foreground">
            Analyze your gaming performance and track your progress
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter statistics by game type or opponent
          </CardDescription>
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
                  {uniqueGames.map(game => (
                    <SelectItem key={game} value={game}>
                      {game}
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
                  {uniqueOpponents.map(opponent => (
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
        <div className="text-center py-12 text-muted-foreground">
          Loading statistics...
        </div>
      ) : totalGames === 0 ? (
        <Card className="shadow-card border-0">
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground text-lg">
              No games found matching your filters
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Try adjusting your filters or add more games
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-card border-0 hover:scale-105 transition-smooth">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                <Trophy className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalGames}</div>
                <p className="text-xs text-muted-foreground">
                  Games played
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0 hover:scale-105 transition-smooth">
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

            <Card className="shadow-card border-0 hover:scale-105 transition-smooth">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Target className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  Points per game
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0 hover:scale-105 transition-smooth">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favorite Game</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mostPlayedGame}</div>
                <p className="text-xs text-muted-foreground">
                  Most played
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Game Performance</CardTitle>
                <CardDescription>
                  Your best and worst performances
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                  <div>
                    <div className="font-medium text-secondary">Best Game</div>
                    <div className="text-sm text-muted-foreground">
                      {bestScore ? `${bestScore.game} vs ${bestScore.opponent_name || 'Friend'}` : 'N/A'}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-secondary">
                    {bestScore?.score || 'N/A'}
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">Worst Game</div>
                    <div className="text-sm text-muted-foreground">
                      {worstScore ? `${worstScore.game} vs ${worstScore.opponent_name || 'Friend'}` : 'N/A'}
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {worstScore?.score || 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Social Stats</CardTitle>
                <CardDescription>
                  Your gaming companions and preferences
                </CardDescription>
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
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Games Played</span>
                    <span className="font-medium">{uniqueGames.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}