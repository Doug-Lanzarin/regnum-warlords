import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { TrainerPage } from "./pages/TrainerPage";
import { BossesPage } from "./pages/BossesPage";
import { WzStatusPage } from "./pages/WzStatusPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
	return (
		<AppLayout>
			<Routes>
				<Route path="/" element={<TrainerPage />} />
				<Route path="/wz" element={<WzStatusPage />} />
				<Route path="/bosses" element={<BossesPage />} />
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
		</AppLayout>
	);
}
