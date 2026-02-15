import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScoreFormFields } from './ScoreFormFields';
import { format } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { supabaseDb } from '@/lib/supabaseDatabase';
import { DEFAULT_GAME_TYPE, DEFAULT_POOL_TYPE, isPoolGameType, type GameType, type PoolType } from '@/lib/gameTypes';
import { invalidateTrackerQueries } from '@/lib/queryCache';

interface ScoreFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialData?: {
    game: GameType;
    opponent_name?: string | null;
    opponent_user_id?: string | null;
    score: string;
    date: string;
  };
}

export function ScoreForm({ onCancel, onSuccess, initialData }: ScoreFormProps) {
  const [game, setGame] = useState<GameType>(initialData?.game || DEFAULT_GAME_TYPE);
  const [poolType, setPoolType] = useState<PoolType>(DEFAULT_POOL_TYPE);
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
      
      const createdScore = await supabaseDb.createScore(
        game,
        opponentName,
        combinedScore,
        format(date, 'yyyy-MM-dd'),
        opponentUserId
      );

      if (isPoolGameType(game)) {
        await supabaseDb.setScorePoolType(createdScore.id, poolType);
      }
      await invalidateTrackerQueries({
        scores: true,
        opponents: true,
      });

      toast({
        title: "Score added!",
        description: `${game} game recorded: ${combinedScore}`,
      });

      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: "Failed to save score",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4">
          <ScoreFormFields
            game={game}
            setGame={setGame}
            poolType={poolType}
            setPoolType={setPoolType}
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
      </div>

      <div className="mt-2 flex flex-row gap-3 border-t px-4 pt-3">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          <Save className="h-4 w-4" />
          {isLoading ? "Saving..." : "Save Score"}
        </Button>
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
  );
}
