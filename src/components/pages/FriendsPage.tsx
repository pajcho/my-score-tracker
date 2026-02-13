import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users, Mail, Check, X, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabaseFriends, Friend, FriendInvitation } from '@/lib/supabase-friends';
import { supabaseAuth } from '@/lib/supabase-auth';
import { format } from 'date-fns';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Please try again';
}

export function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentInvitations, setSentInvitations] = useState<FriendInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<FriendInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!supabaseAuth.isAuthenticated()) return;

    try {
      setIsLoading(true);
      const [friendsData, sentData, receivedData] = await Promise.all([
        supabaseFriends.getFriends(),
        supabaseFriends.getSentInvitations(),
        supabaseFriends.getReceivedInvitations()
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
      await supabaseFriends.sendFriendInvitation(inviteEmail, inviteMessage);
      
      toast({
        title: "Invitation sent!",
        description: `Friend invitation sent to ${inviteEmail}`,
      });

      setInviteEmail('');
      setInviteMessage('');
      loadData(); // Refresh data
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

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await supabaseFriends.acceptInvitation(invitationId);
      
      toast({
        title: "Invitation accepted!",
        description: "You are now friends",
      });

      loadData(); // Refresh data
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
      await supabaseFriends.declineInvitation(invitationId);
      
      toast({
        title: "Invitation declined",
        description: "The invitation has been declined",
      });

      loadData(); // Refresh data
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
      await supabaseFriends.removeFriend(friendId);
      
      toast({
        title: "Friend removed",
        description: `${friendName} has been removed from your friends`,
      });

      loadData(); // Refresh data
    } catch (error: unknown) {
      toast({
        title: "Failed to remove friend",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading friends...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Friends</h1>
      </div>

      <Tabs defaultValue="friends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 h-auto">
          <TabsTrigger value="friends" className="flex items-center gap-2 justify-start sm:justify-center">
            <Users className="h-4 w-4" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="invite" className="flex items-center gap-2 justify-start sm:justify-center">
            <UserPlus className="h-4 w-4" />
            Invite Friend
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2 justify-start sm:justify-center">
            <Mail className="h-4 w-4" />
            Received ({receivedInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2 justify-start sm:justify-center">
            <Clock className="h-4 w-4" />
            Sent ({sentInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Friends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No friends yet. Send some invitations to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map((friend) => (
                    <Card key={friend.friend_id} className="shadow-card border-0 group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{friend.friend_name}</h3>
                            <p className="text-sm text-muted-foreground">{friend.friend_email}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Friends since {format(new Date(friend.friendship_created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
                                  onClick={() => handleRemoveFriend(friend.friend_id, friend.friend_name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite a Friend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Friend's Email *</Label>
                <Input
                  id="email"
                  type="email"
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
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send Invitation"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Received Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receivedInvitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedInvitations.map((invitation) => (
                    <Card key={invitation.id} className="shadow-card border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{invitation.sender_name || 'Unknown User'}</h3>
                              <Badge variant="secondary">Pending</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Sent {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                            </p>
                            {invitation.message && (
                              <p className="text-sm italic bg-muted p-2 rounded">
                                "{invitation.message}"
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptInvitation(invitation.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineInvitation(invitation.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Sent Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentInvitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sent invitations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentInvitations.map((invitation) => (
                    <Card key={invitation.id} className="shadow-card border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{invitation.receiver_email}</h3>
                            <p className="text-sm text-muted-foreground">
                              Sent {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                            </p>
                            {invitation.message && (
                              <p className="text-sm italic text-muted-foreground mt-1">
                                "{invitation.message}"
                              </p>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
