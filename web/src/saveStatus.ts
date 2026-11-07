import { createSignal } from "solid-js";

// One shared "Saving… / Saved / Couldn't save" state for everything that autosaves.

export type SaveState = "idle" | "saving" | "saved" | "error";
const [saveState, setSaveState] = createSignal<SaveState>("idle");
export { saveState };

let hide: number | undefined;
let again: (() => void) | undefined;

export async function tracked<T>(run: () => Promise<T>): Promise<T> {
  window.clearTimeout(hide);
  setSaveState("saving");
  try {
    const result = await run();
    setSaveState("saved");
    hide = window.setTimeout(() => setSaveState("idle"), 2000);
    return result;
  } catch (e) {
    again = () => void tracked(run).catch(() => {});
    setSaveState("error");
    throw e;
  }
}

export const retrySave = () => again?.();
