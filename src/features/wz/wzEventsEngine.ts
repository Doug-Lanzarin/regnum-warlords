import type { Realm } from "../../data/realms";
import type { WzEvent, WzStatusData } from "../../types/wz";

export interface EventSegment {
	text: string;
	/** Colors the segment by realm when set; unset/null renders as plain text. */
	realm?: Realm | null;
}

export interface HumanizedEvent {
	key: string;
	date: number;
	emoji: string;
	segments: EventSegment[];
	/** Dragon wishes render as a single red line in CoRT, realm color and all. */
	isWish?: boolean;
}

function cleanFortName(name: string): string {
	return name.replace(/\s*\(\d+\)$/, "");
}

function isGreatWall(name: string): boolean {
	return name.startsWith("Great Wall");
}

/** Ported from CoRT's `HumaniseEvents.humanise_events()` in wztools.js —
 *  same event shapes (fort/gem capture & recapture, relic altar/transit,
 *  dragon wishes), translated to pt-BR and returned as colorable segments
 *  instead of an HTML string. */
export function humanizeEvent(event: WzEvent, index: number): HumanizedEvent | null {
	const key = `${event.date}-${event.type}-${event.name}-${index}`;
	const owner = (event.owner || null) as Realm | null;

	if (event.type === "fort" || event.type === "gem") {
		const recovered = event.location === event.owner;
		const location = event.location as Realm;

		if (event.type === "fort" && isGreatWall(event.name)) {
			return recovered
				? {
						key,
						date: event.date,
						emoji: "🛡️",
						segments: [{ text: event.owner, realm: owner }, { text: " reconquistou a Grande Muralha" }],
					}
				: {
						key,
						date: event.date,
						emoji: "🦍",
						segments: [
							{ text: event.owner, realm: owner },
							{ text: " invadiu a Grande Muralha de " },
							{ text: event.location, realm: location },
						],
					};
		}

		const target = event.type === "fort" ? cleanFortName(event.name) : `Gema #${event.name}`;
		return {
			key,
			date: event.date,
			emoji: event.type === "gem" ? "💎" : "",
			segments: [
				{ text: event.owner, realm: owner },
				{ text: recovered ? " recuperou " : " capturou " },
				{ text: target, realm: location },
			],
		};
	}

	if (event.type === "relic") {
		const altar = event.location === "altar";
		return {
			key,
			date: event.date,
			emoji: altar ? "🏛️" : "🏃",
			segments: [
				{ text: "A relíquia " },
				{ text: event.name, realm: owner },
				{ text: altar ? " voltou para o altar" : " está em trânsito" },
			],
		};
	}

	if (event.type === "wish") {
		const location = event.location as Realm;
		return {
			key,
			date: event.date,
			emoji: "🐉",
			isWish: true,
			segments: [{ text: event.location, realm: location }, { text: " fez um pedido ao dragão!" }],
		};
	}

	return null;
}

export function computeEventLog(data: WzStatusData, limit = 40): HumanizedEvent[] {
	const events: HumanizedEvent[] = [];
	for (let i = 0; i < data.events_log.length && events.length < limit; i++) {
		const humanized = humanizeEvent(data.events_log[i], i);
		if (humanized) events.push(humanized);
	}
	return events;
}
