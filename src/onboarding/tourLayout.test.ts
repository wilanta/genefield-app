import { describe, expect, it } from "vitest";
import { placeTourPopover } from "./tourLayout";

describe("unobstructed tutorial actions", () => {
  it.each([
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1188, 710],
    [1024, 640],
  ])(
    "never places the card over a Profile button at %i x %i",
    (width, height) => {
      const panel = { width: 390, height: Math.min(640, height - 32) };
      for (const left of [20, Math.floor(width / 2), width - 90]) {
        for (const top of [100, Math.floor(height / 2), height - 70]) {
          const target = { left, top, width: 64, height: 30 };
          const position = placeTourPopover(target, panel, { width, height });
          const overlapWidth = Math.max(
            0,
            Math.min(position.left + panel.width, target.left + target.width) -
              Math.max(position.left, target.left),
          );
          const overlapHeight = Math.max(
            0,
            Math.min(position.top + panel.height, target.top + target.height) -
              Math.max(position.top, target.top),
          );
          expect(
            overlapWidth * overlapHeight,
            JSON.stringify({ target, position }),
          ).toBe(0);
          expect(position.left).toBeGreaterThanOrEqual(16);
          expect(position.top).toBeGreaterThanOrEqual(16);
          expect(position.left + panel.width).toBeLessThanOrEqual(width - 16);
          expect(position.top + panel.height).toBeLessThanOrEqual(height - 16);
        }
      }
    },
  );
});
