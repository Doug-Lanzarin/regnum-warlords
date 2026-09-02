import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AlertSettingsProvider } from "./features/alerts/AlertSettingsContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ThemeProvider } from "./theme/ThemeContext";
import "./styles/global.css";
import "./registerServiceWorker";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<LanguageProvider>
			<ThemeProvider>
				<AlertSettingsProvider>
					<BrowserRouter>
						<App />
					</BrowserRouter>
				</AlertSettingsProvider>
			</ThemeProvider>
		</LanguageProvider>
	</StrictMode>,
);
