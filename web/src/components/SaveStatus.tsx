import { Match, Switch } from "solid-js";
import { retrySave, saveState } from "../saveStatus";

/** A quiet note in the top bar that answers "is my work kept?". */
export function SaveStatus() {
  return <span class="save-status" role="status" aria-live="polite">
    <Switch>
      <Match when={saveState() === "saving"}>Saving…</Match>
      <Match when={saveState() === "saved"}>Saved</Match>
      <Match when={saveState() === "error"}><span class="save-error">Couldn’t save.</span> <button class="inline-link" onClick={retrySave}>Try again</button></Match>
    </Switch>
  </span>;
}
