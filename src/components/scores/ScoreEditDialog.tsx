import { useState, useEffect } from 'react';
import { Calendar, Save, X, Tablets, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { supabaseDb, Score } from '@/lib/supabase-database';

interface ScoreEditDialogProps {
  score: Score | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ScoreEditDialog({ score, open, onOpenChange, onSuccess }: ScoreEditDialogProps) {
  const [game, setGame] = useState(score?.game || '');
  const [player1, setPlayer1] = useState(score?.player1 || '');
  const [player2, setPlayer2] = useState(score?.player2 || '');
  const [yourScore, setYourScore] = useState(score?.score ? score.score.split('-')[0] : '');
  const [opponentScore, setOpponentScore] = useState(score?.score ? score.score.split('-')[1] : '');
  const [date, setDate] = useState<Date>(score?.date ? new Date(score.date) : new Date());
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
    { value: 'Pool', label: 'Pool', icon: Tablets },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  // Reset form when score changes
  useEffect(() => {
    if (score) {
      setGame(score.game);
      setPlayer1(score.player1);
      setPlayer2(score.player2);
      const [your, opponent] = score.score.split('-');
      setYourScore(your);
      setOpponentScore(opponent);
      setDate(new Date(score.date));
    }
  }, [score]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!score || !game || !player1 || !player2 || !yourScore || !opponentScore) {
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
        description: "Please log in to edit scores.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const combinedScore = `${yourScore}-${opponentScore}`;
      await supabaseDb.updateScore(score.id, {
        game: game as 'Pool' | 'Ping Pong',
        player1,
        player2,
        score: combinedScore,
        date: format(date, 'yyyy-MM-dd')
      });

      toast({
        title: "Score updated!",
        description: `${game} game updated: ${combinedScore}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to update score",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Score</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                onChange={(e) => setPlayer1(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            {/* Opponent */}
            <OpponentAutocomplete
              value={player2}
              onChange={setPlayer2}
              opponents={opponents}
              required
            />
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
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
          <div className="flex gap-3 pt-4">
            <EnhancedButton
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Updating..." : "Update Score"}
            </EnhancedButton>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}