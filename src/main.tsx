import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import { InterfaceDensityProvider } from "@/components/interface-density-provider";
import { isTauriRuntime } from "@/lib/tauri-runtime";
import { inference } from "@/services/inference-service";
import { getCurrentWindow } from "@tauri-apps/api/window";

if (isTauriRuntime()) {
  let closing = false;
  void getCurrentWindow().onCloseRequested(async (event) => {
    event.preventDefault();
    if (closing) return;
    closing = true;
    try {
      await inference.stop();
    } finally {
      await getCurrentWindow().destroy();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="genefield-theme"
      enableSystem
      disableTransitionOnChange
    >
      <InterfaceDensityProvider>
        <App />
      </InterfaceDensityProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
