import { describe, expect, it } from "vitest";
import indonesian from "@/locales/id.json";
import { translate } from "./i18n";

describe("localized application copy", () => {
  it("preserves the exact interpolation placeholders in every translation", () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();
    for (const [source, target] of Object.entries(indonesian)) {
      expect(target.trim(), source).not.toBe("");
      expect(placeholders(target), source).toEqual(placeholders(source));
    }
  });

  it("translates labels and interpolates identifiers without translating input data", () => {
    expect(
      translate("Use as Parent A for {id}", "indonesian", { id: "GID_1233" }),
    ).toBe("Gunakan sebagai Tetua A untuk GID_1233");
    expect(
      translate("Actions for {name}", "indonesian", {
        name: "My candidate {id}",
      }),
    ).toBe("Tindakan untuk My candidate {id}");
    expect(translate("GID_1233", "indonesian")).toBe("GID_1233");
    expect(translate("final-v1", "indonesian")).toBe("final-v1");
    expect(translate("Language preference", "english")).toBe(
      "Language preference",
    );
  });
});
