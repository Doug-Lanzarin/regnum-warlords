import { useState } from "react";

/** CoRT's per-discipline icon file isn't a single square icon — it's an
 *  11-frame horizontal sprite strip (528x48, 48px/frame): frame 0 is the
 *  discipline's own tree icon, frames 1-10 are that discipline's spells, in
 *  the same order as `discipline.spells` (ported from trainer.js's
 *  `spellpos` + the `.p{n} .icon { background-position: -Npx 0 }` rules). */
const SPRITE_FRAMES = 11;

interface Props {
	/** Discipline icon URL — the sprite sheet this frame is cut from. */
	spriteUrl: string;
	/** 0 = discipline icon, 1..10 = the spell at that index in `discipline.spells` (index + 1). */
	frame: number;
	/** Rendered size in px (square). */
	size: number;
	className?: string;
	dim?: boolean;
}

export function SkillIcon({ spriteUrl, frame, size, className, dim }: Props) {
	const [failed, setFailed] = useState(false);
	if (failed) return <span className={className} style={{ width: size, height: size, display: "inline-block", flexShrink: 0 }} aria-hidden />;

	return (
		<span
			className={className}
			style={{
				width: size,
				height: size,
				overflow: "hidden",
				display: "inline-block",
				flexShrink: 0,
				filter: dim ? "grayscale(0.6) brightness(0.55)" : undefined,
			}}
			aria-hidden
		>
			<img
				src={spriteUrl}
				alt=""
				loading="lazy"
				onError={() => setFailed(true)}
				style={{
					width: SPRITE_FRAMES * size,
					height: size,
					maxWidth: "none",
					marginLeft: -frame * size,
					display: "block",
				}}
			/>
		</span>
	);
}
