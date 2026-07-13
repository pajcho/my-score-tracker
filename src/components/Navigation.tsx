import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  History,
  Home,
  LogOut,
  Play,
  Settings,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { cn } from '@/lib/utils';
import { getBaseName } from '@/routerBase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemePicker } from '@/components/ui/themePicker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu';
import { useToast } from '@/hooks/useToast';
import { useIsKeyboardOpen } from '@/hooks/useIsKeyboardOpen';
import { useAuth } from '@/components/auth/authContext';
import { useLiveGamesQuery } from '@/hooks/useTrackerData';
import { useGravatarUrl } from '@/hooks/useGravatar';

export function Navigation() {
  const location = useLocation();
  const authState = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // iOS Safari auto-elevates `position: fixed` elements above the
  // on-screen keyboard, so the bottom tab bar ends up sandwiched
  // between the form and the keyboard. Unmounting beats display:none
  // beats any iOS auto-elevation heuristic.
  const isKeyboardOpen = useIsKeyboardOpen();

  const currentUserId = authState.isAuthenticated ? authState.user?.id : undefined;
  const liveGamesQuery = useLiveGamesQuery(currentUserId);
  const hasActiveLiveGames = (liveGamesQuery.data ?? []).some(
    (liveGame) =>
      liveGame.created_by_user_id === currentUserId || liveGame.opponent_user_id === currentUserId
  );

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/live', icon: Play, label: 'Live', showLiveDot: hasActiveLiveGames },
    { to: '/history/score', icon: History, label: 'History' },
    { to: '/statistics/score', icon: BarChart3, label: 'Stats' },
  ];

  const isNavItemActive = (path: string): boolean => {
    if (path.startsWith('/history')) {
      return location.pathname.startsWith('/history');
    }

    if (path.startsWith('/statistics')) {
      return location.pathname.startsWith('/statistics');
    }

    if (path === '/live') {
      return location.pathname.startsWith('/live');
    }

    if (path === '/profile') {
      // Settings and Friends live under the Profile hub on mobile.
      return ['/profile', '/settings', '/friends'].some((profilePath) =>
        location.pathname.startsWith(profilePath)
      );
    }

    return location.pathname === path;
  };

  const gravatarUrl = useGravatarUrl(authState.profile?.email);

  const handleLogout = async () => {
    try {
      await supabaseAuth.signOut();
      navigate('/login');
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Top header is desktop-only: in the standalone PWA the wordmark
          costs 64px of every screen just to restate the app's name. On
          mobile the bottom tab bar (incl. Profile) covers navigation. */}
      <nav className="hidden bg-card border-b border-border shadow-card md:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
          <a href={getBaseName()} className="flex items-center gap-2 font-bold text-xl text-primary">
            <Trophy className="h-6 w-6" />
            <span>ScoreTracker</span>
          </a>

          <div className="flex items-center gap-1 flex-1 justify-center">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                viewTransition
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-smooth hover:bg-muted",
                  isNavItemActive(to)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {authState.profile && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 transition-smooth">
                  <span className="hidden sm:block text-sm font-medium text-foreground">
                    {authState.profile.name}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={gravatarUrl}
                      alt={authState.profile.name}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Theme
                  </DropdownMenuLabel>
                  {/* The theme pill is rendered as plain buttons (not
                      DropdownMenuItems) so picking a mode applies the
                      change immediately without dismissing the menu —
                      matches the iOS share-sheet pattern of keeping
                      toggles available inside an open popover. */}
                  <div className="px-2 py-1.5">
                    <ThemePicker />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/friends" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      Friends
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        </div>
      </nav>

      {isKeyboardOpen ? null : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur md:hidden">
          <div className="container mx-auto px-2 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] pt-1.5">
            <div className="flex items-center justify-around">
              {navItems.map(({ to, icon: Icon, label, showLiveDot }) => (
                <Link
                  key={to}
                  to={to}
                  viewTransition
                  className={cn(
                    "relative flex min-w-14 flex-col items-center gap-1 rounded-md p-2 text-xs transition-smooth active:scale-95",
                    isNavItemActive(to)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {showLiveDot ? (
                    <span
                      data-testid="live-nav-dot"
                      className="absolute right-3 top-1 h-2 w-2 rounded-full border-2 border-card bg-secondary"
                    />
                  ) : null}
                  {label}
                </Link>
              ))}
              <Link
                to="/profile"
                viewTransition
                className={cn(
                  "relative flex min-w-14 flex-col items-center gap-1 rounded-md p-2 text-xs transition-smooth active:scale-95",
                  isNavItemActive('/profile')
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Avatar className={cn("h-5 w-5", isNavItemActive('/profile') ? "ring-2 ring-primary" : "")}>
                  <AvatarImage src={gravatarUrl} alt={authState.profile?.name ?? 'Profile'} />
                  <AvatarFallback className="bg-transparent">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                Profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
