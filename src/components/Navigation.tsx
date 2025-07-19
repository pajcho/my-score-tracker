import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, History, User, BarChart3, LogOut, Trophy } from 'lucide-react';
import { auth } from '@/lib/auth';
import { EnhancedButton } from './ui/enhanced-button';
import { cn } from '@/lib/utils';

export function Navigation() {
  const location = useLocation();
  const [authState, setAuthState] = useState(auth.getState());

  useEffect(() => {
    const unsubscribe = auth.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    auth.logout();
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/statistics', icon: BarChart3, label: 'Statistics' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="bg-card border-b border-border shadow-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Trophy className="h-6 w-6" />
            ScoreTracker
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-smooth hover:bg-muted",
                  location.pathname === to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            {authState.user && (
              <span className="hidden sm:block text-sm text-muted-foreground">
                Hello, {authState.user.name}
              </span>
            )}
            <EnhancedButton
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </EnhancedButton>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="flex items-center justify-around">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-smooth",
                  location.pathname === to
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
    </nav>
  );
}