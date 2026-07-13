import { useEffect } from 'react';

/**
 * Keep the screen awake while `enabled` — the phone lies on the table rail
 * between shots and must not dim mid-game. Wake locks are auto-released by
 * the browser when the tab is hidden, so we re-acquire on visibility.
 *
 * Silently no-ops where the Screen Wake Lock API is unavailable.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return undefined;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release().catch(() => undefined);
          sentinel = null;
        }
      } catch {
        // Denied (low battery mode, permissions policy) — nothing to do.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [enabled]);
}
