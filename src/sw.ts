/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

// `registerType: "autoUpdate"` (vite.config.ts) only auto-*checks* for a new
// SW — with the custom `injectManifest` strategy this project uses, it's on
// us to make a detected update actually take over: workbox-window's client
// script posts `{type: "SKIP_WAITING"}` to the waiting worker, which does
// nothing unless the SW itself listens and calls `skipWaiting()`. Without
// this, a new deploy silently never reaches an open tab — the old SW just
// keeps serving its stale precached shell forever. `clientsClaim()` is the
// matching half: once activated, take control of already-open pages
// immediately instead of only affecting the *next* navigation.
self.addEventListener("message", (event) => {
	if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
clientsClaim();

// Keeps the same offline precache behavior the old `generateSW`-mode
// service worker gave the Trainer's bundled reference data — this custom
// SW only exists to also handle `push`/`notificationclick` below, which
// `generateSW` mode has no hook for.
precacheAndRoute(self.__WB_MANIFEST);

// Same opportunistic runtime cache for the live CoRT calls the old
// `workbox.runtimeCaching` config gave — offline-first is only for the
// Trainer's bundled data above, this is just "don't wait forever" for WZ/bosses.
registerRoute(
	({ url }) => url.origin === "https://cort.ovh",
	new NetworkFirst({
		cacheName: "cort-live-data",
		networkTimeoutSeconds: 4,
		plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 })],
	}),
);

interface PushPayload {
	title: string;
	body: string;
	url?: string;
}

self.addEventListener("push", (event) => {
	let payload: PushPayload = { title: "Regnum Warlords", body: "" };
	try {
		if (event.data) payload = event.data.json();
	} catch {
		// Non-JSON payload — fall back to the default above rather than crash.
	}
	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: "/icons/icon-192.png",
			badge: "/icons/icon-192.png",
			data: { url: payload.url ?? "/" },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";
	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if ("focus" in client) return client.focus();
			}
			return self.clients.openWindow(url);
		}),
	);
});
