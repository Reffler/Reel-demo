import { For, Show, createEffect } from "solid-js";
import { Portal } from "solid-js/web";
import { followCurrent } from "../ui/followCurrent";
import { IconCheck } from "../ui/icons";

/** The steps of a wizard in the top bar. Finished steps get a check; a phone shows "Step 3 of 5" and a progress line. */
export function StepBar(props: {
  phase?: string; label: string; steps: { label: string }[]; current: number;
  reachable: (i: number) => boolean; lockedHint: string; onGo: (i: number) => void;
}) {
  let row!: HTMLElement;
  createEffect(() => followCurrent(row, props.current));
  const n = () => Math.min(props.current, props.steps.length - 1);
  return <Portal mount={document.getElementById("wizard-navigation")!}>
    <Show when={props.phase}><span class="wizard-phase">{props.phase}</span></Show>
    <nav ref={row} class="wizard-steps" aria-label={props.label}><For each={props.steps}>{(s, i) =>
      <button disabled={!props.reachable(i())} title={props.reachable(i()) ? undefined : props.lockedHint}
        aria-current={n() === i() ? "step" : undefined} classList={{ done: i() < n() }} onClick={() => props.onGo(i())}>
        <Show when={i() < n()}><IconCheck size={13} /></Show>{s.label}
      </button>
    }</For></nav>
    <div class="wizard-compact" aria-hidden="true">
      <span>{props.phase ? `${props.phase} · ` : ""}Step {n() + 1} of {props.steps.length}</span>
      <strong>{props.steps[n()]?.label}</strong>
      <div class="wizard-progress"><i style={{ width: `${((n() + 1) / props.steps.length) * 100}%` }} /></div>
    </div>
  </Portal>;
}

/** Fades a new step in and moves focus to its title, so keyboard and VoiceOver users land on it. */
export function enterStep(page: HTMLElement | undefined) {
  if (!page) return;
  page.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 180, easing: "cubic-bezier(.25,.1,.25,1)" });
  page.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
}
