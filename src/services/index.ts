import type { DataService } from "./data-service";
import { mockDataService } from "./adapters/mock-data-service";
import type { CandidateStore } from "@/types/research";
import { MemoryCandidateStore } from "./adapters/memory-candidate-store";
import { TauriSqliteCandidateStore } from "./adapters/tauri-sqlite-candidate-store";
import { isTauriRuntime } from "@/lib/tauri-runtime";

export const dataService: DataService = mockDataService;

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
