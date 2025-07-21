import { useState, useEffect } from 'react';
import { Calendar, Save, X, Trophy, Target, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  const [player2, setPlayer2] = useState(initialData?.player2 || '');
  const [yourScore, setYourScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [date, setDate] = useState<Date>(initialData?.date ? new Date(initialData.date) : new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const currentUser = supabaseAuth.getCurrentProfile();

  // Parse existing score if editing
  useEffect(() => {
    if (initialData?.score) {
      const scoreParts = initialData.score.split('-');
      if (scoreParts.length === 2) {
        setYourScore(scoreParts[0].trim());
        setOpponentScore(scoreParts[1].trim());
      }
    }
  }, [initialData]);

  const games = [
    { value: 'Pool', label: 'Pool', icon: Trophy },
    { value: 'Darts', label: 'Darts', icon: Target },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!game || !player2 || !yourScore || !opponentScore) {
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
      const finalScore = `${yourScore}-${opponentScore}`;
      await supabaseDb.createScore(
        game,
        currentUser?.name || 'Unknown',
        player2,
        finalScore,
        format(date, 'yyyy-MM-dd')
      );

      toast({
        title: "Score added!",
        description: `${game} game recorded: ${finalScore}`,
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

            {/* Opponent */}
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

            {/* Score Section */}
            <div className="space-y-4 md:col-span-2">
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