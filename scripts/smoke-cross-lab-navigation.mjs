// Attach to a development Tauri WebView2 using the current Vite frontend.
// Uses the real reference database; never creates or modifies saved candidates.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const cdpUrl = process.env.GENEFIELD_CDP_URL || "http://127.0.0.1:9223";
const out = "test-results/cross-lab-native";
mkdirSync(out, { recursive: true });
const browser = await chromium.connectOverCDP(cdpUrl);
const page = browser
  .contexts()
  .flatMap((context) => context.pages())
  .find((page) => /^http:\/\/(localhost|127\.0\.0\.1):1420\//.test(page.url()));
assert(page, "A development Tauri window serving port 1420 is required");
page.setDefaultTimeout(30000);
const report = {
  scope: "Development Tauri WebView2, current frontend and real reference IPC",
  status: "running",
  checks: [],
  pageErrors: [],
};
page.on("pageerror", (error) => report.pageErrors.push(error.message));
const nav = (name) => page.getByRole("link", { name, exact: true }).click();
const field = (slot) =>
  page.getByRole("textbox", { name: `Parent ${slot}`, exact: true });
const action = (name) =>
  page.getByRole("button", { name, exact: true }).click();
async function parents(a, b) {
  assert.equal(await field("A").inputValue(), a);
  assert.equal(await field("B").inputValue(), b);
}
function passed(name) {
  report.checks.push(name);
  console.log(`PASS ${name}`);
}
async function selectInExplorer(slot, id, profile = false) {
  await nav("Line Explorer");
  await page
    .getByRole("textbox", { name: "Search LINE_ID", exact: true })
    .fill(id);
  const row = page.getByRole("row").filter({
    has: page.getByText(id, { exact: true }),
  });
  if (profile) {
    await row.getByRole("button", { name: "Profile", exact: true }).click();
    await action(`Use as Parent ${slot}`);
  } else {
    await action(`Use as Parent ${slot} for ${id}`);
  }
}

try {
  assert(await page.evaluate(() => !!window.__TAURI_INTERNALS__));
  await nav("Cross Lab");
  await action("Reset");
  const ids = await page.evaluate(async () => {
    const { referenceService } =
      await import("/src/services/reference-service.ts");
    return (await referenceService.allLines())
      .filter((line) => ["GID_100", "GID_1", "GID_2"].includes(line.id))
      .map((line) => line.id);
  });
  assert.deepEqual(ids.sort(), ["GID_1", "GID_100", "GID_2"].sort());
  passed("native reference data includes all test parents");

  for (const [slot, id] of [
    ["A", "GID_100"],
    ["B", "GID_1"],
  ]) {
    await field(slot).fill(id);
    await page
      .getByRole("listbox", { name: `Parent ${slot} suggestions`, exact: true })
      .getByText(id, { exact: true })
      .click();
  }
  await nav("Overview");
  await nav("Cross Lab");
  await parents("GID_100", "GID_1");
  passed("dropdown selections survive leaving and returning");

  await action("Reset");
  await selectInExplorer("A", "GID_100");
  await parents("GID_100", "");
  await selectInExplorer("B", "GID_1");
  await parents("GID_100", "GID_1");
  passed("Line Explorer A GID_100 then B GID_1 preserves both");
  await page.screenshot({ path: `${out}/selected-parents.png` });

  await action("Reset");
  await selectInExplorer("B", "GID_1");
  await selectInExplorer("A", "GID_100", true);
  await parents("GID_100", "GID_1");
  passed("reverse order and profile action preserve the opposite parent");

  await action("Swap Parent A and Parent B");
  await nav("Overview");
  await nav("Cross Lab");
  await parents("GID_1", "GID_100");
  passed("swapped parents survive navigation");

  await field("A").fill("");
  await field("A").press("Escape");
  await nav("Overview");
  await nav("Cross Lab");
  await parents("", "GID_100");
  passed("clearing one slot preserves the other across navigation");

  await selectInExplorer("A", "GID_2");
  await page.waitForURL(
    (url) => url.pathname === "/cross-lab" && !url.searchParams.has("a"),
  );
  assert.equal(new URL(page.url()).searchParams.has("a"), false);
  await action("Reset");
  await nav("Overview");
  await page.goBack();
  await parents("", "");
  passed("Reset survives Back without replaying old prefill");
  assert.deepEqual(report.pageErrors, []);
  passed("no uncaught page errors");
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = String(error);
  throw error;
} finally {
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
