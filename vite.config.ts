import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			// The auto-injected companion script (`injectRegister`'s default)
			// only calls `navigator.serviceWorker.register(...)` once on page
			// load — it never periodically checks for a new SW, never tells a
			// waiting one to `skipWaiting()`, and never reloads once a new one
			// takes over. That's why, without this, a new deploy only ever
			// reached an already-running (especially installed/standalone)
			// PWA after fully closing and relaunching it. `false` here turns
			// that dumb script off; `src/registerServiceWorker.ts` (imported
			// from `main.tsx`) does the real thing via `virtual:pwa-register`.
			injectRegister: false,
			// injectManifest (custom src/sw.ts) instead of the default
			// generateSW — needed for the `push`/`notificationclick` handlers
			// that back web push notifications (see src/sw.ts).
			strategies: "injectManifest",
			srcDir: "src",
			filename: "sw.ts",
			includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"],
			manifest: {
				id: "/",
				name: "Regnum Warlords",
				short_name: "Regnum Warlords",
				description:
					"Calculadora de trainer e ferramentas para Champions of Regnum, com interface redesenhada e instalável como app.",
				start_url: "/",
				scope: "/",
				display: "standalone",
				background_color: "#0d1310",
				theme_color: "#0d1310",
				icons: [
					{ src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
					{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
					{ src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
				],
			},
			injectManifest: {
				// Trainer reference data + icons bundled locally are the
				// offline-critical assets; the live cort.ovh runtime cache is
				// wired up by hand in src/sw.ts instead of this option (that's
				// only for the old generateSW-mode config shape).
				globPatterns: ["**/*.{js,css,html,svg,png,webp,json}"],
			},
			devOptions: {
				enabled: true,
				type: "module",
			},
		}),
	],
});
