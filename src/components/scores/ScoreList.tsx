import { Score } from '@/lib/supabase-database';
import { GameList } from '@/components/ui/game-list';

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
