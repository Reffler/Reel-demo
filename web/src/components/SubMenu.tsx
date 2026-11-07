import { For, Show, createEffect, type JSX } from "solid-js";
import { followCurrent } from "../ui/followCurrent";

// A page split into a few sections shown one at a time, so a busy step reads as a short list.
// The page's own Next button moves through the sections.

export type SubItem = { id: string; label: string; hint?: string; done?: boolean };

export function SubMenu(props: {
  label: string; items: SubItem[]; current: string; onSelect: (id: string) => void; children: JSX.Element;
}) {
  const index = () => Math.max(0, props.items.findIndex(i => i.id === props.current));
  let list!: HTMLElement;
  // On a phone the sections scroll sideways; keep the open one in view.
  createEffect(() => followCurrent(list, index()));
  return <div class="submenu">
    <nav ref={list} class="submenu-list" role="tablist" aria-label={props.label}><For each={props.items}>{(item, i) =>
      <button role="tab" aria-selected={index() === i()} classList={{ done: !!item.done }} onClick={() => props.onSelect(item.id)}>
        <span class="submenu-dot">{item.done ? "✓" : i() + 1}</span>
        <span class="submenu-text"><strong>{item.label}</strong><Show when={item.hint}><span>{item.hint}</span></Show></span>
      </button>
    }</For></nav>
    <div class="submenu-panel" role="tabpanel">
      {props.children}
    </div>
  </div>;
}
