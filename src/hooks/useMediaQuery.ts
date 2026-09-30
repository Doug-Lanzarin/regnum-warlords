import { useEffect, useState } from "react";

/** Reactive `window.matchMedia` check — re-renders when the match flips (a
 *  resize or orientation change crossing the breakpoint), unlike a one-shot
 *  `window.innerWidth` read taken once at mount. */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

	useEffect(() => {
		const mql = window.matchMedia(query);
		const handleChange = () => setMatches(mql.matches);
		handleChange();
		mql.addEventListener("change", handleChange);
		return () => mql.removeEventListener("change", handleChange);
	}, [query]);

	return matches;
}
