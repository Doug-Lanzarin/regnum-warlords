import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
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
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,webp,json}"],
				// Trainer reference data + icons bundled locally are the offline-critical
				// assets; runtime-cache the live CoRT calls opportunistically.
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/cort\.ovh\//,
						handler: "NetworkFirst",
						options: {
							cacheName: "cort-live-data",
							networkTimeoutSeconds: 4,
							expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
						},
					},
				],
			},
			devOptions: {
				enabled: true,
			},
		}),
	],
});
