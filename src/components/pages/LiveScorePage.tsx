import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveScoreTracker } from '@/components/scores/LiveScoreTracker';
import { useWakeLock } from '@/hooks/useWakeLock';

export function LiveScorePage() {
  const navigate = useNavigate();

  // The phone sits on the table rail during a game — don't let it dim.
  useWakeLock(true);

  // A flurry of taps near the top of the page must not trigger
  // pull-to-refresh mid-rack.
  useEffect(() => {
    document.documentElement.style.overscrollBehaviorY = 'none';
    return () => {
      document.documentElement.style.overscrollBehaviorY = '';
    };
  }, []);

  const handleClose = () => {
    navigate('/');
  };

  const handleScoresSaved = () => {
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <LiveScoreTracker
        onClose={handleClose}
        onScoresSaved={handleScoresSaved}
      />
    </div>
  );
}
