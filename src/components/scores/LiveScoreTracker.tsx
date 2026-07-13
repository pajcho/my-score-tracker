import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { Plus, Minus, Flag, Trash2, Trophy, Settings2, Loader2, Play, ChevronDown, Eye, Maximize2 } from 'lucide-react';
import { toast as snackbar } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alertDialog';
import { cn } from '@/lib/utils';
import { hapticTick } from '@/lib/haptics';
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
  type GameType,
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
import { invalidateTrackerQueries, trackerQueryKeys } from '@/lib/queryCache';
import { useFriendsQuery, useLiveGamesQuery, useOpponentsQuery, useScoresQuery } from '@/hooks/useTrackerData';
import { GameSetupWizard } from './wizard/GameSetupWizard';
import { ScoreboardMode } from './ScoreboardMode';

// Debounce window for batching rapid +/- clicks into a single Supabase write.
// Long enough to coalesce a burst of taps; short enough that a watching device
// sees the result within a beat of the user stopping.
const SCORE_WRITE_DEBOUNCE_MS = 350;

interface PendingWrite {
  score1: number;
  score2: number;
  poolSettingsPatch?: Partial<PoolGameSettingsInput>;
}

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

export function LiveScoreTracker({ onScoresSaved, onActiveGamesChange }: LiveScoreTrackerProps) {
  const [showNewGameForm, setShowNewGameForm] = useState(false);
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
  // null = no explicit user choice yet; the section then defaults to open
  // only when the user has no games of their own to focus on.
  const [watchingSectionOpenOverride, setWatchingSectionOpenOverride] = useState<boolean | null>(null);
  const [scoreboardGameId, setScoreboardGameId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuth();
  const currentUserId = isAuthenticated ? currentUser?.id : undefined;
  const isQueryEnabled = !!currentUserId;
  const liveGamesQuery = useLiveGamesQuery(currentUserId);
  const opponentsQuery = useOpponentsQuery(currentUserId);
  const friendsQuery = useFriendsQuery(currentUserId);
  const scoresQuery = useScoresQuery(currentUserId);
  const friends = friendsQuery.data ?? [];
  const games = useMemo<LiveGameView[]>(
    () => (isAuthenticated ? liveGamesQuery.data ?? [] : []),
    [isAuthenticated, liveGamesQuery.data]
  );
  const isInitialLoading = isQueryEnabled && liveGamesQuery.isLoading && games.length === 0;

  // Per-game debounced writes. While a game has unflushed local edits, we treat
  // the cache as the source of truth and ignore realtime echoes for any game —
  // a refetch in the middle of a burst would overwrite the optimistic state
  // with a server snapshot that's behind the clicks still in flight.
  const pendingWritesRef = useRef<Set<string>>(new Set());
  const needsResyncRef = useRef(false);
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const latestPendingRef = useRef<Map<string, PendingWrite>>(new Map());

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

  // Most recent recorded game — powers the wizard's one-tap rematch card.
  // getScoresByUserId returns newest-first, so [0] is the last game played.
  const lastScore = scoresQuery.data?.[0];
  const lastGameSetup = (() => {
    if (!lastScore || !currentUserId) return undefined;
    const friendId = lastScore.user_id === currentUserId ? lastScore.opponent_user_id : lastScore.user_id;
    const friend = friendId ? friends.find((candidate) => candidate.id === friendId) : undefined;
    const opponentName = friend?.name ?? lastScore.friend_name ?? lastScore.opponent_name ?? '';
    if (!opponentName) return undefined;
    return {
      game: lastScore.game,
      poolType: isPoolGameType(lastScore.game)
        ? ((lastScore.pool_type as PoolType | null) ?? lastPoolSettings?.poolType)
        : undefined,
      breakRule: isPoolGameType(lastScore.game)
        ? ((lastScore.break_rule as BreakRule | null) ?? lastPoolSettings?.breakRule)
        : undefined,
      opponentType: friend ? ('friend' as const) : ('custom' as const),
      opponentName,
      selectedFriendId: friend?.id,
    };
  })();

  // The right opponent is usually the last one — order friend chips by
  // how recently each was played.
  const friendsByRecency = useMemo(() => {
    const baseFriends = friendsQuery.data ?? [];
    const lastPlayedAt = new Map<string, number>();
    for (const score of scoresQuery.data ?? []) {
      const otherId = score.user_id === currentUserId ? score.opponent_user_id : score.user_id;
      if (otherId && !lastPlayedAt.has(otherId)) {
        lastPlayedAt.set(otherId, new Date(score.created_at).getTime());
      }
    }
    return [...baseFriends].sort(
      (first, second) => (lastPlayedAt.get(second.id) ?? 0) - (lastPlayedAt.get(first.id) ?? 0)
    );
  }, [currentUserId, scoresQuery.data, friendsQuery.data]);

  const writeGameToCache = useCallback(
    (
      gameId: string,
      nextScore1: number,
      nextScore2: number,
      poolSettingsPatch?: Partial<PoolGameSettingsInput>
    ) => {
      queryClient.setQueryData<LiveGameView[]>(trackerQueryKeys.liveGames, (previousGames) => {
        if (!previousGames) return previousGames;
        return previousGames.map((game) =>
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
        );
      });
    },
    [queryClient]
  );

  const flushPendingWrite = useCallback(
    async (gameId: string) => {
      const pending = latestPendingRef.current.get(gameId);
      if (!pending) return;

      latestPendingRef.current.delete(gameId);
      const existingTimer = debounceTimersRef.current.get(gameId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        debounceTimersRef.current.delete(gameId);
      }

      try {
        await supabaseDb.updateLiveGameScore(
          gameId,
          pending.score1,
          pending.score2,
          pending.poolSettingsPatch
        );
      } catch (error) {
        toast({
          title: "Failed to sync score",
          description: "Your score change could not be saved",
          variant: "destructive",
        });
        // Resync from server so the UI matches truth after the failure.
        await invalidateTrackerQueries({ liveGames: true });
      } finally {
        // Only release the pending lock once this game has no more queued work.
        // If the user clicked again while we were writing (a fresh latestPending
        // snapshot or a pending debounce timer), keep the lock so the next
        // realtime echo is deferred — otherwise the echo would refetch the
        // server snapshot we just wrote (now N clicks stale) and overwrite the
        // cache, glitching the UI back before the next debounce flushes.
        const hasMoreWork =
          latestPendingRef.current.has(gameId) || debounceTimersRef.current.has(gameId);
        if (!hasMoreWork) {
          pendingWritesRef.current.delete(gameId);
          if (pendingWritesRef.current.size === 0 && needsResyncRef.current) {
            needsResyncRef.current = false;
            void invalidateTrackerQueries({ liveGames: true });
          }
        }
      }
    },
    [toast]
  );

  const scheduleScoreWrite = useCallback(
    (
      gameId: string,
      nextScore1: number,
      nextScore2: number,
      poolSettingsPatch?: Partial<PoolGameSettingsInput>
    ) => {
      // Cancel any in-flight refetch for live games before we write the new
      // optimistic value. Otherwise the fetch — kicked off by either the prior
      // PATCH's resync or a realtime echo — would resolve after this cache
      // write and overwrite it with a server snapshot that's now one or more
      // clicks behind, glitching the score back briefly before the next
      // debounce flushes. The PATCH's finally still invalidates afterwards, so
      // we re-acquire authoritative server state at the right moment.
      void queryClient.cancelQueries({ queryKey: trackerQueryKeys.liveGames });

      writeGameToCache(gameId, nextScore1, nextScore2, poolSettingsPatch);

      // Merge any prior pending pool patch with the new one — later wins per field.
      const existing = latestPendingRef.current.get(gameId);
      const mergedPatch =
        poolSettingsPatch || existing?.poolSettingsPatch
          ? { ...(existing?.poolSettingsPatch ?? {}), ...(poolSettingsPatch ?? {}) }
          : undefined;

      latestPendingRef.current.set(gameId, {
        score1: nextScore1,
        score2: nextScore2,
        poolSettingsPatch: mergedPatch && Object.keys(mergedPatch).length > 0 ? mergedPatch : undefined,
      });
      pendingWritesRef.current.add(gameId);

      const existingTimer = debounceTimersRef.current.get(gameId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        debounceTimersRef.current.delete(gameId);
        void flushPendingWrite(gameId);
      }, SCORE_WRITE_DEBOUNCE_MS);
      debounceTimersRef.current.set(gameId, timer);
    },
    [flushPendingWrite, queryClient, writeGameToCache]
  );

  const flushAllPendingWrites = useCallback(() => {
    const gameIds = Array.from(debounceTimersRef.current.keys());
    for (const gameId of gameIds) {
      void flushPendingWrite(gameId);
    }
  }, [flushPendingWrite]);

  // Update timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncClock(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!liveGamesQuery.dataUpdatedAt) return;
    setLastSyncedAt(new Date(liveGamesQuery.dataUpdatedAt));
  }, [liveGamesQuery.dataUpdatedAt]);

  useEffect(() => {
    if (!liveGamesQuery.error || !isAuthenticated) return;
    console.error('Failed to load live games:', liveGamesQuery.error);
  }, [isAuthenticated, liveGamesQuery.error]);

  // Subscribe to realtime updates and let TanStack Query handle refetch behavior.
  // If local writes are still pending, we mark a resync flag instead of refetching
  // immediately — otherwise the refetch would replace our optimistic cache with a
  // server snapshot that's behind the clicks the user is still bursting through.
  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const unsubscribe = supabaseDb.subscribeToLiveGames(() => {
      if (pendingWritesRef.current.size > 0) {
        needsResyncRef.current = true;
        return;
      }
      void invalidateTrackerQueries({ liveGames: true });
    }, setIsRealtimeConnected);

    return () => {
      unsubscribe();
      setIsRealtimeConnected(false);
    };
  }, [isAuthenticated]);

  // Detect when the user backgrounds or returns to the app.
  // - On hide: flush any debounced writes so the tab can be safely suspended.
  // - On show: refetch live games (deferred if local writes are still in flight).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAllPendingWrites();
        return;
      }
      if (document.visibilityState === 'visible') {
        if (pendingWritesRef.current.size > 0) {
          needsResyncRef.current = true;
          return;
        }
        void invalidateTrackerQueries({ liveGames: true });
      }
    };

    const handleBeforeUnload = () => {
      flushAllPendingWrites();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushAllPendingWrites]);

  // On unmount: best-effort flush any outstanding debounced writes so navigating
  // away mid-burst doesn't drop the user's last clicks.
  useEffect(() => {
    return () => {
      flushAllPendingWrites();
    };
  }, [flushAllPendingWrites]);

  useEffect(() => {
    onActiveGamesChange?.(games.length > 0);
  }, [games, onActiveGamesChange]);

  const addNewGame = async (gameData: {
    game: GameType;
    poolType: string;
    opponent: string;
    opponentType: 'custom' | 'friend';
    selectedFriend: string;
    breakRule: BreakRule;
    firstBreakerSelection: 'player1' | 'player2' | 'random';
  }) => {
    const dataToUse = gameData;

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

      const newGame: LiveGameView = {
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
      };
      queryClient.setQueryData<LiveGameView[]>(trackerQueryKeys.liveGames, (previousGames) =>
        previousGames ? [...previousGames, newGame] : [newGame]
      );
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

  const getSideLabel = (game: LiveGameView, side: PlayerSide): string => {
    if (side === 'player1') {
      return currentUser?.id === game.created_by_user_id ? 'you' : game.creator_name || 'Unknown player';
    }
    return currentUser?.id === game.opponent_user_id
      ? 'you'
      : game.opponent_name || game.opponent_user_name || 'Unknown opponent';
  };

  const updateScore = (gameId: string, player: PlayerSide, change: 1 | -1) => {
    // Read the freshest optimistic cache, not the render-time `games`
    // closure: this callback also fires later from the undo snackbar and
    // from tap bursts that outrun re-renders, where the closure is stale —
    // an undo computed from a stale score reverts by two (or no-ops at 0).
    const currentGames =
      queryClient.getQueryData<LiveGameView[]>(trackerQueryKeys.liveGames) ?? games;
    const gameToUpdate = currentGames.find((game) => game.id === gameId);
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

    // Physical + peripheral confirmation: taps often happen while walking
    // back to the table, not while watching the screen.
    hapticTick();
    if (change === 1) {
      // One reusable snackbar (fixed id) so rapid taps update in place
      // instead of stacking. Undo routes through the same score pipeline.
      snackbar(`+1 ${getSideLabel(gameToUpdate, player)}`, {
        id: 'score-undo',
        duration: 2500,
        action: {
          label: 'Undo',
          onClick: () => updateScore(gameId, player, -1),
        },
      });
    }

    if (!isPoolGameType(gameToUpdate.game) || !gameToUpdate.pool_settings) {
      scheduleScoreWrite(gameId, nextScore1, nextScore2);
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

        scheduleScoreWrite(gameId, nextScore1, nextScore2, {
          current_breaker_side: nextBreakerSide,
          last_rack_winner_side: player,
        });
        return;
      }

      scheduleScoreWrite(gameId, nextScore1, nextScore2, {
        current_breaker_side: player,
        last_rack_winner_side: player,
      });
      return;
    }

    if (breakRule === 'alternate') {
      const completedRackCountAfterChange = nextScore1 + nextScore2;
      scheduleScoreWrite(gameId, nextScore1, nextScore2, {
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

    scheduleScoreWrite(gameId, nextScore1, nextScore2, {
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
    scheduleScoreWrite(game.id, game.score1, game.score2, {
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

    scheduleScoreWrite(game.id, game.score1, game.score2, {
      break_rule: breakRule,
      ...(breakRule === 'alternate' ? { current_breaker_side: nextBreakerForAlternate } : {}),
    });
  };

  const changePoolType = (game: LiveGameView, poolType: PoolType) => {
    if (!game.pool_settings) return;

    scheduleScoreWrite(game.id, game.score1, game.score2, {
      pool_type: poolType,
    });
  };

  const removeGame = async (gameId: string) => {
    try {
      await supabaseDb.deleteLiveGame(gameId);
      queryClient.setQueryData<LiveGameView[]>(trackerQueryKeys.liveGames, (previousGames) =>
        previousGames ? previousGames.filter((game) => game.id !== gameId) : previousGames
      );
      await invalidateTrackerQueries({ liveGames: true });
      toast({
        title: "Game cancelled",
        description: "The game has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to cancel game",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const saveGame = async (game: LiveGameView) => {
    if (!isAuthenticated || !currentUser) return;
    const isParticipant =
      game.created_by_user_id === currentUser.id || game.opponent_user_id === currentUser.id;
    if (!isParticipant) {
      toast({
        title: "Cannot save game",
        description: "Only game participants can save the final score",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await supabaseDb.completeLiveGame(game.id);
      queryClient.setQueryData<LiveGameView[]>(trackerQueryKeys.liveGames, (previousGames) =>
        previousGames ? previousGames.filter((activeGame) => activeGame.id !== game.id) : previousGames
      );
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

    for (const game of games.filter(
      (activeGame) =>
        activeGame.created_by_user_id === currentUser.id ||
        activeGame.opponent_user_id === currentUser.id
    )) {
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
      queryClient.setQueryData<LiveGameView[]>(trackerQueryKeys.liveGames, (previousGames) =>
        previousGames ? previousGames.filter((game) => !savedGameIds.includes(game.id)) : previousGames
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
    ? games.filter(
        (game) =>
          game.created_by_user_id === currentUser.id ||
          game.opponent_user_id === currentUser.id
      ).length
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
  const isWatchingSectionOpen = watchingSectionOpenOverride ?? activePlayerGames.length === 0;

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <span className="sr-only">Loading live games...</span>
        <div aria-hidden="true" className="space-y-4">
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-24 flex-1 animate-pulse rounded-xl bg-muted" />
              <div className="h-24 flex-1 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        </div>
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

  // A cue ball, not a play glyph — "break" in pool language.
  const BreakIndicator = () => (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-primary" aria-hidden="true">
      <circle cx="6" cy="6" r="5.5" fill="currentColor" />
      <circle cx="4.2" cy="4.2" r="1.7" fill="hsl(var(--card))" opacity="0.9" />
    </svg>
  );

  const renderWatchedGameCard = (game: LiveGameView) => {
    const isPoolGame = isPoolGameType(game.game) && !!game.pool_settings;
    const creatorName = game.creator_name || 'Unknown player';
    const opponentName = game.opponent_name || game.opponent_user_name || 'Unknown opponent';
    const nextBreakerSide = game.pool_settings?.current_breaker_side;

    // Spectators get a clean scoreline — no controls at all. Disabled
    // steppers would only suggest something is broken.
    return (
      <Card key={game.id} className="border border-border/60 bg-card/70 shadow-none">
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
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
            </div>
            <span className="text-right text-xs text-muted-foreground">Watching (read-only)</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-xs font-medium text-muted-foreground">
              {isPoolGame && nextBreakerSide === 'player1' && <BreakIndicator />}
              <span className="truncate">{creatorName}</span>
            </div>
            <div className="flex shrink-0 items-baseline gap-1.5 text-2xl font-bold tabular-nums">
              <span className="text-player-one">{game.score1}</span>
              <span className="text-base font-medium text-muted-foreground">–</span>
              <span className="text-player-two">{game.score2}</span>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="truncate">{opponentName}</span>
              {isPoolGame && nextBreakerSide === 'player2' && <BreakIndicator />}
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Started {formatDistanceToNow(new Date(game.started_at), { addSuffix: true })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGameCard = (game: LiveGameView) => {
    const isPoolGame = isPoolGameType(game.game) && !!game.pool_settings;
    const isGameCreator = currentUser?.id === game.created_by_user_id;
    const isGameOpponent = currentUser?.id === game.opponent_user_id;
    const creatorName = game.creator_name || 'Unknown player';
    const opponentName = game.opponent_name || game.opponent_user_name || 'Unknown opponent';
    const leftPlayerLabel = isGameCreator ? 'You' : creatorName;
    const rightPlayerLabel = isGameOpponent ? 'You' : opponentName;
    const leftPlayer: PlayerSide = 'player1';
    const rightPlayer: PlayerSide = 'player2';
    const leftScore = game.score1;
    const rightScore = game.score2;
    const nextBreakerSide = game.pool_settings?.current_breaker_side;
    const rackNumber = leftScore + rightScore + 1;
    const isPoolSettingsExpanded = !!expandedPoolSettingsByGameId[game.id];
    const disableGameInteractions = isLoading;

    return (
      <Card key={game.id} className="border-0 shadow-card">
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
            <div className="flex shrink-0 items-center justify-end">
              {isPoolGame && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePoolSettingsPanel(game.id)}
                  className={cn('h-11 w-11 p-0', isPoolSettingsExpanded && 'bg-muted text-primary')}
                  aria-label="Game rules"
                >
                  <Settings2 className={cn('!h-[18px] !w-[18px]', !isPoolSettingsExpanded && 'text-muted-foreground')} />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    className="h-11 w-11 p-0"
                    aria-label="Finish game"
                  >
                    <Flag className="!h-[18px] !w-[18px] text-muted-foreground" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finish this game?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The final score {leftScore}–{rightScore} vs {isGameCreator ? opponentName : creatorName} will
                      be saved to your history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep playing</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void saveGame(game)}>Finish & save</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 w-11 p-0"
                    aria-label="Delete game"
                  >
                    <Trash2 className="!h-[18px] !w-[18px] text-muted-foreground" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this live game?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The current score {leftScore}–{rightScore} will be discarded. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep playing</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => void removeGame(game.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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

            <div className="flex items-stretch justify-between gap-2 sm:gap-3">
              <div className="flex flex-col justify-center gap-2 pt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateScore(game.id, leftPlayer, 1)}
                  disabled={disableGameInteractions}
                  className="h-11 w-11 p-0"
                  aria-label={`Add point for ${leftPlayerLabel}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateScore(game.id, leftPlayer, -1)}
                  disabled={disableGameInteractions || leftScore === 0}
                  className="h-11 w-11 p-0"
                  aria-label={`Remove point for ${leftPlayerLabel}`}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-1 items-stretch justify-center gap-2 sm:gap-3">
                <div className="flex w-full flex-col text-center">
                  <div className="mb-1 flex items-center justify-center gap-1 truncate text-xs font-medium text-muted-foreground">
                    {isPoolGameType(game.game) && nextBreakerSide === 'player1' && <BreakIndicator />}
                    <span className={cn('truncate', leftPlayerLabel === 'You' && 'font-semibold text-primary')}>
                      {leftPlayerLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex min-h-[96px] w-full select-none items-center justify-center rounded-xl bg-player-one text-4xl font-bold text-white transition-[filter,transform] active:scale-[0.99] active:brightness-110 disabled:opacity-60 [-webkit-touch-callout:none]"
                    onClick={() => updateScore(game.id, leftPlayer, 1)}
                    disabled={disableGameInteractions}
                    aria-label={`Score for ${leftPlayerLabel}: ${leftScore}. Tap to add a point.`}
                  >
                    {/* Keyed remount replays the pop animation on every change. */}
                    <span key={leftScore} className="animate-score-pop tabular-nums">
                      {leftScore}
                    </span>
                  </button>
                </div>

                <div className="flex w-full flex-col text-center">
                  <div className="mb-1 flex items-center justify-center gap-1 truncate text-xs font-medium text-muted-foreground">
                    {isPoolGameType(game.game) && nextBreakerSide === 'player2' && <BreakIndicator />}
                    <span className={cn('truncate', rightPlayerLabel === 'You' && 'font-semibold text-primary')}>
                      {rightPlayerLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex min-h-[96px] w-full select-none items-center justify-center rounded-xl bg-player-two text-4xl font-bold text-white transition-[filter,transform] active:scale-[0.99] active:brightness-110 disabled:opacity-60 [-webkit-touch-callout:none]"
                    onClick={() => updateScore(game.id, rightPlayer, 1)}
                    disabled={disableGameInteractions}
                    aria-label={`Score for ${rightPlayerLabel}: ${rightScore}. Tap to add a point.`}
                  >
                    <span key={rightScore} className="animate-score-pop tabular-nums">
                      {rightScore}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-2 pt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateScore(game.id, rightPlayer, 1)}
                  disabled={disableGameInteractions}
                  className="h-11 w-11 p-0"
                  aria-label={`Add point for ${rightPlayerLabel}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateScore(game.id, rightPlayer, -1)}
                  disabled={disableGameInteractions || rightScore === 0}
                  className="h-11 w-11 p-0"
                  aria-label={`Remove point for ${rightPlayerLabel}`}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isPoolGame ? `Rack ${rackNumber} · ` : ''}
                Started {formatDistanceToNow(new Date(game.started_at), { addSuffix: true })}
              </span>
              <button
                type="button"
                onClick={() => setScoreboardGameId(game.id)}
                className="inline-flex min-h-11 items-center gap-1 px-1 text-xs font-semibold text-primary transition-transform active:scale-95"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Fullscreen
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    // Extra mobile bottom padding keeps the floating + button from covering
    // the last card's footer row when scrolled to the end.
    <div className="space-y-4 pb-16 md:pb-0">
      <PageHeader
        title="Live"
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => void saveAllGames()}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Flag className="h-3.5 w-3.5" />
                Finish all ({ownGamesCount})
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowNewGameForm(true)}
              className="hidden gap-1.5 md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              New game
            </Button>
          </>
        )}
      />
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePlayerGames.map(renderGameCard)}
          </div>
        </section>

        {watchedGames.length > 0 && (
          <Collapsible open={isWatchingSectionOpen} onOpenChange={(open) => setWatchingSectionOpenOverride(open)}>
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
                  {watchedGames.map(renderWatchedGameCard)}
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>
        )}
      </div>

      {games.length === 0 && !showNewGameForm && (
        <div className="space-y-4 py-8 text-center text-muted-foreground">
          <Trophy className="mx-auto h-12 w-12 opacity-50" />
          <p>No active games right now.</p>
          <Button onClick={() => setShowNewGameForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Start a game
          </Button>
        </div>
      )}

      {/* Thumb-reach entry point for the most common mid-evening action. */}
      <button
        type="button"
        onClick={() => setShowNewGameForm(true)}
        aria-label="Start a new game"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      {(() => {
        // Scoreboard reads the same live cache entry as the cards, so
        // realtime updates flow straight through; it closes itself if the
        // game finishes or is deleted elsewhere.
        const scoreboardGame = scoreboardGameId
          ? activePlayerGames.find((game) => game.id === scoreboardGameId)
          : undefined;
        if (!scoreboardGame) return null;
        const isCreator = currentUser?.id === scoreboardGame.created_by_user_id;
        const isOpponent = currentUser?.id === scoreboardGame.opponent_user_id;
        return (
          <ScoreboardMode
            game={scoreboardGame}
            leftLabel={isCreator ? 'You' : scoreboardGame.creator_name || 'Unknown player'}
            rightLabel={
              isOpponent
                ? 'You'
                : scoreboardGame.opponent_name || scoreboardGame.opponent_user_name || 'Unknown opponent'
            }
            onScore={(side, change) => updateScore(scoreboardGame.id, side, change)}
            onClose={() => setScoreboardGameId(null)}
          />
        );
      })()}

      {showNewGameForm ? (
        <GameSetupWizard
          onOpenChange={setShowNewGameForm}
          onComplete={(data) => {
            void addNewGame(data);
          }}
          friends={friendsByRecency}
          lastPoolSettings={lastPoolSettings}
          lastGameSetup={lastGameSetup}
          currentUserName={currentUser?.user_metadata?.name || 'Player 1'}
        />
      ) : null}

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
