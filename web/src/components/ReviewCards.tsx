import { For, Show, type JSX } from "solid-js";
import { IconSpark } from "../ui/icons";

// The last step of a wizard: one grouped list, a row per answer. A row opens that step again.

export type ReviewItem = { label: string; value: string; icon?: (p: { size?: number }) => JSX.Element; onEdit: () => void };

const leftToClaude = /^(Up to Claude|Claude decides|Choose the strongest moments automatically)$/;
const notSet = /^(Not set|Not added yet|No format yet|None added|Not filled in|Not chosen yet|Not decided yet|No idea picked yet|None)$/;

export function ReviewCards(props: { items: ReviewItem[] }) {
  return <div class="review-list"><For each={props.items}>{item =>
    <button class="review-row-button" aria-label={`Edit ${item.label}: ${item.value}`} onClick={item.onEdit}>
      <span class="review-row-label">{item.label}</span>
      <Show when={!leftToClaude.test(item.value)} fallback={<span class="review-row-value auto"><IconSpark size={13} />{item.value}</span>}>
        <span class="review-row-value" classList={{ unset: notSet.test(item.value) }}>{item.value}</span>
      </Show>
      <svg class="review-row-chevron" width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m1.5 1.5 5 5-5 5" /></svg>
    </button>
  }</For></div>;
}
