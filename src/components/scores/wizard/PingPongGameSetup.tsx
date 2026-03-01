import { useState } from 'react';
import { WizardLayout } from './WizardLayout';
import { StepOpponentSelect } from './steps/StepOpponentSelect';
import { StepResultEntry } from './steps/StepResultEntry';
import type { BreakRule } from '@/lib/supabaseDatabase';
import type { GameType } from '@/lib/gameTypes';

type WizardMode = 'live' | 'finished';

interface PingPongGameSetupProps {
  mode?: WizardMode;
  friends: { id: string; name: string; email: string }[];
  currentUserName: string;
  onCancel: () => void;
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
}

export function PingPongGameSetup({
  mode = 'live',
  friends,
  currentUserName,
  onCancel,
  onComplete,
}: PingPongGameSetupProps) {
  const isFinishedMode = mode === 'finished';
  const [currentStep, setCurrentStep] = useState<1 | 2>(isFinishedMode ? 1 : 1);
  const [opponent, setOpponent] = useState('');
  const [opponentType, setOpponentType] = useState<'custom' | 'friend'>('friend');
  const [selectedFriend, setSelectedFriend] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [yourScore, setYourScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');

  const opponentName =
    opponentType === 'friend'
      ? friends.find(f => f.id === selectedFriend)?.name || ''
      : opponent;

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriend(friendId);
    setOpponentType('friend');
    setOpponent('');

    // Auto-submit only in live mode
    if (!isFinishedMode) {
      onComplete({
        game: 'Ping Pong',
        poolType: '',
        opponent: '',
        opponentType: 'friend',
        selectedFriend: friendId,
        breakRule: 'alternate',
        firstBreakerSelection: 'random',
      });
    }
  };

  const handleCustomOpponentSelect = (name: string) => {
    setOpponent(name);
    setOpponentType('custom');
    setSelectedFriend('');
  };

  const handleNext = () => {
    setCurrentStep(2);
  };

  const handlePrev = () => {
    setCurrentStep(1);
  };

  const handleSubmit = () => {
    const baseData = {
      game: 'Ping Pong' as const,
      poolType: '',
      opponent: opponentType === 'custom' ? opponent : '',
      opponentType,
      selectedFriend: opponentType === 'friend' ? selectedFriend : '',
      breakRule: 'alternate' as const,
      firstBreakerSelection: 'random' as const,
    };

    if (isFinishedMode) {
      onComplete({
        ...baseData,
        date,
        yourScore,
        opponentScore,
      });
    } else {
      onComplete(baseData);
    }
  };

  const canProceed = opponentType === 'friend' ? !!selectedFriend : !!opponent;
  const totalSteps = isFinishedMode ? 2 : 1;

  return (
    <WizardLayout
      title="Start a New Game"
      step={currentStep}
      totalSteps={totalSteps}
      onBack={isFinishedMode && currentStep > 1 ? handlePrev : undefined}
      onCancel={onCancel}
      onNext={isFinishedMode && currentStep < totalSteps ? handleNext : undefined}
      onSubmit={currentStep === totalSteps ? handleSubmit : undefined}
      canProceed={canProceed}
    >
      {currentStep === 1 && (
        <StepOpponentSelect
          friends={friends}
          selectedFriendId={selectedFriend}
          customOpponentName={opponentType === 'custom' ? opponent : ''}
          onSelectFriend={handleFriendSelect}
          onSelectCustom={handleCustomOpponentSelect}
        />
      )}

      {isFinishedMode && currentStep === 2 && (
        <StepResultEntry
          playerName={currentUserName}
          opponentName={opponentName}
          date={date}
          setDate={setDate}
          yourScore={yourScore}
          setYourScore={setYourScore}
          opponentScore={opponentScore}
          setOpponentScore={setOpponentScore}
        />
      )}
    </WizardLayout>
  );
}
