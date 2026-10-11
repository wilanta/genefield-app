import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import { InterfaceDensityProvider } from "@/components/interface-density-provider";

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
