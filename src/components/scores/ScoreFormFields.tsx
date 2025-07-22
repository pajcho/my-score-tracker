import { useState, useEffect } from 'react';
import { Calendar, Triangle, Zap, Users, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { OpponentAutocomplete } from '@/components/ui/opponent-autocomplete';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb } from '@/lib/supabase-database';

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

  // Set initial opponent type and selection based on initialData
  useEffect(() => {
    if (initialData?.opponent_user_id && friends.length > 0) {
      const friend = friends.find(f => f.id === initialData.opponent_user_id);
      if (friend && opponentType !== 'friend') {
        setOpponentType('friend');
        setSelectedFriend(friend.id);
        setOpponent(''); // Clear custom opponent when friend is selected
      }
    } else if (initialData?.opponent_name && !initialData?.opponent_user_id && opponentType !== 'custom') {
      setOpponentType('custom');
      setOpponent(initialData.opponent_name);
      setSelectedFriend(''); // Clear friend selection when custom opponent is set
    }
  }, [initialData, friends]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Game Selection */}
      <div className="space-y-2">
        <Label htmlFor="game">Game Type *</Label>
        <Select value={game} onValueChange={setGame} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a game" />
          </SelectTrigger>
          <SelectContent>
            {games.map(({ value, label, icon: Icon }) => (
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

      {/* Date Picker */}
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

      {/* Opponent Selection */}
      <div className="md:col-span-2 space-y-4">
        <Label>Opponent *</Label>
        <Tabs value={opponentType} onValueChange={(value) => setOpponentType(value as 'custom' | 'friend')}>
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
              value={opponent}
              onChange={(value) => {
                setOpponent(value);
                setSelectedFriend(''); // Clear friend selection when custom opponent is entered
              }}
              opponents={opponents}
              required={opponentType === 'custom'}
            />
          </TabsContent>
          
          <TabsContent value="friend" className="space-y-2">
            <Select value={selectedFriend} onValueChange={(value) => {
              setSelectedFriend(value);
              setOpponent(''); // Clear custom opponent when friend is selected
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Scores */}
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
  );
}