import { useState } from 'react';
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
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';

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
  const [player1, setPlayer1] = useState(initialData?.player1 || auth.getCurrentUser()?.name || '');
  const [player2, setPlayer2] = useState(initialData?.player2 || '');
  const [score, setScore] = useState(initialData?.score || '');
  const [date, setDate] = useState<Date>(initialData?.date ? new Date(initialData.date) : new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const games = [
    { value: 'Pool', label: 'Pool', icon: Trophy },
    { value: 'Darts', label: 'Darts', icon: Target },
    { value: 'Ping Pong', label: 'Ping Pong', icon: Zap },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!game || !player1 || !player2 || !score) {
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
      await db.createScore(
        user.id,
        game,
        player1,
        player2,
        score,
        format(date, 'yyyy-MM-dd')
      );

      toast({
        title: "Score added!",
        description: `${game} game recorded: ${score}`,
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

            {/* Score */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="score">Score *</Label>
              <Input
                id="score"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g., 5-3, 21-18, 11-9"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the final score in format: Your Score - Opponent Score
              </p>
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