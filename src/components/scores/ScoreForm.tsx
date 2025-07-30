import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { ScoreFormFields } from './ScoreFormFields';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb } from '@/lib/supabase-database';

interface ScoreFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialData?: {
    game: string;
    opponent_name?: string | null;
    opponent_user_id?: string | null;
    score: string;
    date: string;
  };
}

export function ScoreForm({ onCancel, onSuccess, initialData }: ScoreFormProps) {
  const [game, setGame] = useState(initialData?.game || 'Pool');
  const [opponent, setOpponent] = useState(initialData?.opponent_name || '');
  const [yourScore, setYourScore] = useState(initialData?.score ? initialData.score.split('-')[0] : '');
  const [opponentScore, setOpponentScore] = useState(initialData?.score ? initialData.score.split('-')[1] : '');
  const [date, setDate] = useState<Date>(initialData?.date ? new Date(initialData.date) : new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [opponentType, setOpponentType] = useState<'custom' | 'friend'>('friend');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!game || !yourScore || !opponentScore) {
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
        description: "Please select a friend to play against",
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
      
      let opponentName: string | null = null;
      let opponentUserId: string | undefined;
      
      if (opponentType === 'friend' && selectedFriend) {
        // For friends, we store the user_id but no name (will be looked up from profiles)
        opponentUserId = selectedFriend;
      } else if (opponentType === 'custom' && opponent) {
        // For custom opponents, we store the name
        opponentName = opponent;
      }
      
      await supabaseDb.createScore(
        game,
        opponentName,
        combinedScore,
        format(date, 'yyyy-MM-dd'),
        opponentUserId
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
            initialData={initialData}
          />

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