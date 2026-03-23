import { useEffect, useState } from 'react';
import { WizardLayout } from './WizardLayout';
import { StepPoolSettings } from './steps/StepPoolSettings';
import { StepOpponentSelect } from './steps/StepOpponentSelect';
import { StepBreakerSelect } from './steps/StepBreakerSelect';
import type { PoolType, BreakRule } from '@/lib/supabaseDatabase';
import type { GameType } from '@/lib/gameTypes';

type Step = 1 | 2 | 3;

interface PoolGameSetupProps {
  friends: { id: string; name: string; email: string }[];
  lastPoolSettings?: {
    poolType: PoolType;
    breakRule: BreakRule;
  };
  currentUserName: string;
  onCancel: () => void;
  onProgressChange?: (step: number, totalSteps: number) => void;
  onComplete: (data: {
    game: GameType;
    poolType: PoolType;
    opponent: string;
    opponentType: 'custom' | 'friend';
    selectedFriend: string;
    breakRule: BreakRule;
    firstBreakerSelection: 'player1' | 'player2' | 'random';
  }) => void;
}

export function PoolGameSetup({
  friends,
  lastPoolSettings,
  currentUserName,
  onCancel,
  onProgressChange,
  onComplete,
}: PoolGameSetupProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [poolType, setPoolType] = useState<PoolType>(lastPoolSettings?.poolType || '9-ball');
  const [breakRule, setBreakRule] = useState<BreakRule>(lastPoolSettings?.breakRule || 'alternate');
  const [opponent, setOpponent] = useState('');
  const [opponentType, setOpponentType] = useState<'custom' | 'friend'>('friend');
  const [selectedFriend, setSelectedFriend] = useState('');
  const [firstBreakerSelection, setFirstBreakerSelection] = useState<'player1' | 'player2' | 'random'>('random');
  const [randomBreakerHighlight, setRandomBreakerHighlight] = useState<'player1' | 'player2' | null>(null);

  useEffect(() => {
    onProgressChange?.(currentStep + 1, 4);
  }, [currentStep, onProgressChange]);

  // Get opponent name for display
  const opponentName =
    opponentType === 'friend'
      ? friends.find(f => f.id === selectedFriend)?.name || ''
      : opponent;

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriend(friendId);
    setOpponentType('friend');
    setOpponent('');
  };

  const handleCustomOpponentSelect = (name: string) => {
    setOpponent(name);
    setOpponentType('custom');
    setSelectedFriend('');
  };

  const handleRandomizeBreaker = () => {
    const randomSide = Math.random() < 0.5 ? 'player1' : 'player2';
    setRandomBreakerHighlight(randomSide);
    setFirstBreakerSelection(randomSide);
  };

  const handleConfirmBreaker = (side: 'player1' | 'player2') => {
    setFirstBreakerSelection(side);
    handleSubmit(side);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = (submittedFirstBreakerSelection = firstBreakerSelection) => {
    onComplete({
      game: 'Pool',
      poolType,
      opponent: opponentType === 'custom' ? opponent : '',
      opponentType,
      selectedFriend: opponentType === 'friend' ? selectedFriend : '',
      breakRule,
      firstBreakerSelection: submittedFirstBreakerSelection,
    });
  };

  const canProceed = (() => {
    if (currentStep === 2) {
      return opponentType === 'friend' ? !!selectedFriend : !!opponent;
    }
    return true;
  })();

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={3}
      subtitle={
        currentStep === 1
          ? 'Choose your pool rules.'
          : currentStep === 2
            ? 'Who are you playing against?'
            : 'Choose who breaks first.'
      }
      onCancel={onCancel}
      onNext={currentStep < 3 ? handleNext : undefined}
      onSubmit={currentStep === 3 ? handleSubmit : undefined}
      canProceed={canProceed}
    >
      {currentStep === 1 && (
        <StepPoolSettings
          poolType={poolType}
          breakRule={breakRule}
          onPoolTypeChange={setPoolType}
          onBreakRuleChange={setBreakRule}
        />
      )}

      {currentStep === 2 && (
        <StepOpponentSelect
          friends={friends}
          selectedFriendId={selectedFriend}
          customOpponentName={opponentType === 'custom' ? opponent : ''}
          onSelectFriend={handleFriendSelect}
          onSelectCustom={handleCustomOpponentSelect}
        />
      )}

      {currentStep === 3 && (
        <StepBreakerSelect
          player1Name={currentUserName}
          player2Name={opponentName}
          selectedBreaker={firstBreakerSelection}
          randomHighlight={randomBreakerHighlight}
          onSelectBreaker={handleConfirmBreaker}
          onRandomize={handleRandomizeBreaker}
        />
      )}
    </WizardLayout>
  );
}
