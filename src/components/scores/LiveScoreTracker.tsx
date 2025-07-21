import { useState, useEffect } from 'react';
import { Plus, Minus, Save, X, Trash2, Trophy, Target, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { useToast } from '@/hooks/use-toast';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb } from '@/lib/supabase-database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LiveGame {
  id: string;
  game: string;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  date: string;
}

interface LiveScoreTrackerProps {
  onClose: () => void;
  onScoresSaved: () => void;
}

export function LiveScoreTracker({ onClose, onScoresSaved }: LiveScoreTrackerProps) {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [showNewGameForm, setShowNewGameForm] = useState(false);
  const [newGame, setNewGame] = useState({
    game: '',
    player2: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [filteredOpponents, setFilteredOpponents] = useState<string[]>([]);
  const { toast } = useToast();

  const gameTypes = [
    { value: 'Pool', label: 'Pool', icon: Trophy },
    { value: 'Darts', label: 'Darts', icon: Target },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  // Load previously entered opponents for autocomplete
  useEffect(() => {
    const loadOpponents = async () => {
      if (!supabaseAuth.isAuthenticated()) return;

      try {
        const uniqueOpponents = await supabaseDb.getUniqueOpponents();
        setOpponents(uniqueOpponents);
      } catch (error) {
        console.error('Failed to load opponents:', error);
      }
    };

    loadOpponents();
  }, []);

  // Filter opponents based on input
  useEffect(() => {
    if (newGame.player2) {
      const filtered = opponents.filter(opponent => 
        opponent.toLowerCase().includes(newGame.player2.toLowerCase())
      );
      setFilteredOpponents(filtered);
    } else {
      setFilteredOpponents([]);
    }
  }, [newGame.player2, opponents]);

  const addNewGame = () => {
    if (!newGame.game || !newGame.player2) {
      toast({
        title: "Missing information",
        description: "Please select a game type and enter opponent's name",
        variant: "destructive",
      });
      return;
    }

    const profile = supabaseAuth.getCurrentProfile();
    if (!profile) return;

    const game: LiveGame = {
      id: Date.now().toString(),
      game: newGame.game,
      player1: profile.name,
      player2: newGame.player2,
      score1: 0,
      score2: 0,
      date: format(new Date(), 'yyyy-MM-dd')
    };

    setGames(prev => [...prev, game]);
    setNewGame({ game: '', player2: '' });
    setShowNewGameForm(false);

    toast({
      title: "Game started!",
      description: `${newGame.game} game vs ${newGame.player2}`,
    });
  };

  const updateScore = (gameId: string, player: 'player1' | 'player2', change: number) => {
    setGames(prev => prev.map(game => {
      if (game.id === gameId) {
        const newScore = player === 'player1' ? 
          Math.max(0, game.score1 + change) : 
          Math.max(0, game.score2 + change);
        
        return {
          ...game,
          [player === 'player1' ? 'score1' : 'score2']: newScore
        };
      }
      return game;
    }));
  };

  const removeGame = (gameId: string) => {
    setGames(prev => prev.filter(game => game.id !== gameId));
    toast({
      title: "Game cancelled",
      description: "The game has been removed",
    });
  };

  const saveGame = async (game: LiveGame) => {
    if (!supabaseAuth.isAuthenticated()) return;

    setIsLoading(true);

    try {
      await supabaseDb.createScore(
        game.game,
        game.player1,
        game.player2,
        `${game.score1}-${game.score2}`,
        game.date
      );

      setGames(prev => prev.filter(g => g.id !== game.id));
      
      toast({
        title: "Score saved!",
        description: `${game.game}: ${game.score1}-${game.score2}`,
      });
    } catch (error) {
      toast({
        title: "Failed to save score",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAllGames = async () => {
    if (games.length === 0) return;

    setIsLoading(true);
    let savedCount = 0;

    for (const game of games) {
      try {
        if (!supabaseAuth.isAuthenticated()) continue;

        await supabaseDb.createScore(
          game.game,
          game.player1,
          game.player2,
          `${game.score1}-${game.score2}`,
          game.date
        );
        savedCount++;
      } catch (error) {
        console.error('Failed to save game:', error);
      }
    }

    setGames([]);
    setIsLoading(false);
    
    toast({
      title: "Games saved!",
      description: `${savedCount} game${savedCount !== 1 ? 's' : ''} saved successfully`,
    });

    onScoresSaved();
  };

  const getGameIcon = (gameType: string) => {
    const gameConfig = gameTypes.find(g => g.value === gameType);
    return gameConfig?.icon || Trophy;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Live Score Tracking</h2>
        <div className="flex gap-2">
          {games.length > 0 && (
            <Button onClick={saveAllGames} disabled={isLoading} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save All ({games.length})
            </Button>
          )}
          <Button variant="outline" onClick={onClose} size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Games */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {games.map((game) => {
          const Icon = getGameIcon(game.game);
          return (
            <Card key={game.id} className="shadow-card border-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5" />
                    {game.game}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveGame(game)}
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGame(game.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player 1 Score */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {game.player1} (You)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(game.id, 'player1', -1)}
                      disabled={game.score1 === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div 
                      className="flex-1 bg-blue-500 text-white text-center py-6 rounded-lg font-bold text-2xl cursor-pointer hover:bg-blue-600 transition-colors"
                      onClick={() => updateScore(game.id, 'player1', 1)}
                    >
                      {game.score1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(game.id, 'player1', 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Player 2 Score */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {game.player2}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(game.id, 'player2', -1)}
                      disabled={game.score2 === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div 
                      className="flex-1 bg-red-500 text-white text-center py-6 rounded-lg font-bold text-2xl cursor-pointer hover:bg-red-600 transition-colors"
                      onClick={() => updateScore(game.id, 'player2', 1)}
                    >
                      {game.score2}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateScore(game.id, 'player2', 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add New Game Card */}
        {!showNewGameForm ? (
          <Card className="shadow-card border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent 
              className="flex items-center justify-center p-8"
              onClick={() => setShowNewGameForm(true)}
            >
              <div className="text-center">
                <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Add New Game</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">New Game</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Game Type Selection */}
              <div className="space-y-2">
                <Label>Game Type</Label>
                <Select value={newGame.game} onValueChange={(value) => setNewGame(prev => ({ ...prev, game: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameTypes.map(({ value, label, icon: Icon }) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Opponent Input with Autocomplete */}
              <div className="space-y-2 relative">
                <Label>Opponent</Label>
                <Input
                  value={newGame.player2}
                  onChange={(e) => setNewGame(prev => ({ ...prev, player2: e.target.value }))}
                  placeholder="Enter opponent's name"
                />
                
                {/* Autocomplete Dropdown */}
                {filteredOpponents.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border rounded-md shadow-lg max-h-32 overflow-y-auto">
                    {filteredOpponents.map((opponent, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => {
                          setNewGame(prev => ({ ...prev, player2: opponent }));
                          setFilteredOpponents([]);
                        }}
                      >
                        {opponent}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <EnhancedButton onClick={addNewGame} size="sm" className="flex-1">
                  Start Game
                </EnhancedButton>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewGameForm(false);
                    setNewGame({ game: '', player2: '' });
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {games.length === 0 && !showNewGameForm && (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No active games. Click "Add New Game" to start tracking scores!</p>
        </div>
      )}
    </div>
  );
}