/// <reference types="node" />
// Runs the application client against the copied executable; only the Tauri
// transport is replaced with Node pipes. Desktop ACL/UI are tested separately.
import { beforeAll, afterAll, expect, test, vi } from "vitest";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { writeFileSync } from "node:fs";
vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    sidecar: () => {
      const listeners: Record<string, (data: unknown) => void> = {};
      let stdout: (line: string) => void, stderr: (line: string) => void;
      return {
        stdout: {
          on: (_: string, fn: typeof stdout) => {
            stdout = fn;
          },
        },
        stderr: {
          on: (_: string, fn: typeof stderr) => {
            stderr = fn;
          },
        },
        on: (event: string, fn: (data: unknown) => void) => {
          listeners[event] = fn;
        },
        spawn: async () => {
          const child = spawn(
            "src-tauri/binaries/genefield-final-v1-x86_64-pc-windows-msvc.exe",
            [],
            { windowsHide: true },
          );
          createInterface({ input: child.stdout }).on("line", (line) =>
            stdout(line),
          );
          createInterface({ input: child.stderr }).on("line", (line) =>
            stderr(line),
          );
          child.on("close", (code) => listeners.close?.({ code }));
          child.on("error", (error) => listeners.error?.(error));
          return {
            write: (data: string) =>
              new Promise<void>((resolve, reject) =>
                child.stdin.write(data, (error) =>
                  error ? reject(error) : resolve(),
                ),
              ),
            kill: async () => {
              child.kill();
            },
          };
        },
      };
    },
  },
}));
import {
  GeneFieldSidecar,
  type Metadata,
  type Trait,
  type Pair,
} from "./client";
import { analysisError } from "./errors";
const client = new GeneFieldSidecar();
let metadata: Metadata;
beforeAll(async () => {
  const start = performance.now();
  metadata = await client.start();
  writeFileSync(
    "docs/evidence/metadata.json",
    JSON.stringify(
      {
        transport: "application TS client with real Node pipes",
        startup_ms: performance.now() - start,
        metadata,
      },
      null,
      2,
    ) + "\n",
  );
});
afterAll(async () => {
  await client.stop();
});
test("copied final-v1 startup and four supported traits", () => {
  expect(metadata.bundle_version).toBe("final-v1");
  expect(Object.keys(metadata.traits)).toEqual(["GY", "DTF", "NO", "LB"]);
});
test("request IDs correlate concurrent prediction and historical lookup", async () => {
  const [prediction, history] = await Promise.all([
    client.predict("GID_10039", "GID_10125"),
    client.historical("GID_10039", "GID_10125"),
  ]);
  for (const p of Object.values(prediction.predictions))
    expect(Number.isFinite(p.value)).toBe(true);
  expect(prediction.parent_ids).toEqual(history.parent_ids);
  writeFileSync(
    "docs/evidence/prediction.json",
    JSON.stringify({ prediction, history }, null, 2) + "\n",
  );
});
test("historical lookup recognizes an actually recorded pedigree pair", async () => {
  expect(
    (await client.historical("GID_10039", "GID_8938")).is_historical_pair,
  ).toBe(true);
});
test("actual single-trait objectives, weighted ranking, determinism and candidate safety", async () => {
  const results = [];
  for (const [trait, direction] of [
    ["GY", "maximize"],
    ["DTF", "minimize"],
    ["DTF", "maximize"],
    ["NO", "minimize"],
    ["LB", "minimize"],
  ] as const) {
    const ids = metadata.traits[trait].training_parent_ids;
    const pairs: Pair[] = ids.flatMap((a, i) =>
      ids.slice(i + 1).map((b) => [a, b] as Pair),
    );
    const start = performance.now();
    const ranking = await client.rank(pairs, { [trait]: direction });
    const roundtrip = performance.now() - start;
    expect(ranking.eligible_candidate_count).toBeGreaterThan(20);
    const seen = new Set<string>();
    for (const c of ranking.candidates) {
      expect(c.parent_ids[0]).not.toBe(c.parent_ids[1]);
      const key = [...c.parent_ids].sort().join("|");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(
        (await client.historical(...c.parent_ids)).is_historical_pair,
      ).toBe(false);
    }
    expect(await client.rank(pairs, { [trait]: direction })).toEqual(ranking);
    results.push({
      trait,
      direction,
      roundtrip_ms: roundtrip,
      result: ranking,
    });
  }
  const ids = metadata.traits.LB.training_parent_ids.filter((id) =>
    (["GY", "DTF", "NO"] as Trait[]).every((t) =>
      metadata.traits[t].training_parent_ids.includes(id),
    ),
  );
  const pairs: Pair[] = ids.flatMap((a, i) =>
    ids.slice(i + 1).map((b) => [a, b] as Pair),
  );
  const weighted = await client.rank(
    pairs,
    { GY: "maximize", DTF: "minimize", NO: "minimize", LB: "minimize" },
    { GY: 2, DTF: 1, NO: 1, LB: 1 },
  );
  expect(
    await client.rank(
      pairs,
      { GY: "maximize", DTF: "minimize", NO: "minimize", LB: "minimize" },
      { GY: 2, DTF: 1, NO: 1, LB: 1 },
    ),
  ).toEqual(weighted);
  writeFileSync(
    "docs/evidence/ranking.json",
    JSON.stringify({ single_trait: results, weighted }, null, 2) + "\n",
  );
});
test("backend authoritative errors are displayed in English in the UI", async () => {
  try {
    await client.predict("GID_10039", "GID_10039");
    throw new Error("Expected SELF_CROSS");
  } catch (error) {
    expect(analysisError(error)).toBe("Select two different parents.");
  }
  await expect(client.predict("GID_999999", "GID_10039")).rejects.toMatchObject(
    { code: "PARENT_UNKNOWN" },
  );
  // Runtime negative case intentionally crosses the TS objective constraint.
  await expect(
    client.rank([["GID_10039", "GID_10125"]], { DTF: "" } as never),
  ).rejects.toMatchObject({ code: "DTF_OBJECTIVE_REQUIRED" });
});
test("stop rejects use, and controlled restart revalidates metadata", async () => {
  await client.stop();
  await expect(client.predict("GID_10039", "GID_10125")).rejects.toMatchObject({
    code: "PROCESS_NOT_STARTED",
  });
  await expect(client.start()).rejects.toMatchObject({
    code: "PROCESS_UNAVAILABLE",
  });
  expect((await client.restart()).bundle_version).toBe("final-v1");
});
