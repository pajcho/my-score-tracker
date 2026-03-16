import { useState, useEffect } from 'react';
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { Plus, Minus, Save, Trash2, Trophy, Settings2, Loader2, Play, ChevronDown, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/pageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/useToast';
import {
  supabaseDb,
  BreakRule,
  LiveGameView,
  PoolGameSettingsInput,
  PlayerSide,
} from '@/lib/supabaseDatabase';
import {
  DEFAULT_GAME_TYPE,
  DEFAULT_POOL_TYPE,
  POOL_TYPE_OPTIONS,
  getDisplayGameLabel,
  getGameTypeLabel,
  getPoolTypeLabel,
  isPoolGameType,
  type PoolType,
} from '@/lib/gameTypes';
import { GameTypeIcon, PoolTypeIcon } from '@/components/ui/gameTypeIcon';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/components/auth/authContext';
import { invalidateTrackerQueries } from '@/lib/queryCache';
import { useFriendsQuery, useLiveGamesQuery, useOpponentsQuery, useScoresQuery } from '@/hooks/useTrackerData';
import { GameSetupWizard } from './wizard/GameSetupWizard';

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

export function LiveScoreTracker({ onClose, onScoresSaved, onActiveGamesChange }: LiveScoreTrackerProps) {
  const [games, setGames] = useState<LiveGameView[]>([]);
  const [showNewGameForm, setShowNewGameForm] = useState(false);
  const [newGame, setNewGame] = useState({
    game: DEFAULT_GAME_TYPE,
    poolType: DEFAULT_POOL_TYPE,
    opponent: '',
    opponentType: 'friend' as 'custom' | 'friend',
    selectedFriend: '',
    breakRule: 'alternate' as BreakRule,
    firstBreakerSelection: 'random' as 'player1' | 'player2' | 'random',
  });
  const [_, setIsRuleSectionExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncClock, setSyncClock] = useState(new Date());
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [decrementBreakerPrompt, setDecrementBreakerPrompt] = useState<{
    gameId: string;
    nextScore1: number;
    nextScore2: number;
    settingsPatch: Partial<PoolGameSettingsInput>;
  } | null>(null);
  const [expandedPoolSettingsByGameId, setExpandedPoolSettingsByGameId] = useState<Record<string, boolean>>({});
  const [isWatchingSectionOpen, setIsWatchingSectionOpen] = useState(true);
  const { toast } = useToast();
  const { user: currentUser, isAuthenticated } = useAuth();
  const currentUserId = isAuthenticated ? currentUser?.id : undefined;
  const isQueryEnabled = !!currentUserId;
  const liveGamesQuery = useLiveGamesQuery(currentUserId);
  const opponentsQuery = useOpponentsQuery(currentUserId);
  const friendsQuery = useFriendsQuery(currentUserId);
  const scoresQuery = useScoresQuery(currentUserId);
  const friends = friendsQuery.data ?? [];
  const isInitialLoading = isQueryEnabled && liveGamesQuery.isLoading && games.length === 0;

  // Get last pool game settings to pre-fill in wizard
  const lastPoolGame = scoresQuery.data
    ?.filter((score) => score.game === 'Pool' && score.pool_type && score.break_rule)
    ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    ?.[0];
  const lastPoolSettings = lastPoolGame
    ? {
        poolType: lastPoolGame.pool_type as PoolType,
        breakRule: lastPoolGame.break_rule as BreakRule,
      }
    : undefined;

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
                    ...(poolSettingsPatch?.pool_type !== undefined ? { pool_type: poolSettingsPatch.pool_type } : {}),
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

  useEffect(() => {
    if (!isAuthenticated) {
      setGames([]);
      return;
    }

    if (liveGamesQuery.data) {
      setGames(liveGamesQuery.data);
    }
  }, [isAuthenticated, liveGamesQuery.data]);

  useEffect(() => {
    if (!liveGamesQuery.dataUpdatedAt) return;
    setLastSyncedAt(new Date(liveGamesQuery.dataUpdatedAt));
  }, [liveGamesQuery.dataUpdatedAt]);

  useEffect(() => {
    if (!liveGamesQuery.error || !isAuthenticated) return;
    console.error('Failed to load live games:', liveGamesQuery.error);
  }, [isAuthenticated, liveGamesQuery.error]);

  // Subscribe to realtime updates and let TanStack Query handle refetch behavior.
  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const unsubscribe = supabaseDb.subscribeToLiveGames(() => {
      void invalidateTrackerQueries({ liveGames: true });
    }, setIsRealtimeConnected);

    return () => {
      unsubscribe();
      setIsRealtimeConnected(false);
    };
  }, [isAuthenticated]);

  // Fix 1: Detect when the user returns to the app (screen wakes up).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void invalidateTrackerQueries({ liveGames: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    onActiveGamesChange?.(games.length > 0);
  }, [games, onActiveGamesChange]);

  const addNewGame = async (gameData?: typeof newGame) => {
    const dataToUse = gameData || newGame;

    if (!dataToUse.game) {
      toast({
        title: "Missing information",
        description: "Please select a game type",
        variant: "destructive",
      });
      return;
    }

    if (dataToUse.opponentType === 'custom' && !dataToUse.opponent) {
      toast({
        title: "Missing information",
        description: "Please enter opponent's name",
        variant: "destructive",
      });
      return;
    }

    if (dataToUse.opponentType === 'friend' && !dataToUse.selectedFriend) {
      toast({
        title: "Missing information",
        description: "Please select a friend to play against",
        variant: "destructive",
      });
      return;
    }

    let opponentName = dataToUse.opponent;
    let opponentUserId: string | undefined;

    if (dataToUse.opponentType === 'friend' && dataToUse.selectedFriend) {
      const friend = friends.find(f => f.id === dataToUse.selectedFriend);
      if (friend) {
        opponentName = friend.name;
        opponentUserId = friend.id;
      }
    }

    setIsLoading(true);

    try {
      const firstBreakerSide = getFirstBreakerSide(dataToUse.firstBreakerSelection);
      const initialPoolSettings = isPoolGameType(dataToUse.game)
        ? {
            pool_type: dataToUse.poolType,
            break_rule: dataToUse.breakRule,
            first_breaker_side: firstBreakerSide,
            current_breaker_side: firstBreakerSide,
            last_rack_winner_side: null,
          }
        : undefined;

      const createdLiveGame = await supabaseDb.createLiveGame(
        dataToUse.game,
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
        game: DEFAULT_GAME_TYPE,
        poolType: DEFAULT_POOL_TYPE,
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
        description: `${getDisplayGameLabel(dataToUse.game, initialPoolSettings?.pool_type)} game vs ${opponentName}`,
      });
      await invalidateTrackerQueries({
        liveGames: true,
        opponents: true,
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

    if (!isPoolGameType(gameToUpdate.game) || !gameToUpdate.pool_settings) {
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

  const changePoolType = (game: LiveGameView, poolType: PoolType) => {
    if (!game.pool_settings) return;

    void persistScoreUpdate(game.id, game.score1, game.score2, {
      pool_type: poolType,
    });
  };

  const removeGame = async (gameId: string) => {
    try {
      await supabaseDb.deleteLiveGame(gameId);
      setGames((previousGames) => previousGames.filter((game) => game.id !== gameId));
      await invalidateTrackerQueries({ liveGames: true });
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
    if (!isAuthenticated) return;
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
      await invalidateTrackerQueries({
        scores: true,
        liveGames: true,
        opponents: true,
      });

      toast({
        title: "Score saved!",
        description: `${getDisplayGameLabel(game.game, game.pool_settings?.pool_type)}: ${game.score1}-${game.score2}`,
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
      await invalidateTrackerQueries({
        scores: true,
        liveGames: true,
        opponents: true,
      });
      onScoresSaved();
    }
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
  const activePlayerGames = orderedGames.filter((game) =>
    currentUser ? game.created_by_user_id === currentUser.id || game.opponent_user_id === currentUser.id : false
  );
  const watchedGames = orderedGames.filter((game) =>
    currentUser ? game.created_by_user_id !== currentUser.id && game.opponent_user_id !== currentUser.id : true
  );

  if (isInitialLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Loading live games...
      </div>
    );
  }

  const ConnectionIndicator = () => {
    if (liveGamesQuery.isFetching) {
      return <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />;
    }
    if (isRealtimeConnected) {
      return (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      );
    }
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
      </span>
    );
  };

  const BreakIndicator = () => {
    return <Play className="h-3 w-3 fill-current text-primary" />;
  };

  const renderGameCard = (game: LiveGameView) => {
    const isPoolGame = isPoolGameType(game.game) && !!game.pool_settings;
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
      <Card key={game.id} className={`border-0 shadow-card ${isSpectator ? 'border border-border/60 bg-card/70' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex min-h-8 items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              {isPoolGame && game.pool_settings?.pool_type ? (
                <PoolTypeIcon poolType={game.pool_settings.pool_type} className="h-4 w-4" />
              ) : (
                <GameTypeIcon gameType={game.game} className="h-4 w-4" />
              )}
              <span>{getGameTypeLabel(game.game)}</span>
              {isPoolGame && game.pool_settings?.pool_type && (
                <span className="text-xs font-medium text-muted-foreground">
                  {getPoolTypeLabel(game.pool_settings.pool_type)}
                </span>
              )}
            </CardTitle>
            <div className="flex shrink-0 items-center justify-end gap-1">
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
                <span className="block text-right text-xs leading-8 text-muted-foreground">
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Pool Type</Label>
                    <Select
                      value={game.pool_settings?.pool_type || DEFAULT_POOL_TYPE}
                      onValueChange={(value) => changePoolType(game, value as PoolType)}
                      disabled={isSpectator || isLoading}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POOL_TYPE_OPTIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

            <div className="flex items-end justify-between gap-2 sm:gap-3">
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

              <div className="flex flex-1 items-center justify-center gap-2 sm:gap-3">
                <div className="w-full text-center">
                  <div className="mb-1 flex items-center justify-center gap-1 truncate text-xs font-medium text-muted-foreground">
                    {isPoolGameType(game.game) && nextBreakerSide === 'player1' && <BreakIndicator />}
                    <span className={leftPlayerLabel === 'You' ? 'font-semibold text-primary' : ''}>
                      {leftPlayerLabel}
                    </span>
                  </div>
                  <div
                    className={`flex min-w-[72px] items-center justify-center rounded-lg px-3 py-4 text-center text-2xl font-bold sm:min-w-[80px] sm:px-6 ${isSpectator ? 'cursor-default border border-blue-200 bg-transparent text-blue-400 dark:border-blue-800 dark:text-blue-600' : 'cursor-pointer bg-blue-500 text-white transition-colors hover:bg-blue-600'}`}
                    onClick={disableGameInteractions ? undefined : () => updateScore(game.id, leftPlayer, 1)}
                  >
                    {leftScore}
                  </div>
                </div>

                <div className="w-full text-center">
                  <div className="mb-1 flex items-center justify-center gap-1 truncate text-xs font-medium text-muted-foreground">
                    {isPoolGameType(game.game) && nextBreakerSide === 'player2' && <BreakIndicator />}
                    <span className={rightPlayerLabel === 'You' ? 'font-semibold text-primary' : ''}>
                      {rightPlayerLabel}
                    </span>
                  </div>
                  <div
                    className={`flex min-w-[72px] items-center justify-center rounded-lg px-3 py-4 text-center text-2xl font-bold sm:min-w-[80px] sm:px-6 ${isSpectator ? 'cursor-default border border-red-200 bg-transparent text-red-400 dark:border-red-800 dark:text-red-600' : 'cursor-pointer bg-red-500 text-white transition-colors hover:bg-red-600'}`}
                    onClick={disableGameInteractions ? undefined : () => updateScore(game.id, rightPlayer, 1)}
                  >
                    {rightScore}
                  </div>
                </div>
              </div>

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

            <div className="text-center text-xs text-muted-foreground">
              Started {formatDistanceToNow(new Date(game.started_at), { addSuffix: true })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live Score Tracking"
        description="Track scores live and keep an eye on active friend games"
        icon={Play}
        status={(
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center self-center"
                aria-label={syncStatusText}
                title={syncStatusText}
              >
                <ConnectionIndicator />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto px-3 py-1.5 text-sm" align="start">
              {syncStatusText}
            </PopoverContent>
          </Popover>
        )}
        actions={(
          <>
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
          </>
        )}
      />
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePlayerGames.map(renderGameCard)}

            {!showNewGameForm ? (
              <Card className="h-full cursor-pointer border-2 border-dashed border-muted-foreground/25 shadow-card transition-colors hover:border-primary/50">
                <CardContent
                  className="flex h-full min-h-[220px] items-center justify-center p-8"
                  onClick={() => setShowNewGameForm(true)}
                >
                  <div className="text-center">
                    <Plus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Add New Game</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <GameSetupWizard
                onComplete={(data) => {
                  void addNewGame(data);
                }}
                onCancel={() => {
                  setShowNewGameForm(false);
                  setIsRuleSectionExpanded(false);
                  setNewGame({
                    game: DEFAULT_GAME_TYPE,
                    poolType: DEFAULT_POOL_TYPE,
                    opponent: '',
                    opponentType: 'friend',
                    selectedFriend: '',
                    breakRule: 'alternate',
                    firstBreakerSelection: 'random',
                  });
                }}
                friends={friends}
                lastPoolSettings={lastPoolSettings}
                currentUserName={currentUser?.user_metadata?.name || 'Player 1'}
              />
            )}
          </div>
        </section>

        {watchedGames.length > 0 && (
          <Collapsible open={isWatchingSectionOpen} onOpenChange={setIsWatchingSectionOpen}>
            <section className="space-y-3 rounded-2xl border border-border/70 bg-card/40 p-3 sm:p-4" aria-labelledby="watching-games-heading">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 id="watching-games-heading" className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:text-sm sm:tracking-[0.18em]">
                      Watching friends
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Friend games in read-only mode.
                    </p>
                  </div>
                </div>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between gap-3 sm:w-auto"
                    aria-label={isWatchingSectionOpen ? 'Hide watched games' : 'Show watched games'}
                  >
                    <span>{isWatchingSectionOpen ? 'Hide watched games' : `Show watched games (${watchedGames.length})`}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isWatchingSectionOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {watchedGames.map(renderGameCard)}
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>
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
