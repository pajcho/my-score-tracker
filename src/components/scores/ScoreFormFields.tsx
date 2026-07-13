import { useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmentedControl';
import { DateChipPicker } from '@/components/ui/dateChipPicker';
import { StepperInput } from '@/components/ui/stepperInput';
import { OpponentPicker } from '@/components/scores/OpponentPicker';
import { GAME_TYPE_OPTIONS, POOL_TYPE_OPTIONS, isPoolGameType, type GameType, type PoolType } from '@/lib/gameTypes';
import { GameTypeIcon } from '@/components/ui/gameTypeIcon';
import { useAuth } from '@/components/auth/authContext';
import { useFriendsQuery, useOpponentsQuery, useScoresQuery } from '@/hooks/useTrackerData';

interface ScoreFormFieldsProps {
  game: GameType;
  setGame: (game: GameType) => void;
  poolType: PoolType;
  setPoolType: (poolType: PoolType) => void;
  opponent: string;
  setOpponent: (opponent: string) => void;
  yourScore: number;
  setYourScore: (score: number) => void;
  opponentScore: number;
  setOpponentScore: (score: number) => void;
  date: Date;
  setDate: (date: Date) => void;
  opponentType: 'custom' | 'friend';
  setOpponentType: (type: 'custom' | 'friend') => void;
  selectedFriend: string;
  setSelectedFriend: (friendId: string) => void;
  initialData?: {
    opponent_user_id?: string;
    opponent_name?: string;
  };
}

export function ScoreFormFields({
  game,
  setGame,
  poolType,
  setPoolType,
  opponent,
  setOpponent,
  yourScore,
  setYourScore,
  opponentScore,
  setOpponentScore,
  date,
  setDate,
  opponentType,
  setOpponentType,
  selectedFriend,
  setSelectedFriend,
  initialData
}: ScoreFormFieldsProps) {
  const { isAuthenticated, user } = useAuth();
  const currentUserId = isAuthenticated ? user?.id : undefined;
  const opponentsQuery = useOpponentsQuery(currentUserId);
  const friendsQuery = useFriendsQuery(currentUserId);
  const scoresQuery = useScoresQuery(currentUserId);
  const opponents = opponentsQuery.data ?? [];
  const friendsData = friendsQuery.data;
  const scoresData = scoresQuery.data;
  const friends = useMemo(() => friendsData ?? [], [friendsData]);
  const scores = useMemo(() => scoresData ?? [], [scoresData]);

  const initialOpponentUserId = initialData?.opponent_user_id;
  const initialOpponentName = initialData?.opponent_name;

  useEffect(() => {
    if (!opponentsQuery.error && !friendsQuery.error) return;
    console.error('Failed to load data:', opponentsQuery.error ?? friendsQuery.error);
  }, [friendsQuery.error, opponentsQuery.error]);

  // Set initial opponent type and selection based on initialData (only once)
  useEffect(() => {
    if (!initialOpponentUserId && !initialOpponentName) return;

    if (initialOpponentUserId && friends.length > 0) {
      const friend = friends.find(f => f.id === initialOpponentUserId);
      if (friend) {
        setOpponentType('friend');
        setSelectedFriend(friend.id);
        setOpponent(''); // Clear custom opponent when friend is selected
      }
    } else if (initialOpponentName && !initialOpponentUserId) {
      setOpponentType('custom');
      setOpponent(initialOpponentName);
      setSelectedFriend(''); // Clear friend selection when custom opponent is set
    }
  }, [friends, initialOpponentName, initialOpponentUserId, setOpponent, setOpponentType, setSelectedFriend]);

  // Friends you played most recently come first — tonight's rival is
  // almost always one tap away.
  const rankedFriends = useMemo(() => {
    const latestGameByName = new Map<string, number>();
    for (const score of scores) {
      const name = (score as { friend_name?: string | null }).friend_name || score.opponent_name;
      if (!name) continue;
      const playedAt = new Date(score.date).getTime();
      latestGameByName.set(name, Math.max(latestGameByName.get(name) ?? 0, playedAt));
    }
    return [...friends].sort(
      (first, second) => (latestGameByName.get(second.name) ?? 0) - (latestGameByName.get(first.name) ?? 0)
    );
  }, [friends, scores]);

  const opponentLabel =
    (opponentType === 'friend'
      ? friends.find((friend) => friend.id === selectedFriend)?.name.split(' ')[0]
      : opponent.trim().split(/\s+/)[0]) || 'Opponent';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Game *</Label>
        <SegmentedControl
          aria-label="Game type"
          value={game}
          onValueChange={setGame}
          options={GAME_TYPE_OPTIONS.map(({ value, label }) => ({
            value,
            label,
            icon: <GameTypeIcon gameType={value} className="h-4 w-4" />,
          }))}
        />
      </div>

      {isPoolGameType(game) && (
        <div className="space-y-2">
          <Label>Pool Type *</Label>
          <SegmentedControl
            aria-label="Pool type"
            value={poolType}
            onValueChange={setPoolType}
            options={POOL_TYPE_OPTIONS}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>When *</Label>
        <DateChipPicker value={date} onChange={setDate} />
      </div>

      <div className="space-y-2">
        <Label>Opponent *</Label>
        <OpponentPicker
          friends={rankedFriends}
          selectedFriendId={opponentType === 'friend' ? selectedFriend : ''}
          customName={opponentType === 'custom' ? opponent : ''}
          onSelectFriend={(friendId) => {
            setOpponentType('friend');
            setSelectedFriend(friendId);
            setOpponent('');
          }}
          onCustomNameChange={(name) => {
            setOpponentType('custom');
            setOpponent(name);
            setSelectedFriend('');
          }}
          customSuggestions={opponents}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="block text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
            You
          </Label>
          <StepperInput value={yourScore} onValueChange={setYourScore} label="Your score" min={0} />
        </div>
        <div className="space-y-2">
          <Label className="block text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {opponentLabel}
          </Label>
          <StepperInput value={opponentScore} onValueChange={setOpponentScore} label="Opponent score" min={0} />
        </div>
      </div>
    </div>
  );
}
