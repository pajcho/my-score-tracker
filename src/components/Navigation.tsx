import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BarChart3, History, Home, LogOut, Trophy, User, Users } from 'lucide-react';
import { supabaseAuth } from '@/lib/supabase-auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { ThemeModeToggle } from '@/components/ThemeModeToggle';

export function Navigation() {
  const location = useLocation();
  const [authState, setAuthState] = useState(() => supabaseAuth.getState());
  const { toast } = useToast();

  useEffect(() => {
    return supabaseAuth.subscribe((newState) => {
      setAuthState(newState);
    });
  }, []);

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/history/scores', icon: History, label: 'History' },
    { to: '/statistics/matches', icon: BarChart3, label: 'Statistics' },
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
    return `https://www.gravatar.com/avatar/${hash}?d=404&s=32`;
  };

  const [gravatarUrl, setGravatarUrl] = useState<string>('');

  useEffect(() => {
    if (authState.profile?.email) {
      getGravatarUrl(authState.profile.email).then(setGravatarUrl);
    }
  }, [authState.profile?.email]);

  const handleLogout = async () => {
    try {
      await supabaseAuth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="bg-card border-b border-border shadow-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Trophy className="h-6 w-6" />
            <span className="hidden sm:inline">ScoreTracker</span>
          </Link>

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
            <ThemeModeToggle />

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
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Profile
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

        <div className="md:hidden pb-4">
          <div className="flex items-center justify-around">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-smooth",
                  isNavItemActive(to)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
            <Link
              to="/friends"
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-smooth",
                location.pathname === "/friends"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-5 w-5" />
              Friends
            </Link>
            <Link
              to="/profile"
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-smooth",
                location.pathname === "/profile"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-5 w-5" />
              Profile
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
