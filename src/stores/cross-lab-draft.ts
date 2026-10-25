import { create } from "zustand";

interface Parents {
  parentA: string;
  parentB: string;
}

// Keep the current cross while routes unmount. A new app session starts empty.
export const useCrossLabDraft = create<
  Parents & { setParents: (parents: Partial<Parents>) => void }
>((set) => ({
  parentA: "",
  parentB: "",
  setParents: (parents) => set(parents),
}));
