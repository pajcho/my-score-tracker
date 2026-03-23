import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
    <div className="space-y-6">
      <div>
        {friends.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3">Select a friend:</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => onSelectFriend(friend.id)}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedFriendId === friend.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold text-sm">{friend.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-3">Or enter a custom opponent:</p>
          <Input
            placeholder="Opponent's name"
            value={customOpponentName}
            onChange={(e) => onSelectCustom(e.target.value)}
            className="h-10"
          />
        </div>
      </div>
    </div>
  );
}
