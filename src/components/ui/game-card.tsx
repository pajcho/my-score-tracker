import { useState } from 'react';
import { Edit, Trash2, Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb, Score } from '@/lib/supabase-database';
import { cn } from '@/lib/utils';
import { ScoreEditDialog } from '@/components/scores/ScoreEditDialog';
import { GameTypeIcon, PoolTypeIcon } from '@/components/ui/game-type-icon';
import { DEFAULT_POOL_TYPE, getGameTypeLabel, getPoolTypeLabel, isPoolGameType } from '@/lib/game-types';

type ScoreWithFriend = Score & { friend_name?: string | null };

interface GameCardProps {
  score: ScoreWithFriend;
  onScoreUpdated: () => void;
  compact?: boolean;
  showActions?: boolean;
}

export function GameCard({ score, onScoreUpdated, compact = false, showActions = true }: GameCardProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const { toast } = useToast();

  const getScoreResult = (scoreString: string, isCreator: boolean) => {
    const [score1, score2] = scoreString.split('-').map(Number);
    
    // If current user is the creator: score1 is their score, score2 is opponent's
    // If current user is NOT the creator: score1 is creator's score, score2 is current user's
    const userScore = isCreator ? score1 : score2;
    const opponentScore = isCreator ? score2 : score1;
    
    if (userScore > opponentScore) return 'win';
    if (userScore < opponentScore) return 'loss';
    return 'tie';
  };

  const handleDelete = async (scoreId: string) => {
    if (!supabaseAuth.isAuthenticated()) return;

    setDeletingId(scoreId);

    try {
      await supabaseDb.deleteScore(scoreId);
      toast({
        title: "Score deleted",
        description: "The score has been removed from your history",
      });
      onScoreUpdated();
    } catch (error) {
      toast({
        title: "Failed to delete score",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const currentUser = supabaseAuth.getCurrentUser();
  const isOwnScore = currentUser && score.user_id === currentUser.id;
  const result = getScoreResult(score.score, isOwnScore);
  const canShowActions = showActions && isOwnScore;
  const resultBadgeStyles = {
    win: "border-secondary/70 bg-secondary/10 text-secondary",
    loss: "border-destructive/70 bg-destructive/10 text-destructive",
    tie: "border-accent/70 bg-accent/10 text-accent",
  } as const;
  const poolType = score.pool_settings?.pool_type || DEFAULT_POOL_TYPE;
  const showPoolTypeIcon = isPoolGameType(score.game);

  return (
    <>
      <Card
        className={cn(
          "group overflow-hidden border bg-card/80 shadow-none transition-colors duration-200 hover:border-primary/30"
        )}
      >
        <CardContent className={cn("p-4 sm:p-5", compact && "p-3 sm:p-4")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {/* Game Icon */}
              <div className={cn("mt-0.5 hidden rounded-full border p-0.5 sm:block")}>
                {showPoolTypeIcon ? (
                  <PoolTypeIcon
                    poolType={poolType}
                    className={cn("h-6 w-6")}
                  />
                ) : (
                  <GameTypeIcon
                    gameType={score.game}
                    className={cn(
                      "h-6 w-6",
                      result === 'win' && "text-secondary",
                      result === 'loss' && "text-destructive",
                      result === 'tie' && "text-amber-400"
                    )}
                  />
                )}
              </div>

              {/* Game Info */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-semibold text-foreground">{getGameTypeLabel(score.game)}</h4>
                  {isPoolGameType(score.game) && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {getPoolTypeLabel(poolType)}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-6 rounded-sm border bg-transparent px-2.5 text-[11px] font-semibold tracking-wide",
                      resultBadgeStyles[result]
                    )}
                  >
                    {result === 'win' ? 'WIN' : result === 'loss' ? 'LOSS' : 'TIE'}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {isOwnScore
                        ? `You vs ${score.friend_name || score.opponent_name || 'Unknown'}`
                        : `${score.friend_name || score.opponent_name || 'Unknown'} vs You`
                      }
                    </span>
                  </div>
                  <div className="hidden h-1 w-1 rounded-full bg-border sm:block" />
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{format(new Date(score.date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
              {/* Actions */}
              {canShowActions && (
                <div className="-ml-2 flex items-center gap-1 sm:ml-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingScore(score)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === score.id}
                        className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Score</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this score? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(score.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              <div className={cn(
                "ml-auto rounded-lg border px-3 py-1.5 text-right",
                result === 'win' && "border-secondary/30 bg-secondary/10",
                result === 'loss' && "border-destructive/30 bg-destructive/10",
                result === 'tie' && "border-accent/30 bg-accent/10"
              )}>
                <div className={cn(
                  "text-xl font-bold tabular-nums leading-tight",
                  result === 'win' && "text-secondary",
                  result === 'loss' && "text-destructive",
                  result === 'tie' && "text-accent"
                )}>
                  {score.score}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ScoreEditDialog
        score={editingScore}
        open={!!editingScore}
        onOpenChange={(open) => !open && setEditingScore(null)}
        onSuccess={onScoreUpdated}
      />
    </>
  );
}
