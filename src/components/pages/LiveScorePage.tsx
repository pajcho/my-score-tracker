import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveScoreTracker } from '@/components/scores/LiveScoreTracker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, X } from 'lucide-react';

export function LiveScorePage() {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [hasActiveGames, setHasActiveGames] = useState(false);

  // Prevent navigation if there are active games
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveGames) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasActiveGames]);

  const handleClose = () => {
    if (hasActiveGames) {
      setShowWarning(true);
    } else {
      navigate('/');
    }
  };

  const handleForceClose = () => {
    setShowWarning(false);
    navigate('/');
  };

  const handleScoresSaved = () => {
    setHasActiveGames(false);
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <LiveScoreTracker 
        onClose={handleClose}
        onScoresSaved={handleScoresSaved}
        onActiveGamesChange={setHasActiveGames}
      />

      {/* Navigation Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have active games with unsaved scores. If you leave this page, 
              your current progress will be lost.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => setShowWarning(false)}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Continue Playing
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceClose}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Discard & Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}