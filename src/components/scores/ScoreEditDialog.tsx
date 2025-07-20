import { useState, useEffect } from 'react';
import { Calendar, Save, X, Trophy, Target, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { db, Score } from '@/lib/database';

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
  const [scoreValue, setScoreValue] = useState(score?.score || '');
  const [date, setDate] = useState<Date>(score?.date ? new Date(score.date) : new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const games = [
    { value: 'Pool', label: 'Pool', icon: Trophy },
    { value: 'Darts', label: 'Darts', icon: Target },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  // Reset form when score changes
  useEffect(() => {
    if (score) {
      setGame(score.game);
      setPlayer1(score.player1);
      setPlayer2(score.player2);
      setScoreValue(score.score);
      setDate(new Date(score.date));
    }
  }, [score]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!score || !game || !player1 || !player2 || !scoreValue) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const user = auth.getCurrentUser();
    if (!user) return;

    setIsLoading(true);

    try {
      await db.updateScore(score.id, user.id, {
        game: game as 'Pool' | 'Darts' | 'Ping Pong',
        player1,
        player2,
        score: scoreValue,
        date: format(date, 'yyyy-MM-dd')
      });

      toast({
        title: "Score updated!",
        description: `${game} game updated: ${scoreValue}`,
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

            {/* Player 2 */}
            <div className="space-y-2">
              <Label htmlFor="player2">Opponent *</Label>
              <Input
                id="player2"
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                placeholder="Enter opponent's name"
                required
              />
            </div>
          </div>

          {/* Score */}
          <div className="space-y-2">
            <Label htmlFor="score">Score *</Label>
            <Input
              id="score"
              value={scoreValue}
              onChange={(e) => setScoreValue(e.target.value)}
              placeholder="e.g., 5-3, 21-18, 11-9"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the final score in format: Your Score - Opponent Score
            </p>
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