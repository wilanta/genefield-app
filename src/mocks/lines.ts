import type { RiceLine } from "@/types/research";

export const mockLines: RiceLine[] = [
  {
    id: "DEMO-001",
    name: "Demo Rice Line A",
    hasGenotype: true,
    hasPhenotype: true,
    hasPedigree: true,
  },
  {
    id: "DEMO-002",
    name: "Demo Rice Line B",
    hasGenotype: true,
    hasPhenotype: false,
    hasPedigree: true,
  },
  {
    id: "DEMO-003",
    name: "Demo Rice Line C",
    hasGenotype: false,
    hasPhenotype: true,
    hasPedigree: false,
  },
];
