import { OpponentPicker } from '@/components/scores/OpponentPicker';

interface StepOpponentSelectProps {
  friends: { id: string; name: string; email: string }[];
  selectedFriendId: string;
  customOpponentName: string;
  onSelectFriend: (friendId: string) => void;
  onSelectCustom: (name: string) => void;
}

export function StepOpponentSelect({
  friends,
  selectedFriendId,
  customOpponentName,
  onSelectFriend,
  onSelectCustom,
}: StepOpponentSelectProps) {
  return (
    <OpponentPicker
      friends={friends}
      selectedFriendId={selectedFriendId}
      customName={customOpponentName}
      onSelectFriend={onSelectFriend}
      onCustomNameChange={onSelectCustom}
    />
  );
}
