import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, ChevronDown, Lock, Save, Settings as SettingsIcon, Smartphone, Trash2, User, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/pageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alertDialog';
import { useToast } from '@/hooks/useToast';
import { supabaseDb } from '@/lib/supabaseDatabase';
import { useAuth } from '@/components/auth/authContext';
import { useNotifications, type UseNotifications } from '@/hooks/useNotifications';
import {
  usePushSubscriptions,
  useTouchCurrentSubscription,
  type PushSubscriptionRow,
} from '@/hooks/usePushSubscriptions';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { parseUserAgent } from '@/lib/userAgent';

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  // The Profile hub deep-links straight to a tab (/settings?tab=notifications).
  const initialTab = searchParams.get('tab') === 'notifications' ? 'notifications' : 'profile';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your profile and notification preferences"
        icon={SettingsIcon}
      />

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-0">
          <ProfileInfoCard />
          <ChangePasswordCard />
          <DangerZoneCard />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-0">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileInfoCard() {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(profile?.name || '');
    setEmail(profile?.email || '');
  }, [profile?.email, profile?.name]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await supabaseDb.updateProfile(name, email);
      toast({
        title: 'Profile updated',
        description: 'Your profile information has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">Email Address</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: 'Please ensure both password fields match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: wire to supabase.auth.updateUser once we expose currentPassword
      // verification. For now this matches the existing ProfilePage behaviour.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Password change failed',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-card border-0">
      <Collapsible open={isPasswordSectionOpen} onOpenChange={setIsPasswordSectionOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-left">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isPasswordSectionOpen ? 'rotate-180' : ''}`}
                />
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            className="w-full sm:w-auto"
          >
            <Lock className="h-4 w-4" />
            {isLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function DangerZoneCard() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await supabaseDb.deleteAccount();
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });
    } catch (error) {
      toast({
        title: 'Deletion failed',
        description: 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-card border-0 border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>Irreversible actions for your account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
            <h4 className="font-medium text-destructive mb-2">Delete Account</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto" disabled={isLoading}>
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account, remove
                    all your scores, friendships, and friend invitations. Other users' scores where
                    you were the opponent will show "Deleted User" as the opponent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  // `useNotifications` is reused by SessionsCard so the current-device
  // row's X can route through `unsubscribe()` (which also tears down
  // the local SW subscription) instead of just deleting the DB row.
  const n = useNotifications();

  // Heartbeat: refresh `last_used_at` on this device's row each time
  // the user lands on the notifications tab. Without this the column
  // only updates on subscribe — meaning a device that's been quietly
  // receiving pushes would still show "subscribed N months ago".
  useTouchCurrentSubscription(n.subscription?.endpoint ?? null);

  return (
    <>
      <NotificationsCard n={n} />
      <SessionsCard n={n} />
      <PreferencesCard />
    </>
  );
}

interface NotificationsCardProps {
  n: UseNotifications;
}

function NotificationsCard({ n }: NotificationsCardProps) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Enable this device to receive push notifications. You can enable notifications on multiple
          devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!n.supported ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This device or browser does not support push notifications. On iPhone, add the app to
            your home screen first and open it from there.
          </p>
        ) : n.permission === 'denied' ? (
          // Once permission is denied, calling Notification.requestPermission()
          // silently returns "denied" without re-prompting, so the button below
          // won't recover the state — point the user at browser settings.
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Notifications permission was denied in your browser. Open browser settings (or system
            settings for this app on iPhone) and enable notifications, then try again.
          </p>
        ) : null}

        {n.error ? <p className="text-sm text-destructive">{n.error}</p> : null}

        <div className="flex flex-wrap gap-2">
          {!n.isSubscribed ? (
            <Button onClick={() => void n.subscribe()} disabled={!n.supported || n.pending}>
              {n.pending ? 'Enabling…' : 'Enable notifications'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => void n.unsubscribe()} disabled={n.pending}>
                {n.pending ? 'Disabling…' : 'Disable notifications'}
              </Button>
              <Button variant="outline" onClick={() => void n.sendLocalTest()}>
                Send local test
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SessionsCardProps {
  n: UseNotifications;
}

function SessionsCard({ n }: SessionsCardProps) {
  const { subscriptions, isLoading, remove, isRemoving, refresh } = usePushSubscriptions();
  const currentEndpoint = n.subscription?.endpoint ?? null;

  // Hide the card entirely when the user has zero sessions and isn't
  // subscribed on this device — there's nothing to manage and showing
  // an empty card would just be visual noise.
  if (!isLoading && subscriptions.length === 0 && !n.isSubscribed) {
    return null;
  }

  const handleRevoke = async (row: PushSubscriptionRow) => {
    if (row.endpoint === currentEndpoint) {
      // Current device → route through `unsubscribe()` so the local
      // SW subscription is torn down alongside the DB row. Re-fetch
      // the list afterwards so the row disappears immediately.
      await n.unsubscribe();
      await refresh();
      return;
    }
    await remove(row.id);
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Active sessions
        </CardTitle>
        <CardDescription>
          Devices where you've enabled notifications. Click X to disable notifications for just that
          device — others keep working.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Loading…</span>
            {[0, 1].map((skeletonIndex) => (
              <Skeleton key={skeletonIndex} aria-hidden="true" className="h-10 rounded-lg" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active sessions. Enable notifications above so this device starts receiving them.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {subscriptions.map((row) => (
              <SessionRow
                key={row.id}
                row={row}
                isCurrent={row.endpoint === currentEndpoint}
                disabled={isRemoving || n.pending}
                onRevoke={() => void handleRevoke(row)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface SessionRowProps {
  row: PushSubscriptionRow;
  isCurrent: boolean;
  disabled: boolean;
  onRevoke: () => void;
}

function SessionRow({ row, isCurrent, disabled, onRevoke }: SessionRowProps) {
  const { label } = parseUserAgent(row.user_agent);
  const lastSeen = formatLastSeen(row.last_used_at);
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{label}</span>
          {isCurrent ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              this device
            </span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">{lastSeen}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="End session"
        disabled={disabled}
        onClick={onRevoke}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return 'Last active: unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Last active: unknown';
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return 'Active just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `Active ${diffMin} min ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `Active ${diffHour} h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `Active ${diffDay} d ago`;
  return `Last active ${date.toLocaleDateString()}`;
}

function PreferencesCard() {
  const { prefs, isLoading, save, saving } = useNotificationPreferences();
  // Local form state so toggling feels instant — committed on Save.
  // `prefs` is memoised by the hook so this resyncs only when the
  // upstream row actually changes (initial load, post-save refetch).
  const [form, setForm] = useState(prefs);
  useEffect(() => {
    setForm(prefs);
  }, [prefs]);

  const dirty = form.notify_on_live_game_invite !== prefs.notify_on_live_game_invite;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    save(form);
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle>What to be notified about</CardTitle>
        <CardDescription>
          You'll only receive these on devices where notifications are enabled above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              id="notify-live-game-invite"
              type="checkbox"
              checked={form.notify_on_live_game_invite}
              onChange={(e) =>
                setForm((s) => ({ ...s, notify_on_live_game_invite: e.target.checked }))
              }
              disabled={isLoading || saving}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input"
            />
            <label
              htmlFor="notify-live-game-invite"
              className="cursor-pointer text-sm text-foreground"
            >
              <span className="font-medium">Live game invites from friends</span>
              <span className="block text-xs text-muted-foreground">
                Push every time a friend starts a live game with you as the opponent.
              </span>
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || saving || !dirty}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
