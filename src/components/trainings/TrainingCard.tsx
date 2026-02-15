import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alertDialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useToast } from '@/hooks/useToast';
import { useIsMobile } from '@/hooks/useMobile';
import { GameTypeIcon } from '@/components/ui/gameTypeIcon';
import { getGameTypeLabel } from '@/lib/gameTypes';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { supabaseDb, Training } from '@/lib/supabaseDatabase';
import { TrainingEditDialog } from '@/components/trainings/TrainingEditDialog';
import { invalidateTrackerQueries } from '@/lib/queryCache';

interface TrainingCardProps {
  training: Training;
  notesClassName?: string;
  onTrainingUpdated?: () => void;
  showActions?: boolean;
}

export function TrainingCard({
  training,
  notesClassName,
  onTrainingUpdated,
  showActions = false,
}: TrainingCardProps) {
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!supabaseAuth.isAuthenticated()) return;
    setDeletingId(training.id);

    try {
      await supabaseDb.deleteTraining(training.id);
      await invalidateTrackerQueries({
        trainings: true,
      });
      toast({
        title: 'Training deleted',
        description: 'The training has been removed from your history',
      });
      onTrainingUpdated?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: 'Failed to delete training',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <GameTypeIcon gameType={training.game} className="mt-2 hidden h-8 w-8 shrink-0 text-muted-foreground sm:block" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{training.title}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {getGameTypeLabel(training.game)} • {new Date(training.training_date).toLocaleDateString()}
              </p>
              {training.notes ? (
                <p className={notesClassName || 'mt-2 text-sm text-muted-foreground whitespace-pre-wrap'}>
                  {training.notes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
            {showActions ? (
              <div className="-ml-2 flex items-center gap-1 sm:ml-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTraining(training)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                {isMobile ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === training.id}
                    onClick={() => setIsDeleteSheetOpen(true)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === training.id}
                        className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Training</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this training? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row justify-end gap-2 space-x-0">
                        <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ) : null}

            <div className="ml-auto mt-1 rounded-lg border border-muted-foreground/30 bg-muted/30 px-3 py-1.5 text-right sm:ml-0 sm:mt-0">
              <div className="text-xl font-semibold leading-tight tabular-nums text-muted-foreground">
                {training.duration_minutes} min
              </div>
            </div>
          </div>
        </div>
      </div>
      <TrainingEditDialog
        training={editingTraining}
        open={!!editingTraining}
        onOpenChange={(open) => !open && setEditingTraining(null)}
        onSuccess={() => onTrainingUpdated?.()}
      />
      <Drawer open={isDeleteSheetOpen} onOpenChange={setIsDeleteSheetOpen}>
        <DrawerContent className="px-4 pb-4">
          <DrawerHeader className="text-left">
            <DrawerTitle>Delete Training</DrawerTitle>
          </DrawerHeader>
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            Are you sure you want to delete this training? This action cannot be undone.
          </p>
          <div className="flex flex-row gap-3 px-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsDeleteSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await handleDelete();
                setIsDeleteSheetOpen(false);
              }}
            >
              Delete
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
