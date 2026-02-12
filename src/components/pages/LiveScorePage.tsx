import { useNavigate } from 'react-router-dom';
import { LiveScoreTracker } from '@/components/scores/LiveScoreTracker';

export function LiveScorePage() {
  const navigate = useNavigate();

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
