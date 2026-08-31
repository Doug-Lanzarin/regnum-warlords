import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Exposes the browser's "install as app" prompt (Chrome/Edge/Android). */
export function usePwaInstall() {
	const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
	const [installed, setInstalled] = useState(false);

	useEffect(() => {
		const onBeforeInstall = (e: Event) => {
			e.preventDefault();
			setDeferredEvent(e as BeforeInstallPromptEvent);
		};
		const onInstalled = () => {
			setInstalled(true);
			setDeferredEvent(null);
		};
		window.addEventListener("beforeinstallprompt", onBeforeInstall);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstall);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);

	const promptInstall = useCallback(async () => {
		if (!deferredEvent) return;
		await deferredEvent.prompt();
		await deferredEvent.userChoice;
		setDeferredEvent(null);
	}, [deferredEvent]);

	return { canInstall: !!deferredEvent && !installed, promptInstall };
}
