import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import type { InterfaceDensity } from "@/types/settings";

const STORAGE_KEY = "genefield-interface-density";
const DEFAULT_DENSITY: InterfaceDensity = "comfortable";

const DensityContext = createContext<{
  density: InterfaceDensity;
  setDensity: (density: InterfaceDensity) => void;
} | null>(null);

function readDensity(): InterfaceDensity {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "compact" || stored === "comfortable"
      ? stored
      : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

export function InterfaceDensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensity] = useState<InterfaceDensity>(readDensity);

  useLayoutEffect(() => {
    document.documentElement.dataset.interfaceDensity = density;
    try {
      localStorage.setItem(STORAGE_KEY, density);
    } catch {
      // Keep the control usable for this session if storage is unavailable.
    }
  }, [density]);

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useInterfaceDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error("useInterfaceDensity requires InterfaceDensityProvider");
  }
  return context;
}
