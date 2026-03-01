import { ResponsiveFormModal } from '@/components/ui/responsiveFormModal';
import { GameSetupWizard } from './GameSetupWizard';
import { BreakRule } from '@/lib/supabaseDatabase';
import { GameType } from '@/lib/gameTypes';

type WizardMode = 'live' | 'finished';

interface WizardModalProps {
  open: boolean;
  onClose: () => void;
  mode: WizardMode;
  friends: { id: string; name: string; email: string }[];
  lastPoolSettings?: {
    poolType: string;
    breakRule: BreakRule;
  };
  currentUserName?: string;
  onComplete: (data: {
    game: GameType;
    poolType: string;
    opponent: string;
    opponentType: 'custom' | 'friend';
    selectedFriend: string;
    breakRule: BreakRule;
    firstBreakerSelection: 'player1' | 'player2' | 'random';
    date?: Date;
    yourScore?: string;
    opponentScore?: string;
  }) => void;
  onCancel?: () => void;
}

export function WizardModal({
  open,
  onClose,
  mode,
  friends,
  lastPoolSettings,
  currentUserName,
  onComplete,
  onCancel,
}: WizardModalProps) {
  const title = mode === 'live' ? 'Start Live Game' : 'Add Finished Score';

  return (
    <ResponsiveFormModal
      open={open}
      onOpenChange={onClose}
      title={title}
    >
      <GameSetupWizard
        mode={mode}
        onComplete={onComplete}
        onCancel={() => {
          onCancel?.();
          onClose();
        }}
        friends={friends}
        lastPoolSettings={lastPoolSettings}
        currentUserName={currentUserName}
      />
    </ResponsiveFormModal>
  );
}
