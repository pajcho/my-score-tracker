import { useState } from "react";
import { Plus, Share, X } from "lucide-react";

// iOS doesn't fire `beforeinstallprompt`, so there's no API for triggering
// the install flow — Apple requires users to do it manually through the
// Share sheet. This banner just educates them on how.

const DISMISS_KEY = "pwa-install-hint-dismissed";

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
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function IosInstallHint() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!isIosSafari()) return false;
    if (isStandalone()) return false;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return false;
    return true;
  });

  if (!visible) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

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
