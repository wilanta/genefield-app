import { afterEach, expect, test, vi } from "vitest";
import { isTauriRuntime } from "./tauri-runtime";
afterEach(() => vi.unstubAllGlobals());
test("desktop detection uses core marker without optional global API", () => {
  vi.stubGlobal("isTauri", true);
  vi.stubGlobal("window", { __TAURI_INTERNALS__: { invoke: () => {} } });
  expect(isTauriRuntime()).toBe(true);
});
test("plain browser does not claim native persistence", () => {
  vi.stubGlobal("window", {});
  expect(isTauriRuntime()).toBe(false);
});
