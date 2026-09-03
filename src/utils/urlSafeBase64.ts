// Compact, URL-safe base64 encode/decode for JSON payloads — the shared
// byte-mangling behind every "shareable build via ?query=" link in the app
// (Trainer, Armor Calculator, ...). Not byte-compatible with CoRT's own
// link format (that one is tied to its legacy lz-string compression) —
// this is a fresh, simpler scheme for Regnum Warlords.

export function encodeJsonToUrlSafeBase64(payload: unknown): string {
	const json = JSON.stringify(payload);
	return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
}

export function decodeUrlSafeBase64ToJson<T>(encoded: string): T | null {
	try {
		const json = decodeURIComponent(
			atob(encoded)
				.split("")
				.map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
				.join(""),
		);
		return JSON.parse(json) as T;
	} catch {
		return null;
	}
}
