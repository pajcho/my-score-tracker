import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { Plus, Minus, Save, Trash2, Triangle, Trophy, Zap, Users, User, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { OpponentAutocomplete } from '@/components/ui/opponent-autocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabaseAuth } from '@/lib/supabase-auth';
import {
  supabaseDb,
  BreakRule,
  LiveGameView,
  PoolGameSettingsInput,
  PlayerSide,
} from '@/lib/supabase-database';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LiveScoreTrackerProps {
  onClose: () => void;
  onScoresSaved: () => void;
  onActiveGamesChange?: (hasActiveGames: boolean) => void;
}

const getOppositePlayerSide = (playerSide: PlayerSide): PlayerSide => (playerSide === 'player1' ? 'player2' : 'player1');

const getFirstBreakerSide = (selection: 'player1' | 'player2' | 'random'): PlayerSide => {
  if (selection === 'random') {
    return Math.random() < 0.5 ? 'player1' : 'player2';
  }

  return selection;
};

const getAlternateBreakerFromRackCount = (firstBreakerSide: PlayerSide, completedRackCount: number): PlayerSide => {
  return completedRackCount % 2 === 0 ? firstBreakerSide : getOppositePlayerSide(firstBreakerSide);
};

const toggleOptionClassName =
  "h-10 justify-start rounded-md px-3 text-foreground hover:bg-muted/60 hover:text-foreground dark:bg-muted/40 dark:hover:bg-muted/55 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground data-[state=on]:shadow-none dark:data-[state=on]:bg-muted/65";

const compactToggleOptionClassName =
  "h-9 justify-start rounded-md px-3 text-xs text-foreground hover:bg-muted/60 hover:text-foreground dark:bg-muted/40 dark:hover:bg-muted/55 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground data-[state=on]:shadow-none dark:data-[state=on]:bg-muted/65";

export function LiveScoreTracker({ onClose, onScoresSaved, onActiveGamesChange }: LiveScoreTrackerProps) {
  const [games, setGames] = useState<LiveGameView[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showNewGameForm, setShowNewGameForm] = useState(false);
  const [newGame, setNewGame] = useState({
    game: 'Pool',
    opponent: '',
    opponentType: 'friend' as 'custom' | 'friend',
    selectedFriend: '',
    breakRule: 'alternate' as BreakRule,
    firstBreakerSelection: 'random' as 'player1' | 'player2' | 'random',
  });
  const [isRuleSectionExpanded, setIsRuleSectionExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [friends, setFriends] = useState<{ id: string; name: string; email: string }[]>([]);
  const [syncClock, setSyncClock] = useState(new Date());
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [decrementBreakerPrompt, setDecrementBreakerPrompt] = useState<{
    gameId: string;
    nextScore1: number;
    nextScore2: number;
    settingsPatch: Partial<PoolGameSettingsInput>;
  } | null>(null);
  const [expandedPoolSettingsByGameId, setExpandedPoolSettingsByGameId] = useState<Record<string, boolean>>({});
  const hasLoadedAfterAuth = useRef(false);
  const { toast } = useToast();
  const currentUser = supabaseAuth.getCurrentUser();

  const gameTypes = [
    { value: 'Pool', label: 'Pool', icon: Triangle },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  const updateGameLocally = (
    gameId: string,
    nextScore1: number,
    nextScore2: number,
    poolSettingsPatch?: Partial<PoolGameSettingsInput>
  ) => {
    setGames((previousGames) =>
      previousGames.map((game) =>
        game.id !== gameId
          ? game
          : {
              ...game,
              score1: nextScore1,
              score2: nextScore2,
              pool_settings: game.pool_settings
                ? {
                    ...game.pool_settings,
                    ...(poolSettingsPatch?.break_rule !== undefined ? { break_rule: poolSettingsPatch.break_rule } : {}),
                    ...(poolSettingsPatch?.first_breaker_side !== undefined
                      ? { first_breaker_side: poolSettingsPatch.first_breaker_side }
                      : {}),
                    ...(poolSettingsPatch?.current_breaker_side !== undefined
                      ? { current_breaker_side: poolSettingsPatch.current_breaker_side }
                      : {}),
                    ...(poolSettingsPatch?.last_rack_winner_side !== undefined
                      ? { last_rack_winner_side: poolSettingsPatch.last_rack_winner_side }
                      : {}),
                  }
                : undefined,
            }
      )
    );
  };

  const persistScoreUpdate = async (
    gameId: string,
    nextScore1: number,
    nextScore2: number,
    poolSettingsPatch?: Partial<PoolGameSettingsInput>
  ) => {
    updateGameLocally(gameId, nextScore1, nextScore2, poolSettingsPatch);
    try {
      await supabaseDb.updateLiveGameScore(gameId, nextScore1, nextScore2, poolSettingsPatch);
    } catch (error) {
      toast({
        title: "Failed to sync score",
        description: "Your score change could not be saved",
        variant: "destructive",
      });
    }
  };

  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncClock(new Date());
    }, 1000);

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
          setLastSyncedAt(new Date());
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
      const firstBreakerSide = getFirstBreakerSide(newGame.firstBreakerSelection);
      const initialPoolSettings = newGame.game === 'Pool'
        ? {
            break_rule: newGame.breakRule,
            first_breaker_side: firstBreakerSide,
            current_breaker_side: firstBreakerSide,
            last_rack_winner_side: null,
          }
        : undefined;

      const createdLiveGame = await supabaseDb.createLiveGame(
        newGame.game,
        opponentUserId ? null : opponentName,
        format(new Date(), 'yyyy-MM-dd'),
        opponentUserId,
        initialPoolSettings
      );

      setGames(prev => [
        ...prev,
        {
          ...createdLiveGame,
          creator_name: currentUser?.user_metadata?.name,
          opponent_user_name: opponentUserId ? opponentName : undefined,
          pool_settings: initialPoolSettings
            ? {
                id: `temp-${createdLiveGame.id}`,
                live_game_id: createdLiveGame.id,
                score_id: null,
                created_by_user_id: createdLiveGame.created_by_user_id,
                ...initialPoolSettings,
                created_at: createdLiveGame.created_at,
                updated_at: createdLiveGame.updated_at,
              }
            : undefined,
        },
      ]);
      setNewGame({
        game: 'Pool',
        opponent: '',
        opponentType: 'friend',
        selectedFriend: '',
        breakRule: 'alternate',
        firstBreakerSelection: 'random',
      });
      setIsRuleSectionExpanded(false);
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

  const updateScore = (gameId: string, player: PlayerSide, change: 1 | -1) => {
    const gameToUpdate = games.find((game) => game.id === gameId);
    if (!gameToUpdate) return;

    const nextScore1 = player === 'player1'
      ? Math.max(0, gameToUpdate.score1 + change)
      : gameToUpdate.score1;
    const nextScore2 = player === 'player2'
      ? Math.max(0, gameToUpdate.score2 + change)
      : gameToUpdate.score2;

    const isNoopChange = nextScore1 === gameToUpdate.score1 && nextScore2 === gameToUpdate.score2;
    if (isNoopChange) {
      return;
    }

    if (gameToUpdate.game !== 'Pool' || !gameToUpdate.pool_settings) {
      void persistScoreUpdate(gameId, nextScore1, nextScore2);
      return;
    }

    const poolSettings = gameToUpdate.pool_settings;
    const breakRule = poolSettings.break_rule;

    if (change === 1) {
      if (breakRule === 'alternate') {
        const completedRackCountBeforeChange = gameToUpdate.score1 + gameToUpdate.score2;
        const currentBreakerSide = poolSettings.current_breaker_side;
        const nextBreakerSide = currentBreakerSide
          ? getOppositePlayerSide(currentBreakerSide)
          : getAlternateBreakerFromRackCount(poolSettings.first_breaker_side, completedRackCountBeforeChange + 1);

        void persistScoreUpdate(gameId, nextScore1, nextScore2, {
          current_breaker_side: nextBreakerSide,
          last_rack_winner_side: player,
        });
        return;
      }

      void persistScoreUpdate(gameId, nextScore1, nextScore2, {
        current_breaker_side: player,
        last_rack_winner_side: player,
      });
      return;
    }

    if (breakRule === 'alternate') {
      const completedRackCountAfterChange = nextScore1 + nextScore2;
      void persistScoreUpdate(gameId, nextScore1, nextScore2, {
        current_breaker_side: getAlternateBreakerFromRackCount(
          poolSettings.first_breaker_side,
          completedRackCountAfterChange
        ),
        last_rack_winner_side: null,
      });
      return;
    }

    setDecrementBreakerPrompt({
      gameId,
      nextScore1,
      nextScore2,
      settingsPatch: {
        last_rack_winner_side: null,
      },
    });
  };

  const applyManualBreakerAfterDecrement = (nextBreakerSide: PlayerSide) => {
    if (!decrementBreakerPrompt) return;

    const { gameId, nextScore1, nextScore2, settingsPatch } = decrementBreakerPrompt;
    setDecrementBreakerPrompt(null);

    void persistScoreUpdate(gameId, nextScore1, nextScore2, {
      ...settingsPatch,
      current_breaker_side: nextBreakerSide,
    });
  };

  const togglePoolSettingsPanel = (gameId: string) => {
    setExpandedPoolSettingsByGameId((previousState) => ({
      ...previousState,
      [gameId]: !previousState[gameId],
    }));
  };

  const changeBreakerSide = (game: LiveGameView, nextBreakerSide: PlayerSide) => {
    void persistScoreUpdate(game.id, game.score1, game.score2, {
      current_breaker_side: nextBreakerSide,
    });
  };

  const changeBreakRule = (game: LiveGameView, breakRule: BreakRule) => {
    if (!game.pool_settings) return;

    const completedRackCount = game.score1 + game.score2;
    const nextBreakerForAlternate = getAlternateBreakerFromRackCount(
      game.pool_settings.first_breaker_side,
      completedRackCount
    );

    void persistScoreUpdate(game.id, game.score1, game.score2, {
      break_rule: breakRule,
      ...(breakRule === 'alternate' ? { current_breaker_side: nextBreakerForAlternate } : {}),
    });
  };

  const removeGame = async (gameId: string) => {
    try {
      await supabaseDb.deleteLiveGame(gameId);
      setGames((previousGames) => previousGames.filter((game) => game.id !== gameId));
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
      setGames((previousGames) => previousGames.filter((activeGame) => activeGame.id !== game.id));

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
    const savedGameIds: string[] = [];

    for (const game of games.filter((activeGame) => activeGame.created_by_user_id === currentUser.id)) {
      try {
        await supabaseDb.completeLiveGame(game.id);
        savedGameIds.push(game.id);
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

    if (savedGameIds.length > 0) {
      setGames((previousGames) =>
        previousGames.filter((game) => !savedGameIds.includes(game.id))
      );
    }

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
  const secondsSinceLastSync = lastSyncedAt
    ? Math.floor((syncClock.getTime() - lastSyncedAt.getTime()) / 1000)
    : null;
  const syncStatusText = (() => {
    if (!lastSyncedAt) return 'Syncing...';
    if ((secondsSinceLastSync ?? 0) <= 1) return 'Synced now';
    return `Synced ${formatDistanceToNowStrict(lastSyncedAt, { addSuffix: true })}`;
  })();
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold leading-tight">Live Score Tracking</h2>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center self-center"
                aria-label={syncStatusText}
                title={syncStatusText}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto px-3 py-1.5 text-sm" align="start">
              {syncStatusText}
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-4 sm:gap-3 text-sm">
          {ownGamesCount > 0 && (
            <button
              type="button"
              onClick={saveAllGames}
              disabled={isLoading}
              className="text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              Save all ({ownGamesCount})
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Close
          </button>
        </div>
      </div>
      {/* Active Games */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orderedGames.map((game) => {
          const Icon = getGameIcon(game.game);
          const isPoolGame = game.game === 'Pool' && !!game.pool_settings;
          const isGameCreator = currentUser?.id === game.created_by_user_id;
          const isGameOpponent = currentUser?.id === game.opponent_user_id;
          const isSpectator = !isGameCreator && !isGameOpponent;
          const creatorName = game.creator_name || 'Unknown player';
          const opponentName = game.opponent_name || game.opponent_user_name || 'Unknown opponent';
          const leftPlayerLabel = isGameCreator ? 'You' : creatorName;
          const rightPlayerLabel = isGameOpponent ? 'You' : opponentName;
          const leftPlayer: PlayerSide = 'player1';
          const rightPlayer: PlayerSide = 'player2';
          const leftScore = game.score1;
          const rightScore = game.score2;
          const nextBreakerSide = game.pool_settings?.current_breaker_side;
          const isPoolSettingsExpanded = !!expandedPoolSettingsByGameId[game.id];
          const disableGameInteractions = isSpectator || isLoading;
          return (
            <Card key={game.id} className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between min-h-8 gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4" />
                    {game.game}
                  </CardTitle>
                  <div className="shrink-0 flex items-center justify-end gap-1">
                    {isPoolGame && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePoolSettingsPanel(game.id)}
                        className="h-8 w-8 p-0"
                        aria-label="Toggle pool settings"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
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
                  {isPoolGame && isPoolSettingsExpanded && (
                    <div className="rounded-md border border-border p-2 text-xs">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Break Rule</Label>
                          <Select
                            value={game.pool_settings?.break_rule || 'alternate'}
                            onValueChange={(value) => changeBreakRule(game, value as BreakRule)}
                            disabled={isSpectator || isLoading}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alternate">Alternate</SelectItem>
                              <SelectItem value="winner_stays">Winner stays</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Next Break</Label>
                          <Select
                            value={nextBreakerSide || 'player1'}
                            onValueChange={(value) => changeBreakerSide(game, value as PlayerSide)}
                            disabled={isSpectator || isLoading}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="player1">{leftPlayerLabel}</SelectItem>
                              <SelectItem value="player2">{rightPlayerLabel}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

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
                        <div className="text-xs font-medium text-muted-foreground mb-1 truncate flex items-center justify-center gap-1">
                          {game.game === 'Pool' && nextBreakerSide === 'player1' && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                          )}
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
                        <div className="text-xs font-medium text-muted-foreground mb-1 truncate flex items-center justify-center gap-1">
                          {game.game === 'Pool' && nextBreakerSide === 'player2' && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                          )}
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
          <Card className="shadow-card border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent 
              className="flex h-full items-center justify-center p-8"
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
              {/* Quick Game Type */}
              <div className="space-y-2">
                <Label>Game</Label>
                <ToggleGroup
                  type="single"
                  value={newGame.game}
                  onValueChange={(value) => {
                    if (!value) return;
                    setNewGame((previousGame) => ({ ...previousGame, game: value }));
                  }}
                  className="grid grid-cols-2 gap-2"
                >
                  {gameTypes.map(({ value, label, icon: Icon }) => (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      variant="outline"
                      className={toggleOptionClassName}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {label}
                      <span
                        className={`ml-auto h-2.5 w-2.5 rounded-full border ${newGame.game === value ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
                      />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {newGame.game === 'Pool' && (
                <div className="rounded-md border border-border p-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsRuleSectionExpanded((previousState) => !previousState)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div>
                      <Label className="text-xs text-muted-foreground">Rule</Label>
                      <p className="text-sm mt-0.5">
                        {newGame.breakRule === 'winner_stays' ? 'Winner stays' : 'Alternate'} • {newGame.firstBreakerSelection === 'random' ? 'First break: Random' : newGame.firstBreakerSelection === 'player1' ? 'First break: Game creator' : 'First break: Opponent'}
                      </p>
                    </div>
                    {isRuleSectionExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isRuleSectionExpanded && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Break rule</Label>
                        <ToggleGroup
                          type="single"
                          value={newGame.breakRule}
                          onValueChange={(value) => {
                            if (!value) return;
                            setNewGame((previousGame) => ({
                              ...previousGame,
                              breakRule: value as BreakRule,
                            }));
                          }}
                          className="grid grid-cols-2 gap-2"
                        >
                          <ToggleGroupItem
                            value="alternate"
                            variant="outline"
                            className={compactToggleOptionClassName}
                          >
                            Alternate
                            <span
                              className={`ml-auto h-2.5 w-2.5 rounded-full border ${newGame.breakRule === 'alternate' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
                            />
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="winner_stays"
                            variant="outline"
                            className={compactToggleOptionClassName}
                          >
                            Winner stays
                            <span
                              className={`ml-auto h-2.5 w-2.5 rounded-full border ${newGame.breakRule === 'winner_stays' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
                            />
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">First break</Label>
                        <Select
                          value={newGame.firstBreakerSelection}
                          onValueChange={(value) =>
                            setNewGame((previousGame) => ({
                              ...previousGame,
                              firstBreakerSelection: value as 'player1' | 'player2' | 'random',
                            }))
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="random">Random</SelectItem>
                            <SelectItem value="player1">Game creator</SelectItem>
                            <SelectItem value="player2">Opponent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Opponent Selection */}
              <div className="space-y-3">
                <Label>Opponent</Label>
                <ToggleGroup
                  type="single"
                  value={newGame.opponentType}
                  onValueChange={(value) => {
                    if (!value) return;
                    setNewGame((previousGame) => ({ ...previousGame, opponentType: value as 'custom' | 'friend' }));
                  }}
                  className="grid grid-cols-2 gap-2"
                >
                  <ToggleGroupItem
                    value="friend"
                    variant="outline"
                    className={toggleOptionClassName}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Friend
                    <span
                      className={`ml-auto h-2.5 w-2.5 rounded-full border ${newGame.opponentType === 'friend' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
                    />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="custom"
                    variant="outline"
                    className={toggleOptionClassName}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Custom
                    <span
                      className={`ml-auto h-2.5 w-2.5 rounded-full border ${newGame.opponentType === 'custom' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
                    />
                  </ToggleGroupItem>
                </ToggleGroup>

                {newGame.opponentType === 'custom' ? (
                  <OpponentAutocomplete
                    value={newGame.opponent}
                    onChange={(value) => setNewGame((previousGame) => ({ ...previousGame, opponent: value, selectedFriend: '' }))}
                    opponents={opponents}
                    required
                  />
                ) : (
                  <Select
                    value={newGame.selectedFriend}
                    onValueChange={(value) => setNewGame((previousGame) => ({ ...previousGame, selectedFriend: value, opponent: '' }))}
                  >
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
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={addNewGame} size="sm" className="flex-1" disabled={isLoading}>
                  Start Game
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewGameForm(false);
                    setIsRuleSectionExpanded(false);
                    setNewGame({
                      game: 'Pool',
                      opponent: '',
                      opponentType: 'friend',
                      selectedFriend: '',
                      breakRule: 'alternate',
                      firstBreakerSelection: 'random',
                    });
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

      <Dialog open={decrementBreakerPrompt !== null} onOpenChange={() => setDecrementBreakerPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who breaks next?</DialogTitle>
            <DialogDescription>
              Winner stays cannot infer the next breaker after a score decrement. Choose the next breaker.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => applyManualBreakerAfterDecrement('player1')}>Left player</Button>
            <Button onClick={() => applyManualBreakerAfterDecrement('player2')}>Right player</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecrementBreakerPrompt(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
