/// <reference lib="webworker" />
import type { PrecacheEntry } from "workbox-precaching";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import type { RouteMatchCallbackOptions } from "workbox-core";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  }),
);

registerRoute(
  ({ url, request }: RouteMatchCallbackOptions) =>
    url.origin !== self.location.origin &&
    (request.destination === "font" || request.destination === "image"),
  new StaleWhileRevalidate({ cacheName: "cross-origin-assets" }),
);

// --- Push notifications ----------------------------------------------------
//
// Expected payload shape (sent by the notify-on-live-game-start Edge Function):
//
//   { "title": "Live game invite",
//     "body":  "Nikola has just started a live game with you.",
//     "url":   "/live" ,
//     "tag":   "live-game-invite-<liveGameId>" }
//
// `tag` collapses repeats so the same invite doesn't pile up if the SW
// receives the same message twice. `url` is the deep-link the app opens
// when the user taps the notification.

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

const ICON_URL = new URL("pwa-192x192.png", self.registration.scope).href;
const BADGE_URL = new URL("pwa-64x64.png", self.registration.scope).href;

self.addEventListener("push", (event) => {
  let payload: PushPayload;
  try {
    payload = event.data ? (event.data.json() as PushPayload) : { title: "Score Tracker" };
  } catch {
    // Fallback when the push has no JSON body — still surface *something*
    // so the user knows a notification arrived.
    payload = { title: "Score Tracker", body: event.data?.text() ?? "" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body ?? "",
      icon: ICON_URL,
      badge: BADGE_URL,
      tag: payload.tag,
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  // Strip leading slashes so paths resolve *relative to the SW scope*
  // (e.g. `/my-score-tracker/`) rather than the origin root. Without
  // this, `"url": "/"` from a payload navigates to the GH-Pages root
  // and 404s.
  const targetPath = (data?.url ?? "").replace(/^\/+/, "");
  const targetUrl = new URL(targetPath, self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Prefer focusing an already-open window over opening a new one,
      // and navigate it to the deep link if it isn't already there.
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope)) {
          await client.focus();
          if (client.url !== targetUrl && "navigate" in client) {
            await client.navigate(targetUrl).catch(() => {});
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
