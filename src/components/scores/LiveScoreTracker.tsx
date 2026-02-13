import { useState, useEffect, useRef } from 'react';
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
import { supabaseDb, LiveGameView } from '@/lib/supabase-database';
import { format } from 'date-fns';

interface LiveScoreTrackerProps {
  onClose: () => void;
  onScoresSaved: () => void;
  onActiveGamesChange?: (hasActiveGames: boolean) => void;
}

export function LiveScoreTracker({ onClose, onScoresSaved, onActiveGamesChange }: LiveScoreTrackerProps) {
  const [games, setGames] = useState<LiveGameView[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showNewGameForm, setShowNewGameForm] = useState(false);
  const [newGame, setNewGame] = useState({
    game: 'Pool',
    opponent: '',
    opponentType: 'friend' as 'custom' | 'friend',
    selectedFriend: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [friends, setFriends] = useState<{ id: string; name: string; email: string }[]>([]);
  const [, setTimeTicker] = useState(new Date());
  const hasLoadedAfterAuth = useRef(false);
  const { toast } = useToast();
  const currentUser = supabaseAuth.getCurrentUser();

  const gameTypes = [
    { value: 'Pool', label: 'Pool', icon: Triangle },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTicker(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Load initial data and subscribe to realtime updates for live games
  useEffect(() => {
    let isMounted = true;

    const loadLiveGames = async () => {
      try {
        const userLiveGames = await supabaseDb.getLiveGames();
        if (isMounted) {
          setGames(userLiveGames);
        }
      } catch (error) {
        if (isMounted && supabaseAuth.isAuthenticated()) {
          console.error('Failed to load live games:', error);
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    const loadData = async () => {
      try {
        const [uniqueOpponents, userFriends] = await Promise.all([
          supabaseDb.getUniqueOpponents(),
          supabaseDb.getFriends(),
        ]);
        if (isMounted) {
          setOpponents(uniqueOpponents);
          setFriends(userFriends);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    const unsubscribeAuth = supabaseAuth.subscribe((authState) => {
      if (!isMounted || authState.isLoading) return;

      if (!authState.isAuthenticated) {
        hasLoadedAfterAuth.current = false;
        setGames([]);
        setIsInitialLoading(false);
        return;
      }

      if (hasLoadedAfterAuth.current) return;
      hasLoadedAfterAuth.current = true;
      void loadData();
      void loadLiveGames();
    });

    const unsubscribe = supabaseDb.subscribeToLiveGames(() => {
      void loadLiveGames();
    });

    const refreshLiveGamesIfAuthenticated = () => {
      if (!supabaseAuth.isAuthenticated()) return;
      void loadLiveGames();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLiveGamesIfAuthenticated();
      }
    };

    const handleWindowFocus = () => {
      refreshLiveGamesIfAuthenticated();
    };

    const handleNetworkReconnect = () => {
      refreshLiveGamesIfAuthenticated();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleNetworkReconnect);

    const fallbackRefreshInterval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshLiveGamesIfAuthenticated();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(fallbackRefreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleNetworkReconnect);
      unsubscribeAuth();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    onActiveGamesChange?.(games.length > 0);
  }, [games, onActiveGamesChange]);

  const addNewGame = async () => {
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

    setIsLoading(true);

    try {
      const createdLiveGame = await supabaseDb.createLiveGame(
        newGame.game,
        opponentUserId ? null : opponentName,
        format(new Date(), 'yyyy-MM-dd'),
        opponentUserId
      );

      setGames(prev => [
        ...prev,
        {
          ...createdLiveGame,
          creator_name: currentUser?.user_metadata?.name,
          opponent_user_name: opponentUserId ? opponentName : undefined,
        },
      ]);
      setNewGame({ game: 'Pool', opponent: '', opponentType: 'friend', selectedFriend: '' });
      setShowNewGameForm(false);

      toast({
        title: "Game started!",
        description: `${newGame.game} game vs ${opponentName}`,
      });
    } catch (error) {
      toast({
        title: "Failed to start game",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateScore = (gameId: string, player: 'player1' | 'player2', change: number) => {
    const gameToUpdate = games.find((game) => game.id === gameId);
    if (!gameToUpdate) return;

    const nextScore1 = player === 'player1'
      ? Math.max(0, gameToUpdate.score1 + change)
      : gameToUpdate.score1;
    const nextScore2 = player === 'player2'
      ? Math.max(0, gameToUpdate.score2 + change)
      : gameToUpdate.score2;

    setGames((previousGames) =>
      previousGames.map((game) =>
        game.id === gameId
          ? { ...game, score1: nextScore1, score2: nextScore2 }
          : game
      )
    );

    void supabaseDb
      .updateLiveGameScore(gameId, nextScore1, nextScore2)
      .catch(() => {
        toast({
          title: "Failed to sync score",
          description: "Your score change could not be saved",
          variant: "destructive",
        });
      });
  };

  const removeGame = async (gameId: string) => {
    try {
      await supabaseDb.deleteLiveGame(gameId);
      toast({
        title: "Game cancelled",
        description: "The game has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to cancel game",
        description: "Only the game creator can cancel this game",
        variant: "destructive",
      });
    }
  };

  const saveGame = async (game: LiveGameView) => {
    if (!supabaseAuth.isAuthenticated()) return;
    if (!currentUser || game.created_by_user_id !== currentUser.id) {
      toast({
        title: "Cannot save game",
        description: "Only the game creator can save the final score",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await supabaseDb.completeLiveGame(game.id);

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
    if (!currentUser) return;

    setIsLoading(true);
    let savedCount = 0;

    for (const game of games.filter((activeGame) => activeGame.created_by_user_id === currentUser.id)) {
      try {
        await supabaseDb.completeLiveGame(game.id);
        savedCount++;
      } catch (error) {
        console.error('Failed to save game:', error);
      }
    }

    setIsLoading(false);
    
    toast({
      title: "Games saved!",
      description: `${savedCount} game${savedCount !== 1 ? 's' : ''} saved successfully`,
    });

    if (savedCount > 0) {
      onScoresSaved();
    }
  };

  const getGameIcon = (gameType: string) => {
    const gameConfig = gameTypes.find(g => g.value === gameType);
    return gameConfig?.icon || Trophy;
  };

  const ownGamesCount = currentUser
    ? games.filter((game) => game.created_by_user_id === currentUser.id).length
    : 0;
  const orderedGames = [...games]
    .sort((firstGame, secondGame) =>
      new Date(firstGame.started_at).getTime() - new Date(secondGame.started_at).getTime()
    )
    .sort((firstGame, secondGame) => {
      const firstIsParticipant = currentUser
        ? firstGame.created_by_user_id === currentUser.id || firstGame.opponent_user_id === currentUser.id
        : false;
      const secondIsParticipant = currentUser
        ? secondGame.created_by_user_id === currentUser.id || secondGame.opponent_user_id === currentUser.id
        : false;

      if (firstIsParticipant === secondIsParticipant) return 0;
      return firstIsParticipant ? -1 : 1;
    });

  if (isInitialLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Loading live games...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Live Score Tracking</h2>
        <div className="flex gap-2">
          {ownGamesCount > 0 && (
            <Button onClick={saveAllGames} disabled={isLoading} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save All ({ownGamesCount})
            </Button>
          )}
          <Button variant="outline" onClick={onClose} size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Games */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orderedGames.map((game) => {
          const Icon = getGameIcon(game.game);
          const isGameCreator = currentUser?.id === game.created_by_user_id;
          const isGameOpponent = currentUser?.id === game.opponent_user_id;
          const isSpectator = !isGameCreator && !isGameOpponent;
          const creatorName = game.creator_name || 'Unknown player';
          const opponentName = game.opponent_name || game.opponent_user_name || 'Unknown opponent';
          const leftPlayerLabel = isGameCreator ? 'You' : creatorName;
          const rightPlayerLabel = isGameOpponent ? 'You' : opponentName;
          const leftPlayer: 'player1' | 'player2' = 'player1';
          const rightPlayer: 'player1' | 'player2' = 'player2';
          const leftScore = game.score1;
          const rightScore = game.score2;
          const disableGameInteractions = isSpectator || isLoading;
          return (
            <Card key={game.id} className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between min-h-8 gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4" />
                    {game.game}
                  </CardTitle>
                  <div className="w-40 shrink-0">
                    {isGameCreator ? (
                      <div className="flex justify-end gap-1">
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
                    ) : (
                      <span className="block text-right text-xs text-muted-foreground leading-8">
                        {isSpectator ? 'Watching (read-only)' : 'Synced live'}
                      </span>
                    )}
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
                        onClick={() => updateScore(game.id, leftPlayer, 1)}
                        disabled={disableGameInteractions}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateScore(game.id, leftPlayer, -1)}
                        disabled={disableGameInteractions || leftScore === 0}
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
                          {leftPlayerLabel}
                        </div>
                        <div 
                          className={`bg-blue-500 text-white text-center py-4 px-6 rounded-lg font-bold text-2xl flex items-center justify-center min-w-[80px] ${isSpectator ? 'opacity-55' : ''} ${disableGameInteractions ? 'cursor-default' : 'cursor-pointer hover:bg-blue-600 transition-colors'}`}
                          onClick={disableGameInteractions ? undefined : () => updateScore(game.id, leftPlayer, 1)}
                        >
                          {leftScore}
                        </div>
                      </div>

                       {/* Opponent Score */}
                       <div className="text-center w-full">
                        <div className="text-xs font-medium text-muted-foreground mb-1 truncate">
                          {rightPlayerLabel}
                        </div>
                        <div 
                          className={`bg-red-500 text-white text-center py-4 px-6 rounded-lg font-bold text-2xl flex items-center justify-center min-w-[80px] ${isSpectator ? 'opacity-55' : ''} ${disableGameInteractions ? 'cursor-default' : 'cursor-pointer hover:bg-red-600 transition-colors'}`}
                          onClick={disableGameInteractions ? undefined : () => updateScore(game.id, rightPlayer, 1)}
                        >
                          {rightScore}
                        </div>
                      </div>
                    </div>

                    {/* Right player controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateScore(game.id, rightPlayer, 1)}
                        disabled={disableGameInteractions}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateScore(game.id, rightPlayer, -1)}
                        disabled={disableGameInteractions || rightScore === 0}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="text-center text-xs text-muted-foreground">
                    Started {formatDistanceToNow(new Date(game.started_at), { addSuffix: true })}
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
                <EnhancedButton onClick={addNewGame} size="sm" className="flex-1" disabled={isLoading}>
                  Start Game
                </EnhancedButton>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewGameForm(false);
                    setNewGame({ game: 'Pool', opponent: '', opponentType: 'friend', selectedFriend: '' });
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
