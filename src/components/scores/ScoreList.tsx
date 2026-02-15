import { Score } from '@/lib/supabaseDatabase';
import { GameList } from '@/components/ui/gameList';

interface ScoreListProps {
  scores: Score[];
  onScoreUpdated: () => void;
  compact?: boolean;
}

export function ScoreList({ scores, onScoreUpdated, compact = false }: ScoreListProps) {
  return (
    <GameList 
      scores={scores} 
      onScoreUpdated={onScoreUpdated} 
      compact={compact}
    />
  );
}
