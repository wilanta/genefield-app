// Attach to the REAL Tauri WebView2 started with a debug-only CDP port.
// No fake Tauri invokes, database adapters, inference or model outputs.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.connectOverCDP(
  process.env.GENEFIELD_CDP_URL || "http://127.0.0.1:9223",
);
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().startsWith("http://localhost:1420"));
if (!page) throw new Error("Real Tauri window is required.");
const evidence = {
  scope:
    "Tauri development WebView2, actual native IPC and sidecar; no installer claim",
  checks: [],
  page_errors: [],
  console_errors: [],
  performance: {},
};
page.on("pageerror", (e) => evidence.page_errors.push(e.message));
page.on("console", (message) => {
  if (message.type() === "error") evidence.console_errors.push(message.text());
});
const record = (name, value) => {
  evidence.checks.push({ name, value });
  console.log(`PASS ${name}`);
};
const nav = async (name) => {
  await page.getByRole("link", { name, exact: true }).click();
};
let baselineIds = [];
try {
  if (await page.getByRole("dialog").isVisible())
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
  assert(await page.evaluate(() => !!window.__TAURI_INTERNALS__));
  record("native Tauri WebView", true);
  baselineIds = await page.evaluate(async () => {
    const { candidateStore } = await import("/src/services/index.ts");
    return (await candidateStore.list()).map((c) => c.id);
  });
  await nav("Overview");
  await page.getByText("20,628", { exact: true }).waitFor();
  record(
    "Overview actual dataset counts",
    await page.locator("body").innerText(),
  );
  await nav("Line Explorer");
  await page.getByText("20,628 of 20,628 lines").waitFor();
  await page.getByRole("textbox", { name: "Search LINE_ID" }).fill("GID_10039");
  await page.getByText("1 of 20,628 lines").waitFor();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  record(
    "Line search and historical profile",
    await page.locator('aside[aria-label="Line detail"]').innerText(),
  );
  await nav("Pedigree Explorer");
  await page.getByRole("textbox", { name: "Search LINE_ID" }).fill("GID_1");
  await page.getByRole("textbox", { name: "Search LINE_ID" }).press("Enter");
  await page
    .locator(".react-flow__node")
    .filter({ hasText: "GID_2980" })
    .waitFor();
  assert((await page.locator(".react-flow__edge").count()) > 0);
  record(
    "Pedigree actual GID_2980/GID_2052 parents",
    await page.locator("body").innerText(),
  );
  await nav("Cross Lab");
  await page
    .getByRole("textbox", { name: "Parent A", exact: true })
    .fill("GID_10039");
  await page
    .getByRole("textbox", { name: "Parent A", exact: true })
    .press("Escape");
  await page
    .getByRole("textbox", { name: "Parent B", exact: true })
    .fill("GID_10125");
  await page
    .getByRole("textbox", { name: "Parent B", exact: true })
    .press("Escape");
  const crossStart = performance.now();
  await page
    .getByRole("button", { name: "Analyze Cross", exact: true })
    .click();
  await page.getByText("Analysis complete", { exact: true }).waitFor();
  evidence.performance.cross_ui_ms = performance.now() - crossStart;
  record(
    "Cross Lab real four-trait output and historical lookup",
    await page.locator("body").innerText(),
  );
  await page.screenshot({ path: "docs/evidence/desktop-cross-lab.png" });
  const name = `Integration smoke ${new Date().toISOString()}`;
  await page
    .getByRole("button", { name: "Save Candidate", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Candidate name", exact: true })
    .fill(name);
  await dialog.getByRole("button", { name: /Save Candidate/i }).click();
  await dialog.waitFor({ state: "hidden" });
  await nav("Candidate Workspace");
  await page.getByText(name, { exact: true }).first().waitFor();
  await page.getByText(name, { exact: true }).first().click();
  record(
    "Candidate Workspace save and reopen real snapshot",
    await page.locator("body").innerText(),
  );
  await nav("Cross Lab");
  await page
    .getByRole("textbox", { name: "Parent A", exact: true })
    .fill("GID_10039");
  await page
    .getByRole("textbox", { name: "Parent A", exact: true })
    .press("Escape");
  await page
    .getByRole("textbox", { name: "Parent B", exact: true })
    .fill("GID_8938");
  await page
    .getByRole("textbox", { name: "Parent B", exact: true })
    .press("Escape");
  await page
    .getByRole("button", { name: "Analyze Cross", exact: true })
    .click();
  await page
    .getByText("Recorded in historical registry", { exact: true })
    .waitFor();
  await page.getByText("Analysis complete", { exact: true }).waitFor();
  record(
    "Cross Lab recorded historical pair allowed",
    await page.locator("body").innerText(),
  );
  await nav("Breed Designer");
  await page
    .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
    .waitFor();
  const rankStart = performance.now();
  await page
    .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
    .click();
  await page.getByText("C-001", { exact: false }).first().waitFor();
  evidence.performance.gy_ui_ms = performance.now() - rankStart;
  record(
    "Breed Designer GY maximize native UI",
    await page.locator("body").innerText(),
  );
  await page
    .getByRole("spinbutton", { name: "GY weight", exact: true })
    .fill("0");
  await page
    .getByRole("spinbutton", { name: "DTF weight", exact: true })
    .fill("1");
  await page
    .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({
      hasText: "Select a flowering time priority: earlier or later flowering.",
    })
    .waitFor();
  record("DTF requires explicit objective", true);
  await page
    .getByRole("combobox", { name: "DTF priority", exact: true })
    .click();
  await page.getByRole("option", { name: "Earlier flowering" }).click();
  await page
    .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
    .click();
  await page.getByText("C-001", { exact: false }).first().waitFor();
  record("DTF minimize native UI", await page.locator("body").innerText());
  await page
    .getByRole("combobox", { name: "DTF priority", exact: true })
    .click();
  await page.getByRole("option", { name: "Later flowering" }).click();
  await page
    .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
    .click();
  await page.getByText("C-001", { exact: false }).first().waitFor();
  record("DTF maximize native UI", await page.locator("body").innerText());
  for (const trait of ["NO", "LB"]) {
    for (const t of ["GY", "DTF", "NO", "LB"])
      await page
        .getByRole("spinbutton", { name: `${t} weight`, exact: true })
        .fill(t === trait ? "1" : "0");
    await page
      .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
      .click();
    await page.getByText("C-001", { exact: false }).first().waitFor();
    record(
      `${trait} minimize native UI`,
      await page.locator("body").innerText(),
    );
  }
  for (const t of ["GY", "DTF", "NO", "LB"])
    await page
      .getByRole("spinbutton", { name: `${t} weight`, exact: true })
      .fill(t === "GY" ? "2" : "1");
  await page
    .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
    .click();
  await page.getByText("C-001", { exact: false }).first().waitFor();
  record(
    "weighted four-trait native UI",
    await page.locator("body").innerText(),
  );
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Saved", exact: true })
    .first()
    .waitFor();
  await nav("Settings");
  await page.getByText("Verified by final-v1 loader").waitFor();
  await page
    .getByRole("button", { name: "Test inference connection", exact: true })
    .click();
  await page
    .getByText(
      "The final-v1 service is ready. Bundle integrity was verified during loading.",
    )
    .waitFor();
  await page.getByText("Verified by final-v1 loader").waitFor();
  record(
    "Settings actual paths and native health",
    await page.locator("body").innerText(),
  );
  await nav("Model Insights");
  await page.getByText("209", { exact: true }).waitFor();
  record(
    "Model Insights authoritative metadata",
    await page.locator("body").innerText(),
  );
  // Additional native-service assertions, including full candidate universes.
  const result = await page.evaluate(async () => {
    const { inference, rankPool } =
      await import("/src/services/inference-service.ts");
    const { referenceService } =
      await import("/src/services/reference-service.ts");
    const { candidateStore } = await import("/src/services/index.ts");
    const start = performance.now();
    const metadata = await inference.health();
    const metadata_ms = performance.now() - start;
    const cp = performance.now();
    const prediction = await inference.predict("GID_10039", "GID_10125");
    const prediction_ms = performance.now() - cp;
    const history = await inference.historical("GID_10039", "GID_8938");
    const ids = metadata.traits.LB.training_parent_ids.filter((id) =>
      ["GY", "DTF", "NO"].every((t) =>
        metadata.traits[t].training_parent_ids.includes(id),
      ),
    );
    const objectives = {
      GY: "maximize",
      DTF: "minimize",
      NO: "minimize",
      LB: "minimize",
    };
    const rp = performance.now();
    const ranking = await rankPool(ids, objectives, {
      GY: 2,
      DTF: 1,
      NO: 1,
      LB: 1,
    });
    const ranking_ms = performance.now() - rp;
    const repeated = await rankPool(ids, objectives, {
      GY: 2,
      DTF: 1,
      NO: 1,
      LB: 1,
    });
    const recorded = await Promise.all(
      ranking.candidates.map((c) => inference.historical(...c.parent_ids)),
    );
    return {
      metadata,
      prediction,
      history,
      ranking,
      deterministic: JSON.stringify(ranking) === JSON.stringify(repeated),
      recorded,
      summary: await referenceService.getDatasetSummary(),
      pedigree: await referenceService.getPedigreeNeighborhood("GID_1"),
      saved: await candidateStore.list(),
      performance: { metadata_ms, prediction_ms, ranking_ms },
    };
  });
  assert(result.deterministic);
  assert(result.history.is_historical_pair);
  assert(result.recorded.every((p) => !p.is_historical_pair));
  const keys = result.ranking.candidates.map((c) =>
    [...c.parent_ids].sort().join("|"),
  );
  assert.equal(new Set(keys).size, keys.length);
  assert(
    result.ranking.candidates.every((c) => c.parent_ids[0] !== c.parent_ids[1]),
  );
  assert(
    result.saved.some(
      (c) => c.name === name && c.analysis?.bundleVersion === "final-v1",
    ),
  );
  record(
    "native metadata, prediction, history, deterministic ranking, pair safety, SQLite snapshot",
    result,
  );
  assert(
    result.saved.some(
      (c) =>
        c.source === "breed-designer" &&
        c.analysis?.weights?.GY === 2 &&
        c.analysis.objectives?.DTF === "maximize",
    ),
  );
  const lifecycle = await page.evaluate(async () => {
    const { inference } = await import("/src/services/inference-service.ts");
    const start = performance.now();
    const metadata = await inference.restart();
    return {
      bundle: metadata.bundle_version,
      controlled_startup_ms: performance.now() - start,
    };
  });
  record("controlled sidecar restart and metadata", lifecycle);
  await page.evaluate(async () => {
    const { inference } = await import("/src/services/inference-service.ts");
    await inference.stop();
  });
  await page.reload();
  await page
    .getByRole("link", { name: "Candidate Workspace", exact: true })
    .click();
  await page.getByText(name, { exact: true }).first().waitFor();
  const persisted = await page.evaluate(async () => {
    const { candidateStore } = await import("/src/services/index.ts");
    return {
      backend: candidateStore.backend,
      rows: await candidateStore.list(),
    };
  });
  assert.equal(persisted.backend, "sqlite-tauri");
  assert(
    persisted.rows.some(
      (c) => c.name === name && c.analysis?.bundleVersion === "final-v1",
    ),
  );
  record("SQLite persistence after WebView reload", persisted);
  const cleanup = await page.evaluate(async (baseline) => {
    const { candidateStore } = await import("/src/services/index.ts");
    const created = (await candidateStore.list()).filter(
      (c) => !baseline.includes(c.id),
    );
    for (const c of created) await candidateStore.remove(c.id);
    return created.map((c) => c.id);
  }, baselineIds);
  record("test-created workspace rows cleaned up", cleanup);
  assert.equal(evidence.page_errors.length, 0);
  await page.screenshot({ path: "docs/evidence/desktop-workspace.png" });
  evidence.result = "PASS";
} catch (error) {
  evidence.result = "FAIL";
  evidence.error = String(error);
  evidence.body = await page.locator("body").innerText();
  throw error;
} finally {
  writeFileSync(
    "docs/evidence/desktop-smoke.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  await browser.close();
}
