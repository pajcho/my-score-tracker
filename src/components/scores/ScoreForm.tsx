import { useState, useEffect } from 'react';
import { Calendar, Save, X, Triangle, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { OpponentAutocomplete } from '@/components/ui/opponent-autocomplete';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb } from '@/lib/supabase-database';

interface ScoreFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialData?: {
    game: string;
    player1: string;
    player2: string;
    score: string;
    date: string;
  };
}

export function ScoreForm({ onCancel, onSuccess, initialData }: ScoreFormProps) {
  const [game, setGame] = useState(initialData?.game || '');
  const [player1, setPlayer1] = useState(initialData?.player1 || supabaseAuth.getCurrentProfile()?.name || '');
  const [player2, setPlayer2] = useState(initialData?.player2 || '');
  const [yourScore, setYourScore] = useState(initialData?.score ? initialData.score.split('-')[0] : '');
  const [opponentScore, setOpponentScore] = useState(initialData?.score ? initialData.score.split('-')[1] : '');
  const [date, setDate] = useState<Date>(initialData?.date ? new Date(initialData.date) : new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [opponents, setOpponents] = useState<string[]>([]);
  const { toast } = useToast();

  // Load opponents for autocomplete
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

  const games = [
    { value: 'Pool', label: 'Pool', icon: Triangle },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!game || !player1 || !player2 || !yourScore || !opponentScore) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!supabaseAuth.isAuthenticated()) {
      toast({
        title: "Authentication required",
        description: "Please log in to save scores.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const combinedScore = `${yourScore}-${opponentScore}`;
      await supabaseDb.createScore(
        game,
        player1,
        player2,
        combinedScore,
        format(date, 'yyyy-MM-dd')
      );

      toast({
        title: "Score added!",
        description: `${game} game recorded: ${combinedScore}`,
      });

      onSuccess();
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

  return (
    <Card className="shadow-card border-0">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Player 1 */}
            <div className="space-y-2">
              <Label htmlFor="player1">Your Name *</Label>
              <Input
                id="player1"
                value={player1}
                readOnly
                className="bg-muted/50 cursor-not-allowed"
                placeholder="Your name (auto-filled)"
                required
              />
              <p className="text-xs text-muted-foreground">
                Automatically filled from your profile
              </p>
            </div>

            {/* Opponent */}
            <OpponentAutocomplete
              value={player2}
              onChange={setPlayer2}
              opponents={opponents}
              required
            />

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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <EnhancedButton
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Score"}
            </EnhancedButton>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}