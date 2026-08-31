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

/** Trainer build calculator — a sword. */
export function TrainerTabIcon({ className }: IconProps) {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
			<path d="m14.5 3.5 6 6-8.5 8.5-6-6z" />
			<path d="M12 15 4.5 22.5" />
			<path d="m17 6-2 2" />
		</svg>
	);
}
