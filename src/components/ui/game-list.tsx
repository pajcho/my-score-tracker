import { Score } from '@/lib/supabase-database';
import { GameCard } from './game-card';
import { cn } from '@/lib/utils';

interface GameListProps {
  scores: Score[];
  onScoreUpdated: () => void;
  compact?: boolean;
  showActions?: boolean;
}

export function GameList({ scores, onScoreUpdated, compact = false, showActions = true }: GameListProps) {
  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scores found
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {scores.map((score) => (
        <GameCard
          key={score.id}
          score={score}
          onScoreUpdated={onScoreUpdated}
          compact={compact}
          showActions={true}
        />
      ))}
    </div>
  );
}