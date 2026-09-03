import { useEffect, useState } from "react";

interface Props {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	className?: string;
}

/** A numeric `<input>` that doesn't fight the user while they're typing.
 *  A plain `value={n} onChange={e => onChange(Number(e.target.value))}`
 *  input snaps back to "0" (or the last valid value) on every keystroke —
 *  clearing the field to type a fresh number sends `onChange(0)`, which
 *  re-renders the input right back to "0" before the next digit lands, so
 *  the field can never actually be emptied. This keeps its own draft text
 *  while editing and only re-syncs from `value` when it changes for a
 *  reason other than this field's own last edit (class switch, reset,
 *  loading a shared build). */
export function NumberField({ value, onChange, min, className }: Props) {
	const [text, setText] = useState(String(value));

	useEffect(() => {
		if (Number(text) !== value) setText(String(value));
		// Only re-sync when `value` changes for an external reason — re-running
		// this on every `text` edit would fight the draft it's meant to protect.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const next = e.target.value;
		setText(next);
		const parsed = Number(next);
		// A blank box or a bare "-" (mid-typing a negative number) parses to
		// "" or NaN — keep showing the draft but don't push a bogus value up.
		if (next.trim() !== "" && !Number.isNaN(parsed)) {
			onChange(min != null ? Math.max(min, parsed) : parsed);
		}
	}

	return (
		<input
			type="number"
			className={className}
			min={min}
			value={text}
			onChange={handleChange}
			onBlur={() => setText(String(value))}
		/>
	);
}
