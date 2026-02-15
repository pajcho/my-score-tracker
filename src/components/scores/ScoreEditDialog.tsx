import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScoreFormFields } from './ScoreFormFields';
import { format } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { supabaseDb, Score } from '@/lib/supabaseDatabase';
import { DEFAULT_GAME_TYPE, DEFAULT_POOL_TYPE, isPoolGameType, type GameType, type PoolType } from '@/lib/gameTypes';
import { invalidateTrackerQueries } from '@/lib/queryCache';
import { ResponsiveFormModal } from '@/components/ui/responsiveFormModal';

interface ScoreEditDialogProps {
  score: Score | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ScoreEditDialog({ score, open, onOpenChange, onSuccess }: ScoreEditDialogProps) {
  const [game, setGame] = useState<GameType>(score?.game || DEFAULT_GAME_TYPE);
  const [poolType, setPoolType] = useState<PoolType>(score?.pool_settings?.pool_type || DEFAULT_POOL_TYPE);
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
      setPoolType(score.pool_settings?.pool_type || DEFAULT_POOL_TYPE);
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
        game,
        opponent_name: opponentName,
        opponent_user_id: opponentUserId,
        score: combinedScore,
        date: format(date, 'yyyy-MM-dd')
      });

      if (isPoolGameType(game)) {
        await supabaseDb.setScorePoolType(score.id, poolType);
      } else {
        await supabaseDb.deleteScorePoolSettings(score.id);
      }
      await invalidateTrackerQueries({
        scores: true,
        opponents: true,
      });

      toast({
        title: "Score updated!",
        description: `${game} game updated: ${combinedScore}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: "Failed to update score",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
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
          initialData={{
            opponent_user_id: score?.opponent_user_id,
            opponent_name: score?.opponent_name
          }}
        />
      </div>

      <div className="mt-2 flex flex-row gap-3 border-t px-4 pt-3">
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
  );

  return (
    <ResponsiveFormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Score"
    >
      {formContent}
    </ResponsiveFormModal>
  );
}
