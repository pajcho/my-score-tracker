import { useState } from 'react';
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
import { ScoreEditDialog } from '@/components/scores/ScoreEditDialog';

interface GameCardProps {
  score: Score;
  onScoreUpdated: () => void;
  compact?: boolean;
  showActions?: boolean;
}

export function GameCard({ score, onScoreUpdated, compact = false, showActions = true }: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const { toast } = useToast();

  const gameIcons = {
    Pool: Triangle,
    'Ping Pong': Zap,
  };

  const getScoreResult = (scoreString: string) => {
    const [player1Score, player2Score] = scoreString.split('-').map(Number);
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

  const Icon = gameIcons[score.game as keyof typeof gameIcons] || Trophy;
  const result = getScoreResult(score.score);
  const currentUser = supabaseAuth.getCurrentUser();
  const isOwnScore = currentUser && score.user_id === currentUser.id;
  const canShowActions = showActions && isOwnScore;

  return (
    <>
      <Card 
        className={cn(
          "shadow-card border-0 transition-smooth hover:scale-[1.02] group",
          result === 'win' && "border-l-4 border-l-secondary",
          result === 'loss' && "border-l-4 border-l-destructive",
          result === 'tie' && "border-l-4 border-l-accent"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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

            {/* Actions - Show on hover */}
            {canShowActions && (
              <div className={cn(
                "flex items-center gap-1 transition-all duration-200",
                isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
              )}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingScore(score)}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === score.id}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
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

            {/* Score - Always on the right */}
            <div className={cn(
              "text-right ml-4",
              canShowActions && isHovered && "mr-2" // Add margin when actions are visible
            )}>
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