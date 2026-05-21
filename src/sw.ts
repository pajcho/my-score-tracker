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
