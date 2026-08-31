import { REALMS, REALM_COLOR, type Realm } from "../../data/realms";
import styles from "./RealmSummary.module.css";

interface Props {
	fortCounts: Record<Realm, number>;
	totalForts: number;
}

/** Quick "who's winning" read: how many of the 12 forts each realm holds
 *  right now, as a stacked bar plus a number per realm. */
export function RealmSummary({ fortCounts, totalForts }: Props) {
	const leader = REALMS.reduce((a, b) => (fortCounts[b] > fortCounts[a] ? b : a));
	const leaderTied = REALMS.filter((r) => fortCounts[r] === fortCounts[leader]).length > 1;

	return (
		<div className={styles.wrap}>
			<div className={styles.bar}>
				{REALMS.map((realm) => {
					const pct = totalForts > 0 ? (fortCounts[realm] / totalForts) * 100 : 0;
					if (pct === 0) return null;
					return (
						<span
							key={realm}
							className={styles.segment}
							style={{ width: `${pct}%`, background: REALM_COLOR[realm] }}
							title={`${realm}: ${fortCounts[realm]} fortes`}
						/>
					);
				})}
			</div>
			<div className={styles.legend}>
				{REALMS.map((realm) => (
					<span key={realm} className={styles.legendItem}>
						<span className={styles.dot} style={{ background: REALM_COLOR[realm] }} aria-hidden />
						{realm} <strong>{fortCounts[realm]}</strong>
						{!leaderTied && realm === leader && <span className={styles.leaderTag}>líder</span>}
					</span>
				))}
			</div>
		</div>
	);
}
