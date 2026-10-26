/* eslint-disable react-refresh/only-export-components */
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // Open Radix/Vaul modals set `pointer-events: none` on <body>; opt the
      // toaster back in so toast actions (e.g. "Reload") stay tappable.
      className="toaster group pointer-events-auto"
      position="bottom-center"
      // Clear the bottom tab bar + safe area so snackbars sit above the nav.
      offset={88}
      style={{ "--mobile-offset": "calc(env(safe-area-inset-bottom) + 84px)" } as React.CSSProperties}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
