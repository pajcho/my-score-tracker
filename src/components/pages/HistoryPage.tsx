import { useState, useEffect } from 'react';
import { History, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScoreList } from '@/components/scores/ScoreList';
import { auth } from '@/lib/auth';
import { db, Score } from '@/lib/database';

export function HistoryPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [filteredScores, setFilteredScores] = useState<Score[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const user = auth.getCurrentUser();

  const loadScores = async () => {
    if (!user) return;
    
    try {
      const userScores = await db.getScoresByUserId(user.id);
      setScores(userScores);
      setFilteredScores(userScores);
    } catch (error) {
      console.error('Failed to load scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, [user]);

  useEffect(() => {
    let filtered = scores;

    // Filter by game
    if (gameFilter !== 'all') {
      filtered = filtered.filter(score => score.game === gameFilter);
    }

    // Filter by search term (player names)
    if (searchTerm) {
      filtered = filtered.filter(score => 
        score.player1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        score.player2.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredScores(filtered);
  }, [scores, gameFilter, searchTerm]);

  const uniqueGames = [...new Set(scores.map(score => score.game))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <History className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Score History</h1>
          <p className="text-muted-foreground">
            View and manage all your recorded games
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle>
            {filteredScores.length} {filteredScores.length === 1 ? 'Game' : 'Games'}
          </CardTitle>
          <CardDescription>
            {searchTerm || gameFilter !== 'all' 
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
              onScoreUpdated={loadScores}
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