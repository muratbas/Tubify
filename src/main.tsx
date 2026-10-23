import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { DownloadProvider } from "./context/DownloadContext";
import { PlayerProvider } from "./context/PlayerContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <DownloadProvider>
          <PlayerProvider>
            <App />
          </PlayerProvider>
        </DownloadProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
