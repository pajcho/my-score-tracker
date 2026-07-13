import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, Palette, Settings as SettingsIcon, User, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemePicker } from '@/components/ui/themePicker';
import { useToast } from '@/hooks/useToast';
import { useGravatarUrl } from '@/hooks/useGravatar';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { useAuth } from '@/components/auth/authContext';
import { useFriendsQuery } from '@/hooks/useTrackerData';

interface ProfileLinkRowProps {
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  detail?: string;
}

function ProfileLinkRow({ to, icon: Icon, label, detail }: ProfileLinkRowProps) {
  return (
    <Link
      to={to}
      className="flex min-h-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      {detail ? <span className="text-sm text-muted-foreground">{detail}</span> : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function ProfilePage() {
  const authState = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const gravatarUrl = useGravatarUrl(authState.profile?.email);
  const currentUserId = authState.isAuthenticated ? authState.user?.id : undefined;
  const friendsQuery = useFriendsQuery(currentUserId);
  const friendCount = friendsQuery.data?.length;

  const handleLogout = async () => {
    try {
      await supabaseAuth.signOut();
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Logout failed',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 pt-2">
        <Avatar className="h-16 w-16">
          <AvatarImage src={gravatarUrl} alt={authState.profile?.name ?? 'Profile'} />
          <AvatarFallback>
            <User className="h-7 w-7" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold leading-tight">{authState.profile?.name}</h1>
          <p className="truncate text-sm text-muted-foreground">{authState.profile?.email}</p>
        </div>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Palette className="h-4 w-4 text-primary" />
            Appearance
          </div>
          <ThemePicker showLabels />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="divide-y divide-border p-0">
          <ProfileLinkRow to="/friends" icon={Users} label="Friends" detail={friendCount !== undefined ? String(friendCount) : undefined} />
          <ProfileLinkRow to="/settings" icon={SettingsIcon} label="Account settings" />
          <ProfileLinkRow to="/settings?tab=notifications" icon={Bell} label="Notifications" />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        My Score Tracker v{__APP_VERSION__}
      </p>
    </div>
  );
}
