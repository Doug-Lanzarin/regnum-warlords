import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { TrainerPage } from "./pages/TrainerPage";
import { BossesPage } from "./pages/BossesPage";
import { WzStatusPage } from "./pages/WzStatusPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { NotificationsAdminPage } from "./pages/NotificationsAdminPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
	return (
		<AppLayout>
			<Routes>
				<Route path="/" element={<WzStatusPage />} />
				{/* Kept as a redirect so old bookmarks/links to /wz still land somewhere. */}
				<Route path="/wz" element={<Navigate to="/" replace />} />
				<Route path="/trainer" element={<TrainerPage />} />
				<Route path="/bosses" element={<BossesPage />} />
				<Route path="/notificacoes" element={<NotificationsPage />} />
				<Route path="/warlords/gerenciamento/notificacoes" element={<NotificationsAdminPage />} />
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
		</AppLayout>
	);
}
