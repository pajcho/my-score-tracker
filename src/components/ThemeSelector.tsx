import { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const [isMounted, setIsMounted] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isThemeMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!themeMenuRef.current) return;
      if (!themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeMenuOpen]);

  return (
    <div ref={themeMenuRef} className="relative">
      <button
        type="button"
        aria-label="Theme options"
        onClick={() => setIsThemeMenuOpen((previousState) => !previousState)}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-opacity duration-200 hover:text-foreground',
          isThemeMenuOpen && 'opacity-0'
        )}
      >
        {!isMounted || theme === 'system' ? (
          <Monitor className="h-4 w-4" />
        ) : theme === 'dark' ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </button>

      <div
        className={cn(
          'absolute right-0 top-1/2 flex h-8 w-[96px] -translate-y-1/2 items-center rounded-lg border border-border bg-muted/70 p-0.5 transition-[opacity,transform] duration-200 ease-out',
          isThemeMenuOpen
            ? 'pointer-events-auto translate-x-0 opacity-100'
            : 'pointer-events-none -translate-x-2 opacity-0'
        )}
      >
        {(['light', 'dark', 'system'] as const).map((mode) => {
          const isActiveTheme = (theme ?? 'system') === mode;
          const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setTheme(mode);
                setIsThemeMenuOpen(false);
              }}
              aria-label={mode}
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200',
                isActiveTheme
                  ? 'bg-background/80 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {!isMounted && mode === 'system' ? <Monitor className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const MobileThemeSelector = ThemeSelector;
