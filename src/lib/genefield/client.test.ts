/// <reference types="node" />
import { beforeEach, afterEach, test, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
const transport = vi.hoisted(() => ({
  modes: [] as {
    delayMs?: number;
    closeBeforeSpawn?: boolean;
    startupError?: string;
    spawnError?: boolean;
  }[],
  commands: [] as {
    stdout: (line: string) => void;
    close: (data: { code: number }) => void;
    writes: Record<string, unknown>[];
    kill: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    sidecar: () => {
      const mode = transport.modes[transport.commands.length] ?? {};
      const c = {
        stdout: (_line: string) => {},
        close: (_data: { code: number }) => {},
        writes: [] as Record<string, unknown>[],
        kill: vi.fn(async () => {}),
      };
      transport.commands.push(c);
      return {
        stdout: {
          on: (_event: string, fn: typeof c.stdout) => {
            c.stdout = fn;
          },
        },
        stderr: { on: () => {} },
        on: (event: string, fn: typeof c.close) => {
          if (event === "close") c.close = fn;
        },
        spawn: async () => {
          if (mode.spawnError) throw new Error("Transient spawn failure");
          if (mode.closeBeforeSpawn) c.close({ code: 1 });
          if (mode.startupError)
            c.stdout(
              JSON.stringify({
                protocol_version: "1.0.0",
                request_id: null,
                ok: false,
                error: { code: mode.startupError, message: "Bundle failed" },
              }),
            );
          return {
            kill: c.kill,
            write: async (data: string) => {
              const req = JSON.parse(data);
              c.writes.push(req);
              if (req.operation === "metadata") {
                const respond = () =>
                  c.stdout(
                    JSON.stringify({
                      protocol_version: "1.0.0",
                      request_id: req.request_id,
                      ok: true,
                      result: JSON.parse(
                        readFileSync("docs/evidence/metadata.json", "utf8"),
                      ).metadata,
                    }),
                  );
                if (mode.delayMs) setTimeout(respond, mode.delayMs);
                else respond();
              }
            },
          };
        },
      };
    },
  },
}));
import { GeneFieldSidecar, GeneFieldError } from "./client";
import { analysisError } from "./errors";
let client: GeneFieldSidecar;
beforeEach(() => {
  transport.commands = [];
  transport.modes = [];
  client = new GeneFieldSidecar();
});
afterEach(async () => {
  await client.stop();
  vi.useRealTimers();
});
test("concurrent initial callers share one process and metadata request", async () => {
  const [a, b] = await Promise.all([client.start(), client.start()]);
  expect(a).toBe(b);
  expect(transport.commands).toHaveLength(1);
  expect(transport.commands[0].writes).toHaveLength(1);
});

test("cold startup past the warm timeout still loads without a restart", async () => {
  vi.useFakeTimers();
  transport.modes = [{ delayMs: 60_000 }];
  const startup = client.start();
  await vi.advanceTimersByTimeAsync(60_001);
  expect((await startup).bundle_version).toBe("final-v1");
  expect(transport.commands).toHaveLength(1);
  expect(transport.commands[0].kill).not.toHaveBeenCalled();
});

test("timed-out initial process is killed before one shared automatic recovery", async () => {
  vi.useFakeTimers();
  transport.modes = [{ delayMs: 130_000 }, {}];
  const startup = Promise.all([client.start(), client.start()]);
  await vi.advanceTimersByTimeAsync(120_001);
  expect(transport.commands[0].kill).toHaveBeenCalledOnce();
  expect(transport.commands).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(750);
  const [a, b] = await startup;
  expect(a).toBe(b);
  expect(transport.commands).toHaveLength(2);
  await vi.advanceTimersByTimeAsync(10_000);
  expect((await client.start()).bundle_version).toBe("final-v1");
});

test.each(["closeBeforeSpawn", "spawnError"] as const)(
  "recovers from %s on first launch",
  async (mode) => {
    vi.useFakeTimers();
    transport.modes = [{ [mode]: true }, {}];
    const startup = client.start();
    await vi.advanceTimersByTimeAsync(751);
    expect((await startup).bundle_version).toBe("final-v1");
    expect(transport.commands).toHaveLength(2);
  },
);

test("recovery is bounded after two startup failures", async () => {
  vi.useFakeTimers();
  transport.modes = [{ closeBeforeSpawn: true }, { closeBeforeSpawn: true }];
  const rejection = expect(client.start()).rejects.toMatchObject({
    code: "PROCESS_CLOSED",
  });
  await vi.advanceTimersByTimeAsync(751);
  await rejection;
  await expect(client.start()).rejects.toMatchObject({
    code: "PROCESS_UNAVAILABLE",
  });
  expect(transport.commands).toHaveLength(2);
});

test.each(["BUNDLE_CORRUPT", "BUNDLE_INCOMPATIBLE"])(
  "early %s stays a failure without retry or a timeout",
  async (code) => {
    transport.modes = [{ startupError: code }];
    await expect(client.start()).rejects.toMatchObject({ code });
    expect(transport.commands).toHaveLength(1);
    expect(transport.commands[0].kill).toHaveBeenCalledOnce();
  },
);

test("closing during startup recovery cancels the next spawn", async () => {
  vi.useFakeTimers();
  transport.modes = [{ closeBeforeSpawn: true }, {}];
  const rejection = expect(client.start()).rejects.toMatchObject({
    code: "PROCESS_CLOSED",
  });
  await vi.advanceTimersByTimeAsync(1);
  await client.stop();
  await vi.advanceTimersByTimeAsync(750);
  await rejection;
  expect(transport.commands).toHaveLength(1);
});
test("out-of-order IDs resolve their own callers", async () => {
  await client.start();
  const a = client.historical("GID_10039", "GID_10125");
  const b = client.historical("GID_10125", "GID_10396");
  const c = transport.commands[0];
  const req = c.writes.slice(1);
  for (const [i, h] of [
    [1, true],
    [0, false],
  ] as const)
    c.stdout(
      JSON.stringify({
        protocol_version: "1.0.0",
        request_id: req[i].request_id,
        ok: true,
        result: {
          bundle_version: "final-v1",
          parent_ids: [req[i].parent_a, req[i].parent_b],
          is_historical_pair: h,
        },
      }),
    );
  expect((await a).is_historical_pair).toBe(false);
  expect((await b).is_historical_pair).toBe(true);
});
test("close rejects pending; retries never spawn; explicit restart works", async () => {
  await client.start();
  const p = client.historical("GID_10039", "GID_10125");
  const rejection = expect(p).rejects.toMatchObject({ code: "PROCESS_CLOSED" });
  transport.commands[0].close({ code: 1 });
  await rejection;
  await expect(client.start()).rejects.toMatchObject({
    code: "PROCESS_UNAVAILABLE",
  });
  expect(transport.commands).toHaveLength(1);
  expect((await client.restart()).bundle_version).toBe("final-v1");
  expect(transport.commands).toHaveLength(2);
});
test("shutdown rejects and clears pending requests and kills process", async () => {
  await client.start();
  const p = client.historical("GID_10039", "GID_10125");
  const rejection = expect(p).rejects.toMatchObject({ code: "PROCESS_CLOSED" });
  await client.stop();
  await rejection;
  expect(transport.commands[0].kill).toHaveBeenCalledOnce();
});
test("timeout removes pending, accepts late response harmlessly, never respawns", async () => {
  await client.start();
  vi.useFakeTimers();
  const p = client.historical("GID_10039", "GID_10125");
  const rejection = expect(p).rejects.toMatchObject({ code: "IPC_TIMEOUT" });
  await vi.advanceTimersByTimeAsync(5001);
  await rejection;
  const c = transport.commands[0];
  c.stdout(
    JSON.stringify({
      protocol_version: "1.0.0",
      request_id: c.writes[1].request_id,
      ok: true,
      result: {},
    }),
  );
  expect(transport.commands).toHaveLength(1);
});
test("malformed protocol rejects pending and makes start unavailable", async () => {
  await client.start();
  const p = client.historical("GID_10039", "GID_10125");
  const rejection = expect(p).rejects.toMatchObject({ code: "IPC_INVALID" });
  transport.commands[0].stdout("bad json");
  await rejection;
  await expect(client.start()).rejects.toMatchObject({
    code: "PROCESS_UNAVAILABLE",
  });
});
test.each([
  "PARENT_UNKNOWN",
  "PARENT_INELIGIBLE",
  "GENOTYPE_UNAVAILABLE",
  "SELF_CROSS",
  "DTF_OBJECTIVE_REQUIRED",
  "OBJECTIVE_INVALID",
  "TRAIT_INVALID",
  "BUNDLE_CORRUPT",
])("maps %s without exposing diagnostics", (code) => {
  expect(
    analysisError(new GeneFieldError(code, "PRIVATE TRACE")),
  ).not.toContain("PRIVATE TRACE");
});
