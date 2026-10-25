export type TourEvent = "cross-analysis-complete" | "breed-ranking-complete";

export interface TourStep {
  id: string;
  route: string;
  target: string;
  category: string;
  title: string;
  body: string;
  hint?: string;
  event?: TourEvent;
}

export interface TourProgress {
  hasSeenWelcome: boolean;
  hasCompletedTour: boolean;
  lastTourStep: number;
}
