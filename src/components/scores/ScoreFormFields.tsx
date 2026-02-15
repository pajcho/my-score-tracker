import { useEffect } from 'react';
import { Calendar, Users, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { OpponentAutocomplete } from '@/components/ui/opponentAutocomplete';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggleGroup';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { GAME_TYPE_OPTIONS, POOL_TYPE_OPTIONS, isPoolGameType, type GameType, type PoolType } from '@/lib/gameTypes';
import { GameTypeIcon, PoolTypeIcon } from '@/components/ui/gameTypeIcon';
import { useAuth } from '@/components/auth/authContext';
import { useFriendsQuery, useOpponentsQuery } from '@/hooks/useTrackerData';

const toggleOptionClassName =
  "h-10 justify-start rounded-md px-3 text-foreground hover:bg-muted/60 hover:text-foreground dark:bg-muted/40 dark:hover:bg-muted/55 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground data-[state=on]:shadow-none dark:data-[state=on]:bg-muted/65";

interface ScoreFormFieldsProps {
  game: GameType;
  setGame: (game: GameType) => void;
  poolType: PoolType;
  setPoolType: (poolType: PoolType) => void;
  opponent: string;
  setOpponent: (opponent: string) => void;
  yourScore: string;
  setYourScore: (score: string) => void;
  opponentScore: string;
  setOpponentScore: (score: string) => void;
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
  const opponents = opponentsQuery.data ?? [];
  const friends = friendsQuery.data ?? [];

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Game Type *</Label>
          <ToggleGroup
            type="single"
            value={game}
            onValueChange={(value) => {
              if (!value) return;
              setGame(value as GameType);
            }}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {GAME_TYPE_OPTIONS.map(({ value, label }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                variant="outline"
                className={toggleOptionClassName}
              >
                <GameTypeIcon gameType={value} className="mr-2 h-4 w-4" />
                {label}
                <span
                  className={`ml-auto h-2.5 w-2.5 rounded-full border ${game === value ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
                />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <Label>Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal dark:bg-muted/40 dark:hover:bg-muted/55",
                  !date && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isPoolGameType(game) && (
        <div className="space-y-2">
          <Label>Pool Type *</Label>
          <ToggleGroup
            type="single"
            value={poolType}
            onValueChange={(value) => {
              if (!value) return;
              setPoolType(value as PoolType);
            }}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {POOL_TYPE_OPTIONS.map(({ value, label }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                variant="outline"
                className={toggleOptionClassName}
              >
                <PoolTypeIcon poolType={value} className="mr-2 h-4 w-4" />
                {label}
                <span
                  className={`ml-auto h-2.5 w-2.5 rounded-full border ${poolType === value ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
                />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <div className="space-y-3">
        <Label>Opponent *</Label>
        <ToggleGroup
          type="single"
          value={opponentType}
          onValueChange={(value) => {
            if (!value) return;
            setOpponentType(value as 'custom' | 'friend');
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
              className={`ml-auto h-2.5 w-2.5 rounded-full border ${opponentType === 'friend' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
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
              className={`ml-auto h-2.5 w-2.5 rounded-full border ${opponentType === 'custom' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent'}`}
            />
          </ToggleGroupItem>
        </ToggleGroup>

        {opponentType === 'custom' ? (
          <OpponentAutocomplete
            value={opponent}
            onChange={(value) => {
              setOpponent(value);
              setSelectedFriend('');
            }}
            opponents={opponents}
            required
          />
        ) : (
          <Select value={selectedFriend} onValueChange={(value) => {
            setSelectedFriend(value);
            setOpponent('');
          }}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="yourScore">Your Score *</Label>
          <Input
            id="yourScore"
            type="number"
            min="0"
            value={yourScore}
            onChange={(e) => setYourScore(e.target.value)}
            placeholder="Your score"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="opponentScore">Opponent Score *</Label>
          <Input
            id="opponentScore"
            type="number"
            min="0"
            value={opponentScore}
            onChange={(e) => setOpponentScore(e.target.value)}
            placeholder="Opponent score"
            required
          />
        </div>
      </div>
    </div>
  );
}
