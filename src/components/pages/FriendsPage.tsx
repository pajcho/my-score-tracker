import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Mail, Check, X, Trash2, Clock, Share2, User, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/pageHeader';
import { ResponsiveFormModal } from '@/components/ui/responsiveFormModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alertDialog';
import { useToast } from '@/hooks/useToast';
import { useGravatarUrl } from '@/hooks/useGravatar';
import { useAuth } from '@/components/auth/authContext';
import { useScoresQuery } from '@/hooks/useTrackerData';
import { supabaseFriends, Friend, FriendInvitation } from '@/lib/supabaseFriends';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { format } from 'date-fns';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Please try again';
}

interface FriendRecord {
  games: number;
  wins: number;
  losses: number;
}

interface FriendRowProps {
  friend: Friend;
  record: FriendRecord | undefined;
  onOpenStats: () => void;
  onRemove: () => void;
}

function FriendRow({ friend, record, onOpenStats, onRemove }: FriendRowProps) {
  const gravatarUrl = useGravatarUrl(friend.friend_email);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={onOpenStats}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Head-to-head statistics vs ${friend.friend_name}`}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={gravatarUrl} alt={friend.friend_name} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{friend.friend_name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {record && record.games > 0 ? (
              <>
                {record.games} {record.games === 1 ? 'game' : 'games'} ·{' '}
                <span className="font-medium text-secondary">{record.wins}W</span>–
                <span className="font-medium text-destructive">{record.losses}L</span>
              </>
            ) : (
              `Friends since ${format(new Date(friend.friendship_created_at), 'MMM d, yyyy')}`
            )}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-11 shrink-0 p-0 text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${friend.friend_name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {friend.friend_name} from your friends? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentInvitations, setSentInvitations] = useState<FriendInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<FriendInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const authState = useAuth();
  const currentUserId = authState.isAuthenticated ? authState.user?.id : undefined;
  const scoresQuery = useScoresQuery(currentUserId);

  const loadData = useCallback(async () => {
    if (!supabaseAuth.isAuthenticated()) return;
    const currentUser = supabaseAuth.getCurrentUser();
    if (!currentUser) return;
    const currentProfile = supabaseAuth.getCurrentProfile();
    const currentUserEmail = currentProfile?.email ?? currentUser.email ?? null;

    try {
      setIsLoading(true);
      const [friendsData, sentData, receivedData] = await Promise.all([
        supabaseFriends.getFriends(currentUser.id),
        supabaseFriends.getSentInvitations(currentUser.id),
        supabaseFriends.getReceivedInvitations(currentUser.id, currentUserEmail)
      ]);

      setFriends(friendsData);
      setSentInvitations(sentData);
      setReceivedInvitations(receivedData);
    } catch (error) {
      console.error('Failed to load friends data:', error);
      toast({
        title: "Failed to load friends",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Head-to-head record per friend — the reason the list exists.
  const recordByFriendId = useMemo(() => {
    const records = new Map<string, FriendRecord>();
    if (!currentUserId) return records;
    for (const score of scoresQuery.data ?? []) {
      const otherId = score.user_id === currentUserId ? score.opponent_user_id : score.user_id;
      if (!otherId) continue;
      const [score1, score2] = score.score.split('-').map(Number);
      if (Number.isNaN(score1) || Number.isNaN(score2)) continue;
      const isOwnScore = score.user_id === currentUserId;
      const userScore = isOwnScore ? score1 : score2;
      const opponentScore = isOwnScore ? score2 : score1;
      const record = records.get(otherId) ?? { games: 0, wins: 0, losses: 0 };
      record.games += 1;
      if (userScore > opponentScore) record.wins += 1;
      else if (userScore < opponentScore) record.losses += 1;
      records.set(otherId, record);
    }
    return records;
  }, [currentUserId, scoresQuery.data]);

  const handleSendInvitation = async () => {
    if (!inviteEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const currentUser = supabaseAuth.getCurrentUser();
      const currentProfile = supabaseAuth.getCurrentProfile();
      await supabaseFriends.sendFriendInvitation(
        inviteEmail,
        inviteMessage,
        currentUser?.id,
        currentProfile?.email ?? currentUser?.email ?? null
      );

      toast({
        title: "Invitation sent!",
        description: `Friend invitation sent to ${inviteEmail}`,
      });

      setInviteEmail('');
      setInviteMessage('');
      setIsInviteOpen(false);
      void loadData();
    } catch (error: unknown) {
      toast({
        title: "Failed to send invitation",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Invitations travel by messenger, not typed email — hand the app link
  // to the native share sheet where the API exists (iOS/Android).
  const canShareInvite = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const handleShareInvite = async () => {
    try {
      await navigator.share({
        title: 'My Score Tracker',
        text: `${authState.profile?.name ?? 'A friend'} invited you to track pool and ping pong scores together.`,
        url: window.location.origin,
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const currentUser = supabaseAuth.getCurrentUser();
      const currentProfile = supabaseAuth.getCurrentProfile();
      await supabaseFriends.acceptInvitation(
        invitationId,
        currentUser?.id,
        currentProfile?.email ?? currentUser?.email ?? null
      );

      toast({
        title: "Invitation accepted!",
        description: "You are now friends",
      });

      void loadData();
    } catch (error: unknown) {
      toast({
        title: "Failed to accept invitation",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const currentUser = supabaseAuth.getCurrentUser();
      const currentProfile = supabaseAuth.getCurrentProfile();
      await supabaseFriends.declineInvitation(
        invitationId,
        currentUser?.id,
        currentProfile?.email ?? currentUser?.email ?? null
      );

      toast({
        title: "Invitation declined",
        description: "The invitation has been declined",
      });

      void loadData();
    } catch (error: unknown) {
      toast({
        title: "Failed to decline invitation",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    try {
      const currentUser = supabaseAuth.getCurrentUser();
      await supabaseFriends.removeFriend(friendId, currentUser?.id);

      toast({
        title: "Friend removed",
        description: `${friendName} has been removed from your friends`,
      });

      void loadData();
    } catch (error: unknown) {
      toast({
        title: "Failed to remove friend",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const requestCount = receivedInvitations.length;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Friends"
          description="Manage your circle, invitations, and shared competition."
          icon={Users}
        />
        <Card className="border-0 shadow-card">
          <CardContent className="divide-y divide-border p-0">
            {[0, 1, 2].map((skeletonIndex) => (
              <div key={skeletonIndex} className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-44 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Friends"
        description="Manage your circle, invitations, and shared competition."
        icon={Users}
        actions={(
          <Button size="sm" onClick={() => setIsInviteOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        )}
      />

      <Tabs defaultValue="friends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="friends" className="gap-2">
            <Users className="h-4 w-4" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Mail className="h-4 w-4" />
            Requests
            {requestCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                {requestCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-0 space-y-4">
          {friends.length === 0 ? (
            <div className="space-y-4 py-10 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-50" />
              <p>No friends yet. Send some invitations to get started!</p>
              <Button onClick={() => setIsInviteOpen(true)} className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Invite a friend
              </Button>
            </div>
          ) : (
            <Card className="border-0 shadow-card">
              <CardContent className="divide-y divide-border p-0">
                {friends.map((friend) => (
                  <FriendRow
                    key={friend.friend_id}
                    friend={friend}
                    record={recordByFriendId.get(friend.friend_id)}
                    onOpenStats={() =>
                      navigate(`/statistics/score?opponent=${encodeURIComponent(friend.friend_name)}`)
                    }
                    onRemove={() => void handleRemoveFriend(friend.friend_id, friend.friend_name)}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-0 space-y-4">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-primary" />
                Received
              </h3>
              {receivedInvitations.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No pending invitations</p>
              ) : (
                <div className="space-y-3">
                  {receivedInvitations.map((invitation) => (
                    <div key={invitation.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{invitation.sender_name || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground">
                            Sent {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            className="h-11 gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          >
                            <Check className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            className="h-11 w-11 p-0"
                            aria-label="Decline invitation"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {invitation.message && (
                        <p className="mt-2 rounded bg-muted p-2 text-sm italic">"{invitation.message}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-primary" />
                Sent
              </h3>
              {sentInvitations.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No sent invitations</p>
              ) : (
                <div className="divide-y divide-border">
                  {sentInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{invitation.receiver_email}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                        </p>
                        {invitation.message && (
                          <p className="mt-1 truncate text-xs italic text-muted-foreground">"{invitation.message}"</p>
                        )}
                      </div>
                      <Badge
                        variant={
                          invitation.status === 'accepted' ? 'default' :
                          invitation.status === 'declined' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {invitation.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ResponsiveFormModal
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        title="Invite a Friend"
        description="They'll get an email invitation to join your circle."
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-5 sm:px-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Friend's Email *</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter your friend's email address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message to your invitation..."
                rows={3}
              />
            </div>
            <Button
              onClick={handleSendInvitation}
              disabled={isSending || !inviteEmail}
              className="h-11 w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isSending ? "Sending..." : "Send Invitation"}
            </Button>
            {canShareInvite && (
              <Button variant="outline" onClick={() => void handleShareInvite()} className="h-11 w-full gap-2">
                <Share2 className="h-4 w-4" />
                Share invite link instead
              </Button>
            )}
          </div>
        </div>
      </ResponsiveFormModal>
    </div>
  );
}
