import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Triangle, Zap, Calendar, User, Trophy } from 'lucide-react';
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
import { ScoreEditDialog } from './ScoreEditDialog';

interface ScoreListProps {
  scores: Score[];
  onScoreUpdated: () => void;
  compact?: boolean;
}

export function ScoreList({ scores, onScoreUpdated, compact = false }: ScoreListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const { toast } = useToast();

  const gameIcons = {
    Pool: Triangle,
    'Ping Pong': Zap,
  };

  const getScoreResult = (score: string) => {
    const [player1Score, player2Score] = score.split('-').map(Number);
    if (player1Score > player2Score) return 'win';
    if (player1Score < player2Score) return 'loss';
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

  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scores found
      </div>
    );
  }

  const currentUser = supabaseAuth.getCurrentUser();

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {scores.map((score) => {
        const Icon = gameIcons[score.game as keyof typeof gameIcons] || Trophy;
        const result = getScoreResult(score.score);
        const isOwnScore = currentUser && score.user_id === currentUser.id;
        
        return (
          <Card 
            key={score.id} 
            className={cn(
              "shadow-card border-0 transition-smooth hover:scale-[1.02]",
              result === 'win' && "border-l-4 border-l-secondary",
              result === 'loss' && "border-l-4 border-l-destructive",
              result === 'tie' && "border-l-4 border-l-accent"
            )}
          >
            <CardContent className={cn("p-4", compact && "p-3")}>
              <div className="flex items-center">
                {/* Game Icon */}
                <div className={cn(
                  "p-2 rounded-full",
                  result === 'win' && "bg-secondary/10",
                  result === 'loss' && "bg-destructive/10",
                  result === 'tie' && "bg-accent/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    result === 'win' && "text-secondary",
                    result === 'loss' && "text-destructive",
                    result === 'tie' && "text-accent"
                  )} />
                </div>

                {/* Game Info */}
                <div className="flex-1 min-w-0 mx-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{score.game}</h4>
                    <Badge 
                      variant={result === 'win' ? 'default' : result === 'loss' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {result === 'win' ? 'WIN' : result === 'loss' ? 'LOSS' : 'TIE'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate">
                        You vs {(score as any).friend_name || score.opponent_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(score.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!compact && isOwnScore && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingScore(score)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === score.id}
                        >
                          <Trash2 className="h-4 w-4" />
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

                {/* Score - Always on the right */}
                <div className="text-right ml-auto">
                  <div className={cn(
                    "text-lg font-bold",
                    result === 'win' && "text-secondary",
                    result === 'loss' && "text-destructive",
                    result === 'tie' && "text-accent"
                  )}>
                    {score.score}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Edit Dialog */}
      <ScoreEditDialog
        score={editingScore}
        open={!!editingScore}
        onOpenChange={(open) => !open && setEditingScore(null)}
        onSuccess={onScoreUpdated}
      />
    </div>
  );
}
