export interface TourRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Prefer a clear side of the target, then clamp to the visible viewport. */
export function placeTourPopover(
  target: TourRect | null,
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const gap = 18;
  const margin = 16;
  const clamp = (value: number, max: number) =>
    Math.max(margin, Math.min(value, Math.max(margin, max)));
  const center = {
    left: (viewport.width - panel.width) / 2,
    top: (viewport.height - panel.height) / 2,
  };
  let candidates = [center];
  if (target) {
    const right = target.left + target.width + gap;
    const bottom = target.top + target.height + gap;
    candidates = [
      { left: right, top: target.top },
      { left: target.left - gap - panel.width, top: target.top },
      { left: target.left, top: bottom },
      { left: target.left, top: target.top - gap - panel.height },
      { left: margin, top: margin },
      { left: viewport.width - panel.width - margin, top: margin },
      { left: margin, top: viewport.height - panel.height - margin },
      {
        left: viewport.width - panel.width - margin,
        top: viewport.height - panel.height - margin,
      },
    ];
  }
  const placed = candidates.map((position) => ({
    left: clamp(position.left, viewport.width - panel.width - margin),
    top: clamp(position.top, viewport.height - panel.height - margin),
  }));
  const overlap = (position: typeof center) =>
    target
      ? Math.max(
          0,
          Math.min(position.left + panel.width, target.left + target.width) -
            Math.max(position.left, target.left),
        ) *
        Math.max(
          0,
          Math.min(position.top + panel.height, target.top + target.height) -
            Math.max(position.top, target.top),
        )
      : 0;
  // Score the FINAL clamped position. A position that looked clear before
  // clamping can otherwise cover the very button the user must click.
  return placed.reduce((best, position) =>
    overlap(position) < overlap(best) ? position : best,
  );
}
