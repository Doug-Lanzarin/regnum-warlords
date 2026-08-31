import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { TrainerPage } from "./pages/TrainerPage";
import { BossesPage } from "./pages/BossesPage";
import { WzStatusPage } from "./pages/WzStatusPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
	return (
		<AppLayout>
			<Routes>
				<Route path="/" element={<TrainerPage />} />
				<Route path="/wz" element={<WzStatusPage />} />
				<Route path="/bosses" element={<BossesPage />} />
				<Route path="/configuracoes" element={<SettingsPage />} />
				<Route
					path="/bz"
					element={<ComingSoonPage title="Zona de Batalha" description="Status e contagem regressiva das Battlezones." />}
				/>
				<Route
					path="/eventos"
					element={<ComingSoonPage title="Eventos da WZ" description="Histórico de eventos e mudanças de forte/relíquia na Zona de Guerra." />}
				/>
				<Route
					path="/estatisticas-wz"
					element={<ComingSoonPage title="Estatísticas da WZ" description="Estatísticas históricas de guerra por reino." />}
				/>
				<Route
					path="/estatisticas-trainer"
					element={<ComingSoonPage title="Estatísticas do Trainer" description="Estatísticas agregadas de builds enviadas pela comunidade." />}
				/>
				<Route path="/missoes" element={<ComingSoonPage title="Missões" description="Horários de reset de missões diárias e semanais." />} />
				<Route path="*" element={<ComingSoonPage title="Página não encontrada" description="Volte para o Trainer pelo menu acima." />} />
			</Routes>
		</AppLayout>
	);
}
