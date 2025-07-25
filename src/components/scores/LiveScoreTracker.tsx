import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Minus, Save, X, Trash2, Triangle, Trophy, Zap, Users, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { OpponentAutocomplete } from '@/components/ui/opponent-autocomplete';
import { useToast } from '@/hooks/use-toast';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb } from '@/lib/supabase-database';
import { format } from 'date-fns';

interface LiveGame {
  id: string;
  game: string;
  opponent: string;
  opponentUserId?: string;
  score1: number;
  score2: number;
  date: string;
  startTime: Date;
}

interface LiveScoreTrackerProps {
  onClose: () => void;
  onScoresSaved: () => void;
  onActiveGamesChange?: (hasActiveGames: boolean) => void;
}

export function LiveScoreTracker({ onClose, onScoresSaved, onActiveGamesChange }: LiveScoreTrackerProps) {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [showNewGameForm, setShowNewGameForm] = useState(false);
  const [newGame, setNewGame] = useState({
    game: '',
    opponent: '',
    opponentType: 'custom' as 'custom' | 'friend',
    selectedFriend: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [friends, setFriends] = useState<{ id: string; name: string; email: string }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  const gameTypes = [
    { value: 'Pool', label: 'Pool', icon: Triangle },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Load previously entered opponents and friends for autocomplete
  useEffect(() => {
    const loadData = async () => {
      if (!supabaseAuth.isAuthenticated()) return;

      try {
        const [uniqueOpponents, userFriends] = await Promise.all([
          supabaseDb.getUniqueOpponents(),
          supabaseDb.getFriends()
        ]);
        setOpponents(uniqueOpponents);
        setFriends(userFriends);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  const addNewGame = () => {
    if (!newGame.game) {
      toast({
        title: "Missing information",
        description: "Please select a game type",
        variant: "destructive",
      });
      return;
    }

    if (newGame.opponentType === 'custom' && !newGame.opponent) {
      toast({
        title: "Missing information",
        description: "Please enter opponent's name",
        variant: "destructive",
      });
      return;
    }

    if (newGame.opponentType === 'friend' && !newGame.selectedFriend) {
      toast({
        title: "Missing information",
        description: "Please select a friend to play against",
        variant: "destructive",
      });
      return;
    }

    let opponentName = newGame.opponent;
    let opponentUserId: string | undefined;

    if (newGame.opponentType === 'friend' && newGame.selectedFriend) {
      const friend = friends.find(f => f.id === newGame.selectedFriend);
      if (friend) {
        opponentName = friend.name;
        opponentUserId = friend.id;
      }
    }

    const game: LiveGame = {
      id: Date.now().toString(),
      game: newGame.game,
      opponent: opponentName,
      opponentUserId,
      score1: 0,
      score2: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: new Date()
    };

    setGames(prev => {
      const newGames = [...prev, game];
      onActiveGamesChange?.(newGames.length > 0);
      return newGames;
    });
    setNewGame({ game: '', opponent: '', opponentType: 'custom', selectedFriend: '' });
    setShowNewGameForm(false);

    toast({
      title: "Game started!",
      description: `${newGame.game} game vs ${opponentName}`,
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
    setGames(prev => {
      const newGames = prev.filter(game => game.id !== gameId);
      onActiveGamesChange?.(newGames.length > 0);
      return newGames;
    });
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
        game.opponentUserId ? null : game.opponent, // If friend, don't store name
        `${game.score1}-${game.score2}`,
        game.date,
        game.opponentUserId
      );

      setGames(prev => {
        const newGames = prev.filter(g => g.id !== game.id);
        onActiveGamesChange?.(newGames.length > 0);
        return newGames;
      });
      
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
          game.opponentUserId ? null : game.opponent, // If friend, don't store name
          `${game.score1}-${game.score2}`,
          game.date,
          game.opponentUserId
        );
        savedCount++;
      } catch (error) {
        console.error('Failed to save game:', error);
      }
    }

    setGames([]);
    onActiveGamesChange?.(false);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => {
          const Icon = getGameIcon(game.game);
          return (
            <Card key={game.id} className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4" />
                    {game.game}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveGame(game)}
                      disabled={isLoading}
                      className="h-8 w-8 p-0"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGame(game.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-3">
                  {/* Main layout with controls on far sides */}
                  <div className="flex gap-3 items-end justify-between">
                    {/* Left player controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateScore(game.id, 'player1', 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateScore(game.id, 'player1', -1)}
                        disabled={game.score1 === 0}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Center - Both player scores */}
                    <div className="flex items-center gap-3 flex-1 justify-center">
                       {/* Your Score */}
                       <div className="text-center w-full">
                        <div className="text-xs font-medium text-muted-foreground mb-1 truncate">
                          You
                        </div>
                        <div 
                          className="bg-blue-500 text-white text-center py-4 px-6 rounded-lg font-bold text-2xl cursor-pointer hover:bg-blue-600 transition-colors flex items-center justify-center min-w-[80px]"
                          onClick={() => updateScore(game.id, 'player1', 1)}
                        >
                          {game.score1}
                        </div>
                      </div>

                       {/* Opponent Score */}
                       <div className="text-center w-full">
                        <div className="text-xs font-medium text-muted-foreground mb-1 truncate">
                          {game.opponent}
                        </div>
                        <div 
                          className="bg-red-500 text-white text-center py-4 px-6 rounded-lg font-bold text-2xl cursor-pointer hover:bg-red-600 transition-colors flex items-center justify-center min-w-[80px]"
                          onClick={() => updateScore(game.id, 'player2', 1)}
                        >
                          {game.score2}
                        </div>
                      </div>
                    </div>

                    {/* Right player controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateScore(game.id, 'player2', 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateScore(game.id, 'player2', -1)}
                        disabled={game.score2 === 0}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="text-center text-xs text-muted-foreground">
                    Started {formatDistanceToNow(game.startTime, { addSuffix: true })}
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

              {/* Opponent Selection */}
              <div className="space-y-4">
                <Label>Opponent</Label>
                <Tabs value={newGame.opponentType} onValueChange={(value) => setNewGame(prev => ({ ...prev, opponentType: value as 'custom' | 'friend' }))}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="custom" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Custom
                    </TabsTrigger>
                    <TabsTrigger value="friend" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Friend
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="custom" className="space-y-2">
                    <OpponentAutocomplete
                      value={newGame.opponent}
                      onChange={(value) => setNewGame(prev => ({ ...prev, opponent: value, selectedFriend: '' }))}
                      opponents={opponents}
                      required={newGame.opponentType === 'custom'}
                    />
                  </TabsContent>
                  
                  <TabsContent value="friend" className="space-y-2">
                    <Select value={newGame.selectedFriend} onValueChange={(value) => setNewGame(prev => ({ ...prev, selectedFriend: value, opponent: '' }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a friend" />
                      </SelectTrigger>
                      <SelectContent>
                        {friends.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No friends yet. Add friends to play against them!
                          </div>
                        ) : (
                          friends.map((friend) => (
                            <SelectItem key={friend.id} value={friend.id}>
                              {friend.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                </Tabs>
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
                    setNewGame({ game: '', opponent: '', opponentType: 'custom', selectedFriend: '' });
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
