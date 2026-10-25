// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import {
  LanguageProvider,
  useLanguage,
  useTranslation,
} from "./language-provider";
import { LANGUAGE_STORAGE_KEY } from "@/lib/i18n";

function Controls() {
  const { language, setLanguage } = useLanguage();
  const { t, locale } = useTranslation();
  const [draft, setDraft] = useState("");
  return (
    <>
      <p>{t("Language preference")}</p>
      <output>
        {language} / {locale}
      </output>
      <input
        aria-label="Draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button onClick={() => setLanguage("indonesian")}>
        Bahasa Indonesia
      </button>
      <button onClick={() => setLanguage("english")}>English</button>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "en";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("application language preference", () => {
  it("defaults to Indonesian on first launch and persists it", () => {
    render(
      <LanguageProvider>
        <Controls />
      </LanguageProvider>,
    );
    expect(screen.getByText("indonesian / id-ID")).toBeDefined();
    expect(document.documentElement.lang).toBe("id");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("indonesian");
  });

  it("respects a previously saved English preference", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "english");
    render(
      <LanguageProvider>
        <Controls />
      </LanguageProvider>,
    );
    expect(screen.getByText("english / en-US")).toBeDefined();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("english");
  });

  it("switches immediately, preserves current input, persists and restores on restart", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "english");
    const first = render(
      <LanguageProvider>
        <Controls />
      </LanguageProvider>,
    );
    expect(screen.getByText("Language preference")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Draft"), {
      target: { value: "Catatan GID_1233" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Bahasa Indonesia" }));
    expect(screen.getByText("Pilihan bahasa")).toBeDefined();
    expect((screen.getByLabelText("Draft") as HTMLInputElement).value).toBe(
      "Catatan GID_1233",
    );
    expect(document.documentElement.lang).toBe("id");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("indonesian");
    first.unmount();
    render(
      <LanguageProvider>
        <Controls />
      </LanguageProvider>,
    );
    expect(screen.getByText("indonesian / id-ID")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText("Language preference")).toBeDefined();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("english");
  });

  it.each(["invalid", "null", "id", ""])(
    "ignores unsupported stored value %s",
    (stored) => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, stored);
      render(
        <LanguageProvider>
          <Controls />
        </LanguageProvider>,
      );
      expect(screen.getByText("indonesian / id-ID")).toBeDefined();
      expect(document.documentElement.lang).toBe("id");
    },
  );

  it("still switches when persistent storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <LanguageProvider>
        <Controls />
      </LanguageProvider>,
    );
    expect(screen.getByText("indonesian / id-ID")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText("Language preference")).toBeDefined();
    expect(document.documentElement.lang).toBe("en");
  });
});
