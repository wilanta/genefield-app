import type { TourEvent, TourEventMap, TourSignal } from "./tourTypes";

const events = new EventTarget();
let session: { id: string; step: string } | null = null;
export const tourEvents = {
  emit<K extends TourEvent>(event: K, detail: TourEventMap[K]) {
    events.dispatchEvent(
      new CustomEvent("signal", { detail: { type: event, detail } }),
    );
  },
  subscribe(listener: (signal: TourSignal) => void) {
    const receive = (event: Event) =>
      listener((event as CustomEvent<TourSignal>).detail);
    events.addEventListener("signal", receive);
    return () => events.removeEventListener("signal", receive);
  },
  setSession(value: typeof session) {
    session = value;
  },
  // A unique, visible name for an explicit Save click makes replay safe even
  // when the same ranked pairs are already saved. Normal saves are unchanged.
  candidateName(base: string, practiceLabel: string) {
    return session?.step === "ranking"
      ? `${base} (${practiceLabel} ${session.id})`
      : base;
  },
};
