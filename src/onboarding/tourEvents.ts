import type { TourEvent } from "./tourTypes";

const events = new EventTarget();
export const tourEvents = {
  emit(event: TourEvent) {
    events.dispatchEvent(new Event(event));
  },
  subscribe(event: TourEvent, listener: () => void) {
    events.addEventListener(event, listener);
    return () => events.removeEventListener(event, listener);
  },
};
