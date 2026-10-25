import type { TourProgress } from "./tourTypes";
import { tourSteps } from "./tourSteps";

export const TOUR_STORAGE_KEY = "genefield-onboarding-v1";
export const INITIAL_PROGRESS: TourProgress = {
  hasSeenWelcome: false,
  hasCompletedTour: false,
  lastTourStep: 0,
};

export function readTourProgress(): TourProgress {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(TOUR_STORAGE_KEY) ?? "null",
    );
    if (!value || typeof value !== "object") return { ...INITIAL_PROGRESS };
    const stored = value as Partial<TourProgress>;
    return {
      hasSeenWelcome: stored.hasSeenWelcome === true,
      hasCompletedTour: stored.hasCompletedTour === true,
      lastTourStep:
        typeof stored.lastTourStep === "number" &&
        Number.isSafeInteger(stored.lastTourStep)
          ? Math.max(0, Math.min(tourSteps.length - 1, stored.lastTourStep))
          : 0,
    };
  } catch {
    return { ...INITIAL_PROGRESS };
  }
}

export function writeTourProgress(progress: TourProgress): void {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Onboarding remains usable for this session when local storage is unavailable.
  }
}
