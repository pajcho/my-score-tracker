import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  History,
  Home,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { cn } from '@/lib/utils';
import { getBaseName } from '@/routerBase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

type ThemeMode = 'light' | 'dark' | 'system';

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

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/history/score', icon: History, label: 'History' },
    { to: '/statistics/score', icon: BarChart3, label: 'Statistics' },
  ];

  const isNavItemActive = (path: string): boolean => {
    if (path.startsWith('/history')) {
      return location.pathname.startsWith('/history');
    }

    if (path.startsWith('/statistics')) {
      return location.pathname.startsWith('/statistics');
    }

    return location.pathname === path;
  };

  const getGravatarUrl = async (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailBytes = new TextEncoder().encode(normalizedEmail);
    const hashBuffer = await crypto.subtle.digest('SHA-256', emailBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `https://www.gravatar.com/avatar/${hash}?d=404&s=64`;
  };

  const [gravatarUrl, setGravatarUrl] = useState<string>('');

  useEffect(() => {
    if (authState.profile?.email) {
      void getGravatarUrl(authState.profile.email).then(setGravatarUrl);
    }
  }, [authState.profile?.email]);

  const handleLogout = async () => {
    try {
      await supabaseAuth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
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
      <nav className="bg-card border-b border-border shadow-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
          <a href={getBaseName()} className="flex items-center gap-2 font-bold text-xl text-primary">
            <Trophy className="h-6 w-6" />
            <span>ScoreTracker</span>
          </a>

          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
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
          <div className="container mx-auto px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
            <div className="flex items-center justify-around">
              {navItems.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex min-w-20 flex-col items-center gap-1 rounded-md p-2 text-xs transition-smooth",
                    isNavItemActive(to)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const current = (theme ?? 'system') as ThemeMode;

  return (
    <div className="flex w-full items-center gap-1 rounded-lg bg-muted p-1">
      <ThemeButton
        active={current === 'light'}
        onClick={() => setTheme('light')}
        ariaLabel="Light theme"
        icon={Sun}
      />
      <ThemeButton
        active={current === 'dark'}
        onClick={() => setTheme('dark')}
        ariaLabel="Dark theme"
        icon={Moon}
      />
      <ThemeButton
        active={current === 'system'}
        onClick={() => setTheme('system')}
        ariaLabel="System theme"
        icon={Monitor}
      />
    </div>
  );
}

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

function ThemeButton({ active, onClick, ariaLabel, icon: Icon }: ThemeButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center rounded-md p-1.5 transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
