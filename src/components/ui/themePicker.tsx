import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  showLabel?: boolean;
  label?: string;
}

function ThemeButton({ active, onClick, ariaLabel, icon: Icon, showLabel, label }: ThemeButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md p-1.5 transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {showLabel && label ? <span className="text-xs font-medium">{label}</span> : null}
    </button>
  );
}

export function ThemePicker({ showLabels = false }: { showLabels?: boolean }) {
  const { theme, setTheme } = useTheme();
  const current = (theme ?? 'system') as ThemeMode;

  return (
    <div className="flex w-full items-center gap-1 rounded-lg bg-muted p-1">
      <ThemeButton
        active={current === 'light'}
        onClick={() => setTheme('light')}
        ariaLabel="Light theme"
        icon={Sun}
        showLabel={showLabels}
        label="Light"
      />
      <ThemeButton
        active={current === 'dark'}
        onClick={() => setTheme('dark')}
        ariaLabel="Dark theme"
        icon={Moon}
        showLabel={showLabels}
        label="Dark"
      />
      <ThemeButton
        active={current === 'system'}
        onClick={() => setTheme('system')}
        ariaLabel="System theme"
        icon={Monitor}
        showLabel={showLabels}
        label="Auto"
      />
    </div>
  );
}
