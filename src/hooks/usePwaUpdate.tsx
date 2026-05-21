import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

export function usePwaUpdate(): void {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("[pwa] SW registration failed", error);
    },
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration ?? null;
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const reg = registrationRef.current;
      if (!reg) return;
      void reg.update().catch(() => {});
    };

    const interval = window.setInterval(check, UPDATE_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  useEffect(() => {
    if (!needRefresh) return;
    const id = toast("New version available", {
      description: "Reload the app to get the latest updates.",
      duration: Infinity,
      action: {
        label: "Reload",
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
      onDismiss: () => setNeedRefresh(false),
    });
    return () => {
      toast.dismiss(id);
    };
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);
}
