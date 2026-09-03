interface IconProps {
	className?: string;
}

/** Territory/war status — a planted banner. */
export function WzTabIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
			<path d="M5 21V4" />
			<path d="M5 4h13l-3 4 3 4H5" />
		</svg>
	);
}

/** World bosses — a skull. */
export function BossesTabIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
			<path d="M12 3c-4.4 0-8 3.4-8 8 0 3 1.6 5.4 4 6.8V20a1 1 0 0 0 1 1h1v-2h1v2h2v-2h1v2h1a1 1 0 0 0 1-1v-2.2c2.4-1.4 4-3.8 4-6.8 0-4.6-3.6-8-8-8Z" />
			<circle cx="9" cy="11" r="1.3" fill="currentColor" stroke="none" />
			<circle cx="15" cy="11" r="1.3" fill="currentColor" stroke="none" />
		</svg>
	);
}

/** Trainer build calculator — a diagonal sword (blade, crossguard, hilt, pommel). */
export function TrainerTabIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
			<path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
			<path d="M13 19l6-6" />
			<path d="M16 16l4 4" />
			<path d="M19 21l2-2" />
		</svg>
	);
}

/** Notifications — a bell. */
export function NotificationsTabIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
			<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
			<path d="M13.73 21a2 2 0 0 1-3.46 0" />
		</svg>
	);
}

/** Tools hub (Trainer, Armor Calculator, ...) — a wrench. */
export function ToolsTabIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
			<path d="M14.7 6.3a4 4 0 0 0-5.6 4.9L3 17.3V21h3.7l6.1-6.1a4 4 0 0 0 4.9-5.6l-2.8 2.8-2.1-2.1z" />
		</svg>
	);
}

/** Armor calculator — a shield. */
export function ArmorToolIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
			<path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6z" />
		</svg>
	);
}
