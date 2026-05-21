import { useEffect, useState } from "react";
import { Plus, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Two install paths the browser actually offers:
//   • Chromium (Android Chrome, Edge, Samsung Internet, desktop Chrome)
//     fires `beforeinstallprompt`, which lets us trigger the native
//     install dialog via `event.prompt()`.
//   • iOS Safari doesn't fire that event — Apple requires users to
//     install through Share → Add to Home Screen manually. We just
//     show instructions.
//
// Browsers that don't support either (Android Firefox, in-app webviews)
// don't get a banner.

const DISMISS_KEY = "pwa-install-hint-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

// Capture `beforeinstallprompt` as early as possible. The browser fires
// it exactly once when the user becomes eligible, so we stash it on
// `window` and let the component pick it up on mount.
if (typeof window !== "undefined" && window.__pwaInstallPrompt === undefined) {
  window.__pwaInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__pwaInstallPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("pwa:prompt-ready"));
  });
  window.addEventListener("appinstalled", () => {
    window.__pwaInstallPrompt = null;
    window.dispatchEvent(new Event("pwa:prompt-ready"));
  });
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  // Exclude in-app webviews (Instagram, FB) where Add to Home Screen isn't
  // available — they don't expose the standalone Safari Share sheet.
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line\/|Twitter/i.test(ua);
  return isIos && !isInAppBrowser;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS uses the non-standard `navigator.standalone`; everyone else uses
  // the `display-mode: standalone` media query.
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  if (navStandalone) return true;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function PwaInstallHint() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    if (isStandalone()) return true;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window === "undefined") return null;
    return window.__pwaInstallPrompt ?? null;
  });

  useEffect(() => {
    const onReady = () => setInstallEvent(window.__pwaInstallPrompt ?? null);
    window.addEventListener("pwa:prompt-ready", onReady);
    return () => window.removeEventListener("pwa:prompt-ready", onReady);
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  // Chromium path — we have a real prompt we can fire.
  if (installEvent) {
    const handleInstall = async () => {
      try {
        await installEvent.prompt();
        await installEvent.userChoice;
      } finally {
        // The deferred prompt can only be used once; throw it away
        // either way and hide the banner.
        window.__pwaInstallPrompt = null;
        setInstallEvent(null);
        setDismissed(true);
      }
    };

    return (
      <div
        role="dialog"
        aria-label="Install app"
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="pr-8 text-sm font-medium text-foreground">Install the app</p>
        <p className="mt-1 pr-2 text-xs leading-relaxed text-muted-foreground">
          Add My Score Tracker to your home screen for a faster shortcut and full-screen view.
        </p>
        <Button onClick={handleInstall} size="sm" className="mt-3 w-full">
          Install
        </Button>
      </div>
    );
  }

  // iOS Safari fallback — manual instructions.
  if (isIosSafari()) {
    return (
      <div
        role="dialog"
        aria-label="Add to Home Screen"
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="pr-8 text-sm font-medium text-foreground">Install the app</p>
        <p className="mt-1 pr-2 text-xs leading-relaxed text-muted-foreground">
          Add My Score Tracker to your home screen for a faster shortcut and full-screen view. In
          Safari, tap the{" "}
          <Share className="inline h-4 w-4 -translate-y-0.5 text-primary" />{" "}
          <span className="font-medium">Share</span> menu, then choose{" "}
          <Plus className="inline h-4 w-4 -translate-y-0.5 rounded-sm border border-primary p-px text-primary" />{" "}
          <span className="font-medium">Add to Home Screen</span>.
        </p>
      </div>
    );
  }

  return null;
}
