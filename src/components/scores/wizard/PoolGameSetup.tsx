import { useState } from 'react';
import { WizardLayout } from './WizardLayout';
import { StepPoolSettings } from './steps/StepPoolSettings';
import { StepOpponentSelect } from './steps/StepOpponentSelect';
import { StepBreakerSelect } from './steps/StepBreakerSelect';
import { StepResultEntry } from './steps/StepResultEntry';
import type { PoolType, BreakRule } from '@/lib/supabaseDatabase';
import type { GameType } from '@/lib/gameTypes';

type WizardMode = 'live' | 'finished';
type Step = 1 | 2 | 3 | 4;

interface PoolGameSetupProps {
  mode?: WizardMode;
  friends: { id: string; name: string; email: string }[];
  lastPoolSettings?: {
    poolType: PoolType;
    breakRule: BreakRule;
  };
  currentUserName: string;
  onCancel: () => void;
  onComplete: (data: {
    game: GameType;
    poolType: PoolType;
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

export function PoolGameSetup({
  mode = 'live',
  friends,
  lastPoolSettings,
  currentUserName,
  onCancel,
  onComplete,
}: PoolGameSetupProps) {
  const isFinishedMode = mode === 'finished';
  const totalSteps = isFinishedMode ? 3 : 4;

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [poolType, setPoolType] = useState<PoolType>(lastPoolSettings?.poolType || '9-ball');
  const [breakRule, setBreakRule] = useState<BreakRule>(lastPoolSettings?.breakRule || 'alternate');
  const [opponent, setOpponent] = useState('');
  const [opponentType, setOpponentType] = useState<'custom' | 'friend'>('friend');
  const [selectedFriend, setSelectedFriend] = useState('');
  const [firstBreakerSelection, setFirstBreakerSelection] = useState<'player1' | 'player2' | 'random'>('random');
  const [randomBreakerHighlight, setRandomBreakerHighlight] = useState<'player1' | 'player2' | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [yourScore, setYourScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');

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
    handleSubmit();
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(isFinishedMode ? 3 : 3);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = () => {
    const baseData = {
      game: 'Pool' as const,
      poolType,
      opponent: opponentType === 'custom' ? opponent : '',
      opponentType,
      selectedFriend: opponentType === 'friend' ? selectedFriend : '',
      breakRule,
      firstBreakerSelection,
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

  const canProceed = (() => {
    if (currentStep === 2) {
      return opponentType === 'friend' ? !!selectedFriend : !!opponent;
    }
    return true;
  })();

  return (
    <WizardLayout
      title="Start a New Game"
      step={currentStep}
      totalSteps={totalSteps}
      onBack={currentStep > 1 ? handlePrev : undefined}
      onCancel={onCancel}
      onNext={currentStep < totalSteps ? handleNext : undefined}
      onSubmit={currentStep === totalSteps ? handleSubmit : undefined}
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

      {isFinishedMode && currentStep === 3 && (
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

      {!isFinishedMode && currentStep === 3 && (
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
