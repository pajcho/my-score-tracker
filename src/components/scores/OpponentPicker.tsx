import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { OpponentAutocomplete } from '@/components/ui/opponentAutocomplete';
import { ChoiceChip } from '@/components/ui/choiceChip';

interface OpponentPickerProps {
  friends: { id: string; name: string }[];
  selectedFriendId: string;
  customName: string;
  onSelectFriend: (friendId: string) => void;
  onCustomNameChange: (name: string) => void;
  /** Autocomplete suggestions for the custom input (past opponent names). */
  customSuggestions?: string[];
}

/** "Mladen Pajic" → "Mladen P." — keeps chips short without ambiguity. */
function shortName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}

/**
 * Opponent entry as one row of friend chips plus a "+ Custom" chip that
 * reveals a free-text input on demand. Shared between the finished-score
 * form and the new-game wizard so both flows stay consistent.
 */
export function OpponentPicker({
  friends,
  selectedFriendId,
  customName,
  onSelectFriend,
  onCustomNameChange,
  customSuggestions,
}: OpponentPickerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  // Derived, not synced: an initial custom name (edit flows) opens the
  // input without any effect-driven state.
  const showCustom = friends.length === 0 || isCustomOpen || !!customName;

  const customInput = customSuggestions ? (
    <OpponentAutocomplete
      value={customName}
      onChange={onCustomNameChange}
      opponents={customSuggestions}
      placeholder="Opponent's name"
    />
  ) : (
    <Input
      placeholder="Opponent's name"
      value={customName}
      onChange={(event) => onCustomNameChange(event.target.value)}
    />
  );

  if (friends.length === 0) {
    return (
      <div className="space-y-2">
        {customInput}
        <p className="text-xs text-muted-foreground">Add friends to pick them with one tap.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {friends.map((friend) => (
          <ChoiceChip
            key={friend.id}
            active={selectedFriendId === friend.id}
            onClick={() => {
              setIsCustomOpen(false);
              onSelectFriend(friend.id);
            }}
          >
            {shortName(friend.name)}
          </ChoiceChip>
        ))}
        <ChoiceChip active={showCustom} onClick={() => setIsCustomOpen(true)} aria-label="Custom opponent">
          <UserPlus className="h-4 w-4" />
          Custom
        </ChoiceChip>
      </div>
      {showCustom && customInput}
    </div>
  );
}
