import { defineConfig } from "vitest/config";

// Separate from vite.config.ts on purpose — the app config carries the
// VitePWA plugin (service worker build), which has no business running
// during a test pass. Everything under test here is plain TS logic (diff/
// boss/message-building, i18n, settings migration), so the default Node
// environment is enough — no jsdom needed.
export default defineConfig({
	test: {
		include: ["src/**/*.test.ts", "api/**/*.test.ts"],
	},
});
