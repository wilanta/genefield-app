import type { DataService } from "./data-service";
import { referenceService } from "./reference-service";
import { inference } from "./inference-service";
import type { CandidateStore } from "@/types/research";
import { MemoryCandidateStore } from "./adapters/memory-candidate-store";
import { TauriSqliteCandidateStore } from "./adapters/tauri-sqlite-candidate-store";
import { isTauriRuntime } from "@/lib/tauri-runtime";

export const dataService: DataService = {
  ...referenceService,
  async analyzeCross(a, b) {
    await inference.start();
    const result = await inference.predict(a, b);
    return {
      parentA: result.parent_ids[0],
      parentB: result.parent_ids[1],
      estimates: Object.entries(result.predictions).map(([trait, p]) => ({
        trait: trait as import("@/types/research").TraitCode,
        value: p.value,
        unit: p.units,
      })),
      researchOnly: true,
      rankingEnabled: true,
      modelVersion: result.bundle_version,
      limitations: [result.target],
    };
  },
};

/**
 * Select the active CandidateStore once at module init.
 * - In the Tauri desktop shell → real SQLite-backed store.
 * - In a plain browser / vite preview → in-session memory store (honestly
 *   labeled; never persisted, survives nothing across reloads).
 *
 * UI and producers always import `candidateStore`, never a concrete adapter.
 */
export const candidateStore: CandidateStore = isTauriRuntime()
  ? new TauriSqliteCandidateStore()
  : new MemoryCandidateStore();

export { MemoryCandidateStore, TauriSqliteCandidateStore };
