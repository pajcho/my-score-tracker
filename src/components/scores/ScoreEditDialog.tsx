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
  const [player2, setPlayer2] = useState(score?.player2 || '');
  const [yourScore, setYourScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [date, setDate] = useState<Date>(score?.date ? new Date(score.date) : new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const currentUser = supabaseAuth.getCurrentProfile();

  const games = [
    { value: 'Pool', label: 'Pool', icon: Trophy },
    { value: 'Darts', label: 'Darts', icon: Target },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  // Reset form when score changes
  useEffect(() => {
    if (score) {
      setGame(score.game);
      setPlayer2(score.player2);
      setDate(new Date(score.date));
      
      // Parse the score string
      const scoreParts = score.score.split('-');
      if (scoreParts.length === 2) {
        setYourScore(scoreParts[0].trim());
        setOpponentScore(scoreParts[1].trim());
      }
    }
  }, [score]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!score || !game || !player2 || !yourScore || !opponentScore) {
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
      const finalScore = `${yourScore}-${opponentScore}`;
      await supabaseDb.updateScore(score.id, {
        game: game as 'Pool' | 'Darts' | 'Ping Pong',
        player1: currentUser?.name || score.player1,
        player2,
        score: finalScore,
        date: format(date, 'yyyy-MM-dd')
      });

      toast({
        title: "Score updated!",
        description: `${game} game updated: ${finalScore}`,
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

            {/* Opponent */}
            <div className="space-y-2 col-span-2">
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

          {/* Score Section */}
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg border border-muted">
              <h3 className="font-medium text-sm text-muted-foreground mb-2">
                {currentUser?.name || 'You'} vs {player2 || 'Opponent'}
              </h3>
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="space-y-2">
                  <Label htmlFor="your-score" className="text-sm font-medium">Your Score *</Label>
                  <Input
                    id="your-score"
                    type="number"
                    min="0"
                    value={yourScore}
                    onChange={(e) => setYourScore(e.target.value)}
                    placeholder="0"
                    className="text-center text-lg font-bold"
                    required
                  />
                </div>
                <div className="text-2xl font-bold text-muted-foreground self-end pb-2">
                  -
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opponent-score" className="text-sm font-medium">Opponent Score *</Label>
                  <Input
                    id="opponent-score"
                    type="number"
                    min="0"
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(e.target.value)}
                    placeholder="0"
                    className="text-center text-lg font-bold"
                    required
                  />
                </div>
              </div>
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