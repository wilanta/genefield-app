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
  let position = center;
  if (target) {
    const right = target.left + target.width + gap;
    const bottom = target.top + target.height + gap;
    if (right + panel.width <= viewport.width - margin)
      position = { left: right, top: target.top };
    else if (target.left - gap - panel.width >= margin)
      position = { left: target.left - gap - panel.width, top: target.top };
    else if (bottom + panel.height <= viewport.height - margin)
      position = { left: target.left, top: bottom };
    else if (target.top - gap - panel.height >= margin)
      position = { left: target.left, top: target.top - gap - panel.height };
    else
      position = {
        left: viewport.width - panel.width - margin,
        top: viewport.height - panel.height - margin,
      };
  }
  return {
    left: clamp(position.left, viewport.width - panel.width - margin),
    top: clamp(position.top, viewport.height - panel.height - margin),
  };
}
