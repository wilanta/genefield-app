// Run against the existing Tauri development WebView2 with a CDP debug port.
// Only language settings and navigation are changed; candidate data is read.
import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.connectOverCDP(
  process.env.GENEFIELD_CDP_URL || "http://127.0.0.1:9223",
);
const page = browser
  .contexts()
  .flatMap((context) => context.pages())
  .find((tab) => tab.url().includes(":1420"));
if (!page) {
  await browser.close();
  throw new Error(
    "The running GeneField Tauri development window is required.",
  );
}
const originalUrl = page.url();
const originalLanguage = await page.evaluate(
  () => localStorage.getItem("genefield-language") || "english",
);
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

async function navigate(path, title) {
  await page.evaluate((path) => {
    history.pushState({}, "", path);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await page
    .getByRole("heading", { name: title, exact: true, level: 1 })
    .waitFor();
}
async function selectLanguage(language) {
  await page
    .getByRole("combobox", { name: /Language preference|Pilihan bahasa/ })
    .click();
  await page
    .getByRole("option", {
      name: language === "english" ? "English" : "Bahasa Indonesia",
      exact: true,
    })
    .click();
  await page.waitForFunction(
    (language) =>
      document.documentElement.lang === (language === "english" ? "en" : "id"),
    language,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("genefield-language")),
    language,
  );
}

try {
  assert(await page.evaluate(() => !!window.__TAURI_INTERNALS__));
  const baseline = await page.evaluate(async () => {
    const { candidateStore } = await import("/src/services/index.ts");
    return JSON.stringify(await candidateStore.list());
  });
  await navigate(
    "/settings",
    originalLanguage === "indonesian" ? "Pengaturan" : "Settings",
  );
  await selectLanguage("indonesian");
  await page
    .getByRole("heading", { name: "Pengaturan", exact: true, level: 1 })
    .waitFor();
  await page
    .getByRole("button", { name: "Buka folder log", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Ekspor log", exact: true }).waitFor();
  assert(
    await page
      .getByRole("combobox", { name: "Pilihan bahasa" })
      .evaluate((element) => {
        const text = element.querySelector('[data-slot="select-value"]');
        return !!text && text.scrollWidth <= text.clientWidth;
      }),
  );
  if (process.env.GENEFIELD_LANGUAGE_SCREENSHOT) {
    await page.screenshot({ path: process.env.GENEFIELD_LANGUAGE_SCREENSHOT });
  }
  console.log(
    "PASS native desktop switches labels and persists Bahasa Indonesia",
  );

  await page.reload();
  await page
    .getByRole("heading", { name: "Pengaturan", exact: true, level: 1 })
    .waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "id");
  assert.equal(
    await page.getByRole("combobox", { name: "Pilihan bahasa" }).innerText(),
    "Bahasa Indonesia",
  );
  console.log("PASS preference restored after WebView reload");

  await navigate("/", "Ringkasan");
  await page.getByText("Galur tercatat", { exact: true }).waitFor();
  await page.getByText("20.628", { exact: true }).waitFor();
  await navigate("/lines", "Penjelajah Galur");
  await page
    .getByRole("textbox", { name: "Cari LINE_ID", exact: true })
    .waitFor();
  await page
    .getByRole("columnheader", { name: "Genotipe", exact: true })
    .waitFor();
  await page.getByRole("columnheader", { name: /Hasil Gabah/ }).waitFor();
  await navigate("/pedigree", "Penjelajah Silsilah");
  await page.getByRole("button", { name: "Perbesar", exact: true }).waitFor();
  await navigate("/cross-lab", "Lab Persilangan");
  await page.getByRole("textbox", { name: "Tetua A", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Analisis Persilangan", exact: true })
    .waitFor();
  await navigate("/breed-designer", "Perancang Persilangan");
  await page
    .getByRole("button", { name: "Buat Pasangan Kandidat", exact: true })
    .waitFor();
  await navigate("/candidates", "Ruang Kerja Kandidat");
  await page.getByRole("button", { name: "Buat", exact: true }).waitFor();
  await navigate("/model-insights", "Informasi Model");
  await page.getByText("Ringkasan Model", { exact: true }).waitFor();
  await page
    .getByText(
      "Stres LB terkontrol tidak dapat diestimasi selama pengembangan.",
      { exact: true },
    )
    .waitFor();
  await navigate("/about", "Tentang GeneField");
  await page.getByText("Atribusi Dataset", { exact: true }).waitFor();
  console.log("PASS Indonesian navigation and content on all nine routes");

  await navigate("/settings", "Pengaturan");
  await selectLanguage("english");
  await page
    .getByRole("heading", { name: "Settings", exact: true, level: 1 })
    .waitFor();
  await page
    .getByRole("button", { name: "Open log folder", exact: true })
    .waitFor();
  const current = await page.evaluate(async () => {
    const { candidateStore } = await import("/src/services/index.ts");
    return JSON.stringify(await candidateStore.list());
  });
  assert.equal(current, baseline);
  assert.deepEqual(pageErrors, []);
  console.log(
    "PASS switches back to English; candidate data unchanged; no page errors",
  );
} finally {
  // Restore the user's original preference and route after verification.
  await navigate(
    "/settings",
    (await page.locator("html").getAttribute("lang")) === "id"
      ? "Pengaturan"
      : "Settings",
  );
  await selectLanguage(originalLanguage);
  await page.evaluate((url) => {
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, originalUrl);
  await browser.close();
}
