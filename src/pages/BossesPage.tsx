import { BossCard } from "../features/bosses/BossCard";
import { useBossTimers } from "../features/bosses/useBossTimers";
import { BOSS_ORDER } from "../data/bossConstants";
import styles from "./BossesPage.module.css";

export function BossesPage() {
	const { data, now } = useBossTimers();

	const sorted = [...BOSS_ORDER].sort((a, b) => data.next_spawns[a][0] - data.next_spawns[b][0]);
	const featuredKey = sorted[0];

	return (
		<div className={styles.wrap}>
			<div className={styles.grid}>
				{sorted.map((key) => (
					<BossCard
						key={key}
						bossKey={key}
						prevSpawn={data.prev_spawns[key]}
						nextSpawns={data.next_spawns[key]}
						now={now}
						featured={key === featuredKey}
					/>
				))}
			</div>
		</div>
	);
}
