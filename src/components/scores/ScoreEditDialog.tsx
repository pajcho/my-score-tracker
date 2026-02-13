import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScoreFormFields } from './ScoreFormFields';
import { format } from 'date-fns';
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
  const [opponent, setOpponent] = useState(score?.opponent_name || '');
  const [yourScore, setYourScore] = useState(score?.score ? score.score.split('-')[0] : '');
  const [opponentScore, setOpponentScore] = useState(score?.score ? score.score.split('-')[1] : '');
  const [date, setDate] = useState<Date>(score?.date ? new Date(score.date) : new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [opponentType, setOpponentType] = useState<'custom' | 'friend'>('custom');
  const { toast } = useToast();

  // Reset form when score changes
  useEffect(() => {
    if (score) {
      setGame(score.game);
      setOpponent(score.opponent_name || '');
      const [your, opponent] = score.score.split('-');
      setYourScore(your);
      setOpponentScore(opponent);
      setDate(new Date(score.date));
      
      // Set opponent type based on whether there's an opponent_user_id
      if (score.opponent_user_id) {
        setOpponentType('friend');
        setSelectedFriend(score.opponent_user_id);
      } else {
        setOpponentType('custom');
        setSelectedFriend('');
      }
    }
  }, [score]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!score || !game || !yourScore || !opponentScore) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (opponentType === 'custom' && !opponent) {
      toast({
        title: "Missing information",
        description: "Please enter an opponent name",
        variant: "destructive",
      });
      return;
    }

    if (opponentType === 'friend' && !selectedFriend) {
      toast({
        title: "Missing information",
        description: "Please select a friend",
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
      
      let opponentName: string | null = null;
      let opponentUserId: string | null = null;
      
      if (opponentType === 'friend' && selectedFriend) {
        opponentUserId = selectedFriend;
      } else if (opponentType === 'custom' && opponent) {
        opponentName = opponent;
      }
      
      await supabaseDb.updateScore(score.id, {
        game: game as 'Pool' | 'Ping Pong',
        opponent_name: opponentName,
        opponent_user_id: opponentUserId,
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
          <ScoreFormFields
            game={game}
            setGame={setGame}
            opponent={opponent}
            setOpponent={setOpponent}
            yourScore={yourScore}
            setYourScore={setYourScore}
            opponentScore={opponentScore}
            setOpponentScore={setOpponentScore}
            date={date}
            setDate={setDate}
            opponentType={opponentType}
            setOpponentType={setOpponentType}
            selectedFriend={selectedFriend}
            setSelectedFriend={setSelectedFriend}
            initialData={{
              opponent_user_id: score?.opponent_user_id,
              opponent_name: score?.opponent_name
            }}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Updating..." : "Update Score"}
            </Button>
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
