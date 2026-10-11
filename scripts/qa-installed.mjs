// Real installed Windows app only. No Vite imports, transport mocks or ML code.
import { chromium } from "playwright";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
const exec = promisify(execFile);
const binary = process.env.GENEFIELD_INSTALLED_EXE;
if (!binary || binary.toLowerCase().includes("\\projects\\"))
  throw new Error("Installed EXE outside repositories is required");
const out = path.resolve(
  process.env.GENEFIELD_QA_OUTPUT || "docs/evidence/release/installed",
);
const cwd =
  process.env.GENEFIELD_QA_CWD ||
  path.join(os.tmpdir(), "genefield-installed-qa-20261011");
mkdirSync(out, { recursive: true });
mkdirSync(cwd, { recursive: true });
const evidence = {
  scope: "Installed release app; real UI/native IPC/SQLite/frozen EXE",
  binary,
  cwd,
  offline_method:
    "WebView2 deny proxy + browser offline; frozen sidecar existing socket-denial hook. OS adapters unchanged.",
  checks: [],
  page_errors: [],
  console_errors: [],
  samples: {
    startup_ui_ms: [],
    startup_ml_ms: [],
    cross_ui_ms: [],
    gy_ui_ms: [],
    weighted_ui_ms: [],
  },
  launches: [],
};
const record = (name, value) => {
  evidence.checks.push({ name, value });
  console.log(`PASS ${name}`);
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let app, browser, page;
const ps = async (command) =>
  JSON.parse(
    (
      await exec("powershell.exe", ["-NoProfile", "-Command", command], {
        windowsHide: true,
      })
    ).stdout || "null",
  );
async function processes() {
  const rows = await ps(
    "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath | ConvertTo-Json -Compress",
  );
  const ids = new Set([app.pid]);
  let changed;
  do {
    changed = false;
    for (const p of rows)
      if (ids.has(p.ParentProcessId) && !ids.has(p.ProcessId)) {
        ids.add(p.ProcessId);
        changed = true;
      }
  } while (changed);
  return rows.filter((p) => ids.has(p.ProcessId));
}
async function start(index) {
  const port = 9240 + index;
  const env = {
    ...process.env,
    PATH: `${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`,
    WEBVIEW2_USER_DATA_FOLDER: path.join(cwd, "webview"),
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --proxy-server=127.0.0.1:9 --proxy-bypass-list=tauri.localhost --disable-background-networking`,
    GENEFIELD_VERIFY_OFFLINE: "1",
  };
  for (const key of ["PYTHONPATH", "PYTHONHOME", "VIRTUAL_ENV", "CONDA_PREFIX"])
    delete env[key];
  const start = performance.now();
  app = spawn(binary, [], { cwd, env, windowsHide: true, stdio: "ignore" });
  app.on("error", (e) => {
    evidence.launch_error = String(e);
  });
  const url = `http://127.0.0.1:${port}`;
  while (true) {
    try {
      await fetch(`${url}/json/version`);
      break;
    } catch {}
    if (performance.now() - start > 45000)
      throw new Error("Installed app CDP startup timeout");
    await delay(100);
  }
  browser = await chromium.connectOverCDP(url);
  const attachStart = performance.now();
  while (!page || page.isClosed() || !/tauri[.:]/.test(page.url())) {
    const pages = browser.contexts().flatMap((c) => c.pages());
    page = pages.find((p) => /tauri[.:]/.test(p.url()));
    if (performance.now() - attachStart > 30000)
      throw new Error(
        `Installed page missing: ${pages.map((p) => p.url()).join(", ")}; app exit=${app.exitCode}`,
      );
    await delay(50);
  }
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => evidence.page_errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") evidence.console_errors.push(m.text());
  });
  await page.getByRole("link", { name: "Overview", exact: true }).waitFor();
  evidence.samples.startup_ui_ms.push(performance.now() - start);
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByText("20,628", { exact: true }).waitFor({ timeout: 250_000 });
  evidence.samples.startup_ml_ms.push(performance.now() - start);
  assert(await page.evaluate(() => !!window.__TAURI_INTERNALS__));
  await page.context().setOffline(true);
  const blocked = await page.evaluate(async () => {
    try {
      await fetch("https://example.com/", {
        signal: AbortSignal.timeout(3000),
      });
      return false;
    } catch {
      return true;
    }
  });
  assert(blocked);
  const tree = await processes();
  assert.equal(
    tree.filter((p) => p.Name === "genefield-final-v1.exe").length,
    1,
  );
  evidence.launches.push({
    index,
    pid: app.pid,
    url: page.url(),
    process_tree: tree,
    external_fetch_blocked: blocked,
  });
}
async function stop() {
  const tree = await processes();
  const sidecar = tree.find((p) => p.Name === "genefield-final-v1.exe");
  await exec(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `(Get-Process -Id ${app.pid}).CloseMainWindow() | Out-Null`,
    ],
    { windowsHide: true },
  );
  const start = performance.now();
  while (app.exitCode === null) {
    if (performance.now() - start > 15000)
      throw new Error("Normal app close did not terminate");
    await delay(100);
  }
  const survivors = await ps(
    `@(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq ${app.pid} -or $_.ProcessId -eq ${sidecar?.ProcessId || 0} } | Select-Object ProcessId,Name) | ConvertTo-Json -Compress`,
  );
  assert(!survivors || survivors.length === 0);
  record("normal close cleans installed application and sidecar", {
    app_pid: app.pid,
    sidecar_pid: sidecar?.ProcessId,
    survivors,
  });
  await browser.close();
  browser = null;
}
const nav = async (name) =>
  page.getByRole("link", { name, exact: true }).click();
const sql = async (query, values = [], mutate = false) =>
  page.evaluate(
    ({ query, values, mutate }) =>
      window.__TAURI_INTERNALS__.invoke(
        `plugin:sql|${mutate ? "execute" : "select"}`,
        { db: "sqlite:genefield.db", query, values },
      ),
    { query, values, mutate },
  );
const snapshot = () => sql("SELECT * FROM candidates ORDER BY id");
let baseline = [],
  saved = [];
try {
  await start(0);
  baseline = await snapshot();
  record("installed offline startup and one sidecar", evidence.launches[0]);
  await nav("Line Explorer");
  await page.getByRole("textbox", { name: "Search LINE_ID" }).fill("GID_10039");
  await page.getByText("1 of 20,628 lines").waitFor();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  record(
    "Line Explorer and historical profile",
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
    "real pedigree nodes and edges",
    await page.locator("body").innerText(),
  );
  await nav("Cross Lab");
  async function parents(a, b) {
    for (const [name, value] of [
      ["Parent A", a],
      ["Parent B", b],
    ]) {
      await page.getByRole("textbox", { name, exact: true }).fill(value);
      await page.getByRole("textbox", { name, exact: true }).press("Escape");
    }
  }
  await parents("GID_10039", "GID_10125");
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await page
      .getByRole("button", { name: "Analyze Cross", exact: true })
      .click();
    await page.getByText("Analysis complete", { exact: true }).waitFor();
    evidence.samples.cross_ui_ms.push(performance.now() - start);
  }
  const cross = await page.locator("body").innerText();
  assert(
    cross.includes("Historical validation passed") &&
      !cross.includes("Not validated for breeding decisions"),
  );
  record("Cross Lab four traits, units and scientific wording", cross);
  const savedName = `Installed QA ${new Date().toISOString()}`;
  await page
    .getByRole("button", { name: "Save Candidate", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Candidate name", exact: true })
    .fill(savedName);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Save Candidate/i })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const persistedCross = (await snapshot()).find((c) => c.name === savedName);
  const analysis = JSON.parse(persistedCross.analysis_json);
  for (const trait of ["GY", "DTF", "NO", "LB"])
    assert(Number.isFinite(analysis.predictions[trait].value));
  assert.equal(analysis.bundleVersion, "final-v1");
  record("actual four-trait snapshot", analysis);
  await parents("GID_10039", "GID_8938");
  await page
    .getByRole("button", { name: "Analyze Cross", exact: true })
    .click();
  await page
    .getByText("Recorded in historical registry", { exact: true })
    .waitFor();
  await page.getByText("Analysis complete", { exact: true }).waitFor();
  record("recorded historical pair allowed", true);
  await parents("GID_10021", "GID_10125");
  await page
    .getByRole("button", { name: "Analyze Cross", exact: true })
    .click();
  await page.getByRole("alert").first().waitFor();
  const error = await page.getByRole("alert").first().innerText();
  assert(!error.includes("Traceback"));
  record(
    "ineligible input shows application error without prediction fallback",
    error,
  );
  await nav("Breed Designer");
  async function weights(values) {
    for (const trait of ["GY", "DTF", "NO", "LB"])
      await page
        .getByRole("spinbutton", { name: `${trait} weight`, exact: true })
        .fill(String(values[trait] || 0));
  }
  async function rank(samples) {
    const start = performance.now();
    await page
      .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
      .click();
    await page.getByText("C-001", { exact: false }).first().waitFor();
    await page
      .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
      .waitFor();
    if (samples) samples.push(performance.now() - start);
    return page.locator("body").innerText();
  }
  for (let i = 0; i < 10; i++) {
    await weights({ GY: 1 });
    await rank(evidence.samples.gy_ui_ms);
  }
  assert(
    (await page.locator("body").innerText()).includes("Prioritization Score:"),
  );
  record("GY maximize", await page.locator("body").innerText());
  await weights({ DTF: 1 });
  await page
    .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Select a flowering time priority" })
    .waitFor();
  for (const direction of ["Earlier flowering", "Later flowering"]) {
    await page
      .getByRole("combobox", { name: "DTF priority", exact: true })
      .click();
    await page.getByRole("option", { name: direction, exact: true }).click();
    record(`DTF ${direction}`, await rank());
  }
  for (const trait of ["NO", "LB"]) {
    await weights({ [trait]: 1 });
    record(`${trait} minimize`, await rank());
  }
  for (let i = 0; i < 10; i++) {
    await weights({ GY: 2, DTF: 1, NO: 1, LB: 1 });
    await rank(evidence.samples.weighted_ui_ms);
  }
  record("weighted four-trait ranking", await page.locator("body").innerText());
  const names = (await snapshot()).map((c) => c.name);
  let rankedSave = false;
  for (const row of await page
    .locator(".breed-designer-candidates tbody tr")
    .all()) {
    const cells = await row.getByRole("cell").allTextContents();
    if (names.includes(`${cells[1].trim()} × ${cells[2].trim()}`)) continue;
    await row.getByRole("button", { name: "Save", exact: true }).click();
    await row.getByRole("button", { name: "Saved", exact: true }).waitFor();
    rankedSave = true;
    break;
  }
  assert(rankedSave);
  saved = (await snapshot()).filter(
    (c) => !baseline.some((b) => b.id === c.id),
  );
  assert.equal(saved.length, 2);
  assert(
    saved.some(
      (c) => JSON.parse(c.analysis_json).applicationScore !== undefined,
    ),
  );
  await nav("Candidate Workspace");
  await page
    .getByRole("checkbox", { name: `Compare ${savedName}`, exact: true })
    .waitFor();
  for (const c of saved)
    await page
      .getByRole("checkbox", { name: `Compare ${c.name}`, exact: true })
      .check();
  await page.getByRole("button", { name: /^Compare candidates/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Compare saved candidates", { exact: true }).waitFor();
  for (const trait of ["GY", "DTF", "NO", "LB"])
    await dialog.getByText(`${trait} estimate`, { exact: true }).waitFor();
  record(
    "installed Compare uses persisted snapshots",
    await dialog.innerText(),
  );
  await page.screenshot({ path: path.join(out, "compare.png") });
  await dialog
    .getByRole("button", { name: "Back to Workspace", exact: true })
    .click();
  await page.getByText(savedName, { exact: true }).first().click();
  await page
    .getByRole("button", { name: "Open in Cross Lab", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Parent A", exact: true })
      .inputValue(),
    "GID_10039",
  );
  record("reopen saved candidate", true);
  await nav("Model Insights");
  await page.getByText("209", { exact: true }).waitFor();
  record(
    "runtime metadata and Model Insights",
    await page.locator("body").innerText(),
  );
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
  record(
    "installed paths and metadata health",
    await page.locator("body").innerText(),
  );
  const before = (await processes()).find(
    (p) => p.Name === "genefield-final-v1.exe",
  );
  await page
    .getByRole("button", { name: "Restart local analysis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart local analysis", exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some(
      (button) =>
        button.textContent.trim() === "Restart local analysis" &&
        !button.disabled,
    ),
  );
  await page
    .getByText(
      "The final-v1 service is ready. Bundle integrity was verified during loading.",
    )
    .waitFor();
  await page.getByText("Verified by final-v1 loader").waitFor();
  const after = (await processes()).filter(
    (p) => p.Name === "genefield-final-v1.exe",
  );
  assert.equal(after.length, 1);
  assert.notEqual(before.ProcessId, after[0].ProcessId);
  record("controlled restart replaces exactly one sidecar", { before, after });
  const tree = await processes();
  evidence.memory = await ps(
    `@(Get-Process -Id ${tree.map((p) => p.ProcessId).join(",")} -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,WorkingSet64,PrivateMemorySize64) | ConvertTo-Json -Compress`,
  );
  await stop();
  for (let i = 1; i < 5; i++) {
    await start(i);
    const persisted = await snapshot();
    for (const c of saved)
      assert.deepEqual(
        persisted.find((p) => p.id === c.id),
        c,
      );
    record(`whole installed restart ${i} preserves exact snapshots`, true);
    if (i === 4) {
      for (const c of saved)
        await sql("DELETE FROM candidates WHERE id=$1", [c.id], true);
      record(
        "only QA-created workspace rows removed",
        saved.map((c) => c.id),
      );
    }
    await stop();
  }
  assert.equal(evidence.page_errors.length, 0);
  evidence.result = "PASS";
} catch (error) {
  evidence.result = "FAIL";
  evidence.error = String(error);
  if (page && !page.isClosed())
    evidence.body = await page
      .locator("body")
      .innerText()
      .catch(() => "");
  throw error;
} finally {
  if (app && app.exitCode === null) {
    try {
      await stop();
    } catch {
      // Only this harness's process tree; never leave the test app holding
      // workspace files after a failed assertion.
      await exec("taskkill.exe", ["/PID", String(app.pid), "/T", "/F"], {
        windowsHide: true,
      });
    }
  }
  const stats = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      n: values.length,
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median:
        sorted.length % 2
          ? sorted[(sorted.length - 1) / 2]
          : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2,
      ...(values.length >= 10
        ? { empirical_p95: sorted[Math.ceil(values.length * 0.95) - 1] }
        : {}),
    };
  };
  evidence.performance = Object.fromEntries(
    Object.entries(evidence.samples)
      .filter(([, values]) => values.length)
      .map(([name, values]) => [name, stats(values)]),
  );
  writeFileSync(
    path.join(out, "qa.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  if (browser) await browser.close();
}
