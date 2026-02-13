import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const themeModeOptions: Array<{
  mode: ThemeMode;
  label: string;
  Icon: typeof Sun;
}> = [
  { mode: "light", label: "Light mode", Icon: Sun },
  { mode: "dark", label: "Dark mode", Icon: Moon },
  { mode: "system", label: "Auto mode", Icon: Monitor },
];

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-10 w-[126px] rounded-xl border border-border bg-muted/70" />;
  }

  const selectedTheme = (theme ?? "system") as ThemeMode;

  return (
    <div className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-muted/70 p-1">
      {themeModeOptions.map(({ mode, label, Icon }) => {
        const isActive = selectedTheme === mode;

        return (
          <button
            key={mode}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => setTheme(mode)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
