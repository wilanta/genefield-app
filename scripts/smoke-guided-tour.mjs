// Actual Tauri WebView2 + local services. No mocked reference data or inference.
// Launch a separate debug WebView profile so existing UI preferences are untouched.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

assert(
  process.env.GENEFIELD_TOUR_QA_PID,
  "Set GENEFIELD_TOUR_QA_PID to the isolated QA app process",
);
const windowHelper = spawn(
  "powershell",
  [
    "-NoProfile",
    "-File",
    "scripts/tour-window-qa.ps1",
    "-TourProcessId",
    process.env.GENEFIELD_TOUR_QA_PID,
  ],
  { windowsHide: true, stdio: ["pipe", "pipe", "inherit"] },
);
const windowLines = createInterface({ input: windowHelper.stdout });
const resizeWindow = (size) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Native window resize timed out")),
      10000,
    );
    windowLines.once("line", (line) => {
      clearTimeout(timeout);
      line === "resized" ? resolve() : reject(new Error(line));
    });
    windowHelper.stdin.write(`${size.width},${size.height}\n`);
  });

const browser = await chromium.connectOverCDP(
  process.env.GENEFIELD_CDP_URL || "http://127.0.0.1:9223",
);
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes(":1420"));
assert(page, "A running Tauri development WebView is required");
const directory = "test-results/guided-tour";
mkdirSync(directory, { recursive: true });
const evidence = {
  scope:
    "Actual Tauri development WebView2, real native SQLite and frozen final-v1 inference; no installer or scientific approval claim",
  checks: [],
  errors: [],
  sizes: [],
};
page.on("pageerror", (error) => evidence.errors.push(error.message));
const record = (name) => {
  evidence.checks.push(name);
  console.log(`PASS ${name}`);
};
const popover = page.locator(".tour-popover");
const next = () =>
  popover
    .getByRole("button", { name: /^(Next|Continue Tour|Finish Tour)$/ })
    .click();
const state = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("genefield-onboarding-v1")),
  );
const snapshot = () =>
  page.evaluate(async () => {
    const { candidateStore } = await import("/src/services/index.ts");
    return JSON.stringify(await candidateStore.list());
  });
const nav = (name) => page.getByRole("link", { name, exact: true }).click();
const expectStep = async (id) => {
  await page.locator(`.tour-popover[data-tour-step="${id}"]`).waitFor();
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="dialog-content"]'),
  );
};
const geometry = async () => {
  await page.waitForFunction(
    () => {
      const element = document.querySelector(".tour-popover");
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return (
        rect.left >= 0 &&
        rect.top >= 0 &&
        rect.right <= innerWidth + 1 &&
        rect.bottom <= innerHeight + 1
      );
    },
    null,
    { timeout: 5000 },
  );
  const value = await popover.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  assert(
    value.left >= 0 &&
      value.top >= 0 &&
      value.right <= value.width + 1 &&
      value.bottom <= value.height + 1,
    JSON.stringify(value),
  );
};

try {
  assert(await page.evaluate(() => !!window.__TAURI_INTERNALS__));
  await page.evaluate(() =>
    localStorage.setItem("genefield-language", "english"),
  );
  await page.goto("http://localhost:1420/");
  await page.locator('[data-tour="overview"]').waitFor({ timeout: 120000 });
  // Reset only onboarding in this isolated QA profile for a reproducible run.
  await page.evaluate(() => localStorage.removeItem("genefield-onboarding-v1"));
  await page.reload();
  await page
    .getByRole("heading", { name: "Welcome to GeneField", exact: true })
    .waitFor({ timeout: 120000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.clearDeviceMetricsOverride");
  const baseline = await snapshot();
  const preferences = await page.evaluate(() =>
    Object.fromEntries(
      [
        "genefield-theme",
        "genefield-language",
        "genefield-interface-density",
      ].map((key) => [key, localStorage.getItem(key)]),
    ),
  );
  await page.getByRole("button", { name: "Maybe Later", exact: true }).click();
  await page.reload();
  await page.locator('[data-tour="overview"]').waitFor({ timeout: 120000 });
  assert.equal(
    await page
      .getByRole("heading", { name: "Welcome to GeneField", exact: true })
      .count(),
    0,
  );
  record("Welcome is optional and stays dismissed after reload");
  await nav("Settings");
  await page
    .getByRole("button", { name: "Start Guided Tour", exact: true })
    .click();
  await expectStep("workspace");
  assert.equal(new URL(page.url()).pathname, "/");
  record("Settings closes by navigation and starts Step 1");

  // Responsive geometry on every step, including async target mounting.
  const stepIds = [
    "workspace",
    "overview",
    "dataset",
    "lines",
    "search",
    "observations",
    "pedigree",
    "relationships",
    "pair",
    "parent-a",
    "parent-b",
    "analyze",
    "estimates",
    "history",
    "designer",
    "objectives",
    "weights",
    "filters",
    "generate",
    "ranking",
    "save",
    "compare",
    "evidence",
    "limits",
  ];
  for (let i = 0; i < stepIds.length; i++) {
    await expectStep(stepIds[i]);
    const { tourSteps } = await import("../src/onboarding/tourSteps.ts");
    await page.locator(`[data-tour="${tourSteps[i].target}"]`).waitFor();
    for (const size of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1024, height: 640 },
    ]) {
      await resizeWindow(size);
      await page.waitForTimeout(200);
      await geometry();
      if (i === 16) {
        evidence.sizes.push({
          requested: size,
          actual: await page.evaluate(() => ({
            width: innerWidth,
            height: innerHeight,
          })),
        });
        await page.screenshot({
          path: `${directory}/weights-${size.width}.png`,
        });
      }
    }
    if (i === 3) {
      await popover.getByRole("button", { name: "Back", exact: true }).click();
      await expectStep("dataset");
      assert.equal(new URL(page.url()).pathname, "/");
      await next();
      await expectStep("lines");
      record("Back and Next navigate across module routes");
    }
    if (i === 5) {
      await popover
        .getByRole("button", {
          name: "Hide tip to explore this screen",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Profile", exact: true })
        .first()
        .click();
      await page.getByRole("button", { name: /Continue Guided Tour/ }).click();
      record("Real historical line profile opens during tour");
    }
    if (i === 7) {
      const node = page.locator(".react-flow__node").first();
      await node.click();
      await expectStep("relationships");
      record("Pedigree graph remains interactive");
    }
    if (i === 9 || i === 10) {
      // Verified pair already used in the repository's real-data smoke test.
      const slot = i === 9 ? "A" : "B";
      await page
        .getByRole("textbox", { name: `Parent ${slot}`, exact: true })
        .fill(i === 9 ? "GID_10039" : "GID_10125");
      await popover.getByRole("heading").click();
    }
    if (i === 11) {
      await page
        .getByRole("button", { name: "Analyze Cross", exact: true })
        .click();
      await expectStep("estimates");
      await page.getByText("Analysis complete", { exact: true }).waitFor();
      record("One user-initiated real four-trait analysis advances the tour");
      continue;
    }
    if (i === 18) {
      // Keep the real candidate space small using existing parent-pool controls.
      await page
        .getByRole("textbox", { name: "Search parent lines", exact: true })
        .fill("GID_100");
      await page
        .getByRole("button", { name: "Generate Candidate Pairs", exact: true })
        .click();
      await expectStep("ranking");
      record("One user-initiated real ranking advances the tour");
      continue;
    }
    if (i === 21) {
      const boxes = page.getByRole("checkbox", { name: /Compare/ });
      if ((await boxes.count()) >= 2) {
        await boxes.nth(0).click();
        await boxes.nth(1).click();
        await page.getByRole("button", { name: /Compare candidates/ }).click();
        await page
          .getByRole("heading", {
            name: "Compare saved candidates",
            exact: true,
          })
          .waitFor();
        assert.equal(await popover.count(), 0);
        await page.keyboard.press("Escape");
        await expectStep("compare");
        record("Real saved candidate comparison opens and returns to the tour");
      } else
        throw new Error(
          "Two existing saved candidates are required to demonstrate comparison without creating user data",
        );
    }
    await next();
  }
  await page
    .getByRole("heading", {
      name: "You're ready to explore GeneField",
      exact: true,
    })
    .waitFor();
  assert.equal((await state()).hasCompletedTour, true);
  await page.screenshot({ path: `${directory}/completion.png` });
  await page
    .getByRole("button", { name: "Start Exploring", exact: true })
    .click();
  record("First full tour completes and marks progress");
  assert.equal(await snapshot(), baseline);
  record("Actual SQLite candidate data is unchanged");

  await page.reload();
  await page
    .locator('[data-tour="model-insights"]')
    .waitFor({ timeout: 120000 });
  assert.equal(await page.getByRole("dialog").count(), 0);
  await nav("Settings");
  await page
    .getByRole("button", { name: "Replay Guided Tour", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expectStep("workspace");
  record(
    "Completed status survives restart; keyboard Settings replay starts Step 1",
  );
  for (const id of stepIds) {
    await expectStep(id);
    await next();
  }
  await page
    .getByRole("heading", {
      name: "You're ready to explore GeneField",
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "Restart Tour", exact: true }).click();
  await expectStep("workspace");
  assert.equal(await popover.count(), 1);
  record("Second full tour completes; completion restart creates one session");

  // Missing target fallback, manual navigation, Escape, interrupted restart.
  await page
    .locator('[data-tour="workspace-nav"]')
    .evaluate((element) => element.removeAttribute("data-tour"));
  await popover
    .getByText(
      "This area is not available yet. You can continue the tour and explore it later.",
    )
    .waitFor({ timeout: 6000 });
  await next();
  await expectStep("overview");
  await nav("Settings");
  await popover
    .getByRole("button", { name: "Return to step", exact: true })
    .click();
  await expectStep("overview");
  assert.equal(new URL(page.url()).pathname, "/");
  await page.keyboard.press("Escape");
  assert.equal(await popover.count(), 0);
  await page.reload();
  await page.locator('[data-tour="overview"]').waitFor({ timeout: 120000 });
  assert.equal(await page.getByRole("dialog").count(), 0);
  record(
    "Missing target, manual navigation, Escape, and interrupted reload are safe",
  );
  assert.equal(await snapshot(), baseline);
  assert.deepEqual(
    await page.evaluate(() =>
      Object.fromEntries(
        [
          "genefield-theme",
          "genefield-language",
          "genefield-interface-density",
        ].map((key) => [key, localStorage.getItem(key)]),
      ),
    ),
    preferences,
  );
  assert.deepEqual(evidence.errors, []);
  record(
    "Candidates and unrelated preferences preserved across all replays; zero page errors",
  );
} finally {
  writeFileSync(
    `${directory}/evidence.json`,
    JSON.stringify(evidence, null, 2) + "\n",
  );
  windowHelper.stdin.end();
  await browser.close();
}
