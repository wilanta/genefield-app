import { expect, test, vi } from "vitest";
const native = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: native.invoke }));
import { referenceService } from "./reference-service";

test("a rejected native read can recover; concurrent and successful reads stay shared", async () => {
  native.invoke.mockRejectedValueOnce(new Error("Temporary native failure"));
  await expect(referenceService.getDatasetSummary()).rejects.toThrow(
    "Temporary native failure",
  );
  native.invoke.mockResolvedValue({
    lines: [],
    summary: { line_count: 20628 },
  });
  const [summary, lines] = await Promise.all([
    referenceService.getDatasetSummary(),
    referenceService.allLines(),
  ]);
  expect(summary.line_count).toBe(20628);
  expect(lines).toEqual([]);
  await referenceService.getDatasetSummary();
  expect(native.invoke).toHaveBeenCalledTimes(2);
});
