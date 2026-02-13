import { useState, useEffect } from 'react';
import { Calendar, Triangle, Zap, Users, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { OpponentAutocomplete } from '@/components/ui/opponent-autocomplete';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb } from '@/lib/supabase-database';

const toggleOptionClassName =
  "h-10 justify-start rounded-md px-3 text-foreground hover:bg-background hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-none";

interface ScoreFormFieldsProps {
  game: string;
  setGame: (game: string) => void;
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
  const [opponents, setOpponents] = useState<string[]>([]);
  const [friends, setFriends] = useState<{ id: string; name: string; email: string }[]>([]);

  const games = [
    { value: 'Pool', label: 'Pool', icon: Triangle },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];
  const initialOpponentUserId = initialData?.opponent_user_id;
  const initialOpponentName = initialData?.opponent_name;

  // Load opponents and friends for autocomplete
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
              setGame(value);
            }}
            className="grid grid-cols-2 gap-2"
          >
            {games.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                variant="outline"
                className={toggleOptionClassName}
              >
                <Icon className="mr-2 h-4 w-4" />
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
                  "w-full justify-start text-left font-normal",
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
