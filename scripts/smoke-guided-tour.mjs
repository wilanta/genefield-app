// Real Tauri WebView2 + SQLite + frozen inference. Use an isolated QA profile.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { tourSteps } from "../src/onboarding/tourSteps.ts";
assert(
  process.env.GENEFIELD_TOUR_QA_PID,
  "Set GENEFIELD_TOUR_QA_PID to the isolated QA app process",
);
const helper = spawn(
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
const lines = createInterface({ input: helper.stdout });
const resize = (size) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Native resize timed out")),
      10000,
    );
    lines.once("line", (line) => {
      clearTimeout(timer);
      line === "resized" ? resolve() : reject(Error(line));
    });
    helper.stdin.write(`${size.width},${size.height}\n`);
  });
const browser = await chromium.connectOverCDP(
  process.env.GENEFIELD_CDP_URL || "http://127.0.0.1:9223",
);
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes(":1420"));
assert(page, "A real Tauri development WebView is required");
const dictionary = JSON.parse(readFileSync("src/locales/id.json", "utf8"));
let language = "indonesian";
const t = (text, values = {}) =>
  (language === "indonesian" ? dictionary[text] || text : text).replace(
    /\{(\w+)\}/g,
    (match, key) => values[key] ?? match,
  );
const directory = "test-results/guided-tour";
mkdirSync(directory, { recursive: true });
const evidence = {
  scope:
    "Actual native Tauri, SQLite, and frozen final-v1; engineering validation only",
  checks: [],
  errors: [],
  sizes: [],
  savedByTest: [],
};
page.on("pageerror", (error) => evidence.errors.push(error.message));
const record = (name) => {
  console.log(`PASS ${name}`);
  evidence.checks.push(name);
};
const panel = page.locator(".tour-popover");
const forward = () =>
  panel.getByRole("button", {
    name: new RegExp(
      `^(${t("Next")}|${t("Continue Tour")}|${t("Finish Tour")})$`,
    ),
  });
const at = (id) =>
  page.locator(`.tour-popover[data-tour-step="${id}"]`).waitFor();
const next = () => forward().click();
const locked = async () =>
  assert(
    await forward().isDisabled(),
    "Next must be locked before the task is completed",
  );
const unlocked = () =>
  page.waitForFunction(() => {
    const e = document.querySelector(
      ".tour-popover .tour-controls-pages button:last-child",
    );
    return e && !e.disabled;
  });
const hide = () =>
  panel
    .getByRole("button", {
      name: t("Hide tip to explore this screen"),
      exact: true,
    })
    .click();
const resume = () => page.locator(".tour-resume button").first().click();
const nav = (name) =>
  page.getByRole("link", { name: t(name), exact: true }).click();
const candidateList = () =>
  page.evaluate(async () => {
    const { candidateStore } = await import("/src/services/index.ts");
    return candidateStore.list();
  });
let baseline = [];
let exercise;
const createdIds = new Set();
const originalLanguage = await page.evaluate(() =>
  localStorage.getItem("genefield-language"),
);
async function proveReadingLayout(step, pass) {
  if (pass !== 1) return;
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 640 },
  ]) {
    await resize(size);
    await page.waitForFunction(() => {
      const card = document
        .querySelector(".tour-popover")
        ?.getBoundingClientRect();
      const spots = [...document.querySelectorAll(".tour-spotlight")];
      return (
        card &&
        card.left >= 0 &&
        card.top >= 0 &&
        card.right <= innerWidth + 1 &&
        card.bottom <= innerHeight + 1 &&
        spots.length === 1 &&
        spots.every((spot) => {
          const r = spot.getBoundingClientRect();
          return (
            Math.max(
              0,
              Math.min(card.right, r.right) - Math.max(card.left, r.left),
            ) *
              Math.max(
                0,
                Math.min(card.bottom, r.bottom) - Math.max(card.top, r.top),
              ) ===
            0
          );
        })
      );
    });
    assert.equal(await panel.getAttribute("data-tour-phase"), "explanation");
    const dock = await panel.getAttribute("data-tour-dock");
    const width = await page.evaluate(() => innerWidth);
    if (step === "save" && width >= 1450) assert.equal(dock, "left");
    evidence.sizes.push({
      step,
      phase: "explanation",
      requested: size,
      actual: await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
      })),
    });
    await page.screenshot({
      path: `${directory}/interactive-${step}-explanation-${size.width}.png`,
    });
  }
}

async function perform(step, pass) {
  switch (step.requirement) {
    case "search":
      await page
        .getByRole("textbox", { name: t("Search LINE_ID"), exact: true })
        .fill("GID_NOT_IN_DATASET");
      await locked();
      await page
        .getByRole("textbox", { name: t("Search LINE_ID"), exact: true })
        .fill(exercise.parents[1]);
      await locked();
      await page
        .getByRole("textbox", { name: t("Search LINE_ID"), exact: true })
        .fill(exercise.parents[0]);
      await page
        .locator(".tour-task mark")
        .filter({ hasText: exercise.parents[0] })
        .waitFor();
      break;
    case "profile":
      await page
        .locator(
          `[data-tour="line-profile-action"][data-tour-line-id="${exercise.parents[0]}"]`,
        )
        .click();
      await page
        .locator('.tour-popover[data-tour-phase="explanation"]')
        .waitFor();
      assert.equal(new URL(page.url()).pathname, "/lines");
      assert(await page.locator('[data-tour="line-profile"]').isVisible());
      await proveReadingLayout("observations", pass);
      record(
        `${pass}: Profile click shows the profile explanation before Pedigree Explorer`,
      );
      break;
    case "pedigree":
      await page.locator(".react-flow__node").first().click();
      break;
    case "parent-a":
    case "parent-b": {
      const slot = step.requirement === "parent-a" ? "A" : "B";
      const input = page.getByRole("textbox", {
        name: t(`Parent ${slot}`),
        exact: true,
      });
      await input.fill(
        slot === "A" ? "GID_NOT_IN_DATASET" : exercise.parents[0],
      );
      await locked();
      if (slot === "A") {
        await input.fill(
          exercise.eligibleIds.find(
            (id) => id !== exercise.parents[0] && id !== exercise.parents[1],
          ) ?? exercise.parents[1],
        );
        await locked();
      }
      const parent = exercise.parents[slot === "A" ? 0 : 1];
      await input.fill(parent);
      await page
        .locator(`[data-tour="cross-suggestions-${slot.toLowerCase()}"]`)
        .getByRole("button")
        .filter({ hasText: parent })
        .click();
      assert.equal(
        await page
          .locator(`[data-tour="cross-suggestions-${slot.toLowerCase()}"]`)
          .count(),
        0,
      );
      await panel.getByRole("heading").click();
      if (slot === "B" && pass === 1) {
        await unlocked();
        await panel
          .getByRole("button", { name: t("Back"), exact: true })
          .click();
        await at("parent-a");
        await unlocked();
        await next();
        await at("parent-b");
        await unlocked();
        record("Back preserves completed parent tasks within the session");
      }
      break;
    }
    case "analysis":
      await page
        .getByRole("button", { name: t("Analyze Cross"), exact: true })
        .click();
      await at("estimates");
      await panel.getByRole("button", { name: t("Back"), exact: true }).click();
      await at("analyze");
      await unlocked();
      await next();
      await at("estimates");
      record(`${pass}: real four-trait analysis unlocks and advances`);
      return;
    case "objectives":
      for (const [trait, value] of [
        ["GY", "1"],
        ["DTF", "1"],
        ["NO", "0"],
        ["LB", "0"],
      ]) {
        await panel
          .locator(".tour-checklist button")
          .nth(["GY", "DTF", "NO", "LB"].indexOf(trait))
          .click();
        await page
          .getByRole("spinbutton", { name: `${trait} weight`, exact: true })
          .fill(value);
      }
      await panel.locator(".tour-checklist button").last().click();
      await page
        .getByRole("combobox", { name: t("DTF priority"), exact: true })
        .click();
      await page
        .getByRole("option", {
          name: t(pass === 1 ? "Earlier flowering" : "Later flowering"),
          exact: true,
        })
        .click();
      break;
    case "weights":
      await page
        .getByRole("spinbutton", { name: "GY weight", exact: true })
        .fill("2");
      await page
        .getByRole("spinbutton", { name: "DTF weight", exact: true })
        .fill("1");
      break;
    case "filters":
      await page
        .getByRole("textbox", { name: t("Search parent lines"), exact: true })
        .fill("");
      await page
        .getByRole("textbox", { name: t("Search parent lines"), exact: true })
        .fill(exercise.poolSearch);
      await unlocked();
      await page
        .getByRole("textbox", { name: t("Search parent lines"), exact: true })
        .fill(exercise.poolSearch.toLowerCase());
      await unlocked();
      record(`${pass}: uppercase and lowercase parent pool searches both pass`);
      await panel.locator(".tour-checklist button").last().click();
      assert.equal(
        await page.evaluate(() => document.activeElement?.id),
        "max-candidates",
      );
      await page.locator("#max-candidates").fill("5");
      break;
    case "ranking":
      await page
        .getByRole("button", {
          name: t("Generate Candidate Pairs"),
          exact: true,
        })
        .click();
      await at("ranking");
      record(`${pass}: real nonempty ranking unlocks and advances`);
      return;
    case "save":
      for (let row = 0; row < 2; row++) {
        const tr = page.locator(".breed-designer-candidates tbody tr").nth(row);
        await tr.getByRole("button", { name: t("Save"), exact: true }).click();
        await tr
          .getByRole("button", { name: t("Saved"), exact: true })
          .waitFor();
        for (const c of await candidateList())
          if (!baseline.some((b) => b.id === c.id)) createdIds.add(c.id);
        if (row === 0) {
          await locked();
        }
      }
      break;
    case "workspace": {
      const saved = (await candidateList()).filter((c) => createdIds.has(c.id));
      const highlightedRow = await page
        .locator('[data-tour="candidate-row"]')
        .evaluateAll((rows) => {
          const spot = document
            .querySelector(".tour-spotlight")
            ?.getBoundingClientRect();
          return rows.find((row) => {
            const r = row.getBoundingClientRect();
            return spot && Math.abs(spot.top - r.top) <= 6;
          })?.dataset.tourCandidateId;
        });
      assert(highlightedRow, "One candidate row must be highlighted");
      assert.equal(await page.locator(".tour-spotlight").count(), 1);
      await page
        .locator(
          `[data-tour="candidate-row"][data-tour-candidate-id="${highlightedRow}"]`,
        )
        .getByRole("button")
        .first()
        .click();
      await page
        .locator('.tour-popover[data-tour-phase="explanation"]')
        .waitFor();
      assert.equal(new URL(page.url()).pathname, "/candidates");
      assert(await page.locator('[data-tour="candidate-detail"]').isVisible());
      await proveReadingLayout("save", pass);
      record(
        `${pass}: single candidate row opens the detail explanation without leaving the step`,
      );
      break;
    }
    case "compare": {
      const saved = (await candidateList())
        .filter((c) => createdIds.has(c.id))
        .slice(0, 2);
      for (const c of saved)
        await page
          .getByRole("checkbox", {
            name: t("Compare {name}", { name: c.name }),
            exact: true,
          })
          .check();
      await page
        .getByRole("button", {
          name: new RegExp(`^${t("Compare candidates")}`),
        })
        .click();
      await page
        .getByRole("heading", {
          name: t("Compare saved candidates"),
          exact: true,
        })
        .waitFor();
      await page.keyboard.press("Escape");
      break;
    }
    case "limitations":
      await panel.getByRole("checkbox").check();
      break;
  }
  await unlocked();
  await next();
}
try {
  assert(await page.evaluate(() => !!window.__TAURI_INTERNALS__));
  await page.evaluate(() => {
    localStorage.setItem("genefield-language", "indonesian");
    localStorage.removeItem("genefield-onboarding-v1");
  });
  await page.goto("http://localhost:1420/");
  await page
    .getByRole("button", { name: t("Maybe Later"), exact: true })
    .waitFor({ timeout: 120000 });
  baseline = await candidateList();
  await page
    .getByRole("button", { name: t("Maybe Later"), exact: true })
    .click();
  exercise = await page.evaluate(async () => {
    const { loadTourExample } = await import("/src/onboarding/tourExample.ts");
    return loadTourExample();
  });
  record(
    `Verified eligible IDs ${exercise.parents.join(" / ")} and pool ${exercise.poolSearch}`,
  );
  for (let pass = 1; pass <= 2; pass++) {
    await nav("Settings");
    if (pass === 2) {
      await page
        .getByRole("combobox", { name: t("Language preference"), exact: true })
        .click();
      await page.getByRole("option", { name: "English", exact: true }).click();
      language = "english";
    }
    await page
      .getByRole("button", {
        name: t(pass === 1 ? "Start Guided Tour" : "Replay Guided Tour"),
        exact: true,
      })
      .click();
    for (const step of tourSteps) {
      await at(step.id);
      assert.equal(new URL(page.url()).pathname, step.route);
      if (step.requirement) await locked();
      if (
        pass === 1 &&
        [
          "overview",
          "lines",
          "observations",
          "designer",
          "objectives",
          "weights",
          "filters",
          "save",
          "evidence",
        ].includes(step.id)
      )
        for (const size of [
          { width: 1920, height: 1080 },
          { width: 1440, height: 900 },
          { width: 1366, height: 768 },
          { width: 1024, height: 640 },
        ]) {
          await resize(size);
          await page.waitForFunction(() => {
            const r = document
              .querySelector(".tour-popover")
              ?.getBoundingClientRect();
            return (
              r &&
              r.left >= 0 &&
              r.top >= 0 &&
              r.right <= innerWidth + 1 &&
              r.bottom <= innerHeight + 1
            );
          });
          if (step.id === "observations") {
            await page.waitForFunction((id) => {
              const target = [
                ...document.querySelectorAll(
                  '[data-tour="line-profile-action"]',
                ),
              ].find(
                (element) => element.getAttribute("data-tour-line-id") === id,
              );
              const card = document.querySelector(".tour-popover");
              if (!target || !card) return false;
              const r = target.getBoundingClientRect();
              const p = card.getBoundingClientRect();
              const overlap =
                Math.max(
                  0,
                  Math.min(p.right, r.right) - Math.max(p.left, r.left),
                ) *
                Math.max(
                  0,
                  Math.min(p.bottom, r.bottom) - Math.max(p.top, r.top),
                );
              const hit = document.elementFromPoint(
                r.left + r.width / 2,
                r.top + r.height / 2,
              );
              return overlap === 0 && !!hit && target.contains(hit);
            }, exercise.parents[0]);
          }
          await page.waitForFunction(() => {
            const card = document
              .querySelector(".tour-popover")
              ?.getBoundingClientRect();
            const spots = [...document.querySelectorAll(".tour-spotlight")];
            return (
              card &&
              spots.length &&
              spots.every((spot) => {
                const r = spot.getBoundingClientRect();
                return (
                  Math.max(
                    0,
                    Math.min(card.right, r.right) - Math.max(card.left, r.left),
                  ) *
                    Math.max(
                      0,
                      Math.min(card.bottom, r.bottom) -
                        Math.max(card.top, r.top),
                    ) ===
                  0
                );
              })
            );
          });
          evidence.sizes.push({
            step: step.id,
            requested: size,
            actual: await page.evaluate(() => ({
              width: innerWidth,
              height: innerHeight,
            })),
          });
          await page.screenshot({
            path: `${directory}/interactive-${step.id}-${size.width}.png`,
          });
        }
      if (pass === 1 && step.id === "overview") {
        const before = page.url();
        await page
          .getByRole("link", { name: t("Settings"), exact: true })
          .click();
        assert.equal(page.url(), before);
        await hide();
        await nav("Settings");
        await resume();
        await panel
          .getByRole("button", { name: t("Return to step"), exact: true })
          .click();
        record(
          "Outside navigation is blocked while open and enabled while hidden",
        );
      }
      await perform(step, pass);
    }
    await page
      .getByRole("heading", {
        name: t("You're ready to explore GeneField"),
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("genefield-onboarding-v1"))
            .hasCompletedTour,
      ),
      true,
    );
    await page
      .getByRole("button", { name: t("Start Exploring"), exact: true })
      .click();
    const actual = await candidateList();
    for (const c of baseline)
      assert.deepEqual(
        actual.find((a) => a.id === c.id),
        c,
      );
    assert.equal(createdIds.size, pass * 2);
    record(
      `${pass}: all 14 required tasks completed; explicit saves added two candidates; existing data unchanged`,
    );
    await page.reload();
    await page
      .locator('[data-tour="model-insights"]')
      .waitFor({ timeout: 120000 });
    assert.equal(await page.getByRole("dialog").count(), 0);
  }
  await nav("Settings");
  await page
    .getByRole("button", { name: t("Replay Guided Tour"), exact: true })
    .click();
  await at("workspace");
  await page.keyboard.press("Escape");
  assert.equal(await panel.count(), 0);
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.hasAttribute("data-guided-tour-dock"),
    ),
    false,
  );
  await nav("Settings");
  record("Escape exits the tour and restores normal navigation and page size");
  assert.deepEqual(evidence.errors, []);
  record(
    "Two complete interactive runs in Indonesian and English; replay survives reload; zero page errors",
  );
} finally {
  evidence.savedByTest = [...createdIds];
  for (const id of createdIds) {
    assert(!baseline.some((c) => c.id === id));
    await page.evaluate(async (id) => {
      const { candidateStore } = await import("/src/services/index.ts");
      const c = await candidateStore.get(id);
      if (
        !c ||
        c.source !== "breed-designer" ||
        !/\((?:Guided Tour|Tur Terpandu) [a-f0-9]{8}\)$/.test(c.name)
      )
        throw Error(
          "Refusing to remove a candidate not created by this QA tour",
        );
      await candidateStore.remove(id);
    }, id);
  }
  if (baseline.length || createdIds.size) {
    assert.deepEqual(await candidateList(), baseline);
    evidence.qaCandidatesCleaned = true;
  }
  await page.evaluate((original) => {
    original
      ? localStorage.setItem("genefield-language", original)
      : localStorage.removeItem("genefield-language");
  }, originalLanguage);
  writeFileSync(
    `${directory}/interactive-evidence.json`,
    JSON.stringify(evidence, null, 2) + "\n",
  );
  helper.stdin.end();
  await browser.close();
}
