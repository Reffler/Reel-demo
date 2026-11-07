// Every text box grows with what is in it: typed text, pasted text, or text Claude fills in.
// Past 60% of the window it stops growing and scrolls instead.

const MAX_SHARE = 0.6;

function fit(el: HTMLTextAreaElement) {
  // Hidden boxes (a closed section) measure as zero; they are sized when they appear.
  if (!el.isConnected || !el.offsetParent || el.dataset.fixedSize !== undefined) return;
  el.style.height = "auto";
  const borders = el.offsetHeight - el.clientHeight;
  const wanted = el.scrollHeight + borders;
  const cap = Math.round(window.innerHeight * MAX_SHARE);
  el.style.height = `${Math.min(wanted, cap)}px`;
  el.style.overflowY = wanted > cap ? "auto" : "hidden";
}

const fitSoon = (el: HTMLTextAreaElement) => requestAnimationFrame(() => fit(el));
const fitAll = () => document.querySelectorAll("textarea").forEach(el => fit(el));

export function autosizeTextareas() {
  document.addEventListener("input", e => {
    if (e.target instanceof HTMLTextAreaElement) fit(e.target);
  });

  // Solid writes values straight to the `value` property, which fires no event.
  const value = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!;
  Object.defineProperty(HTMLTextAreaElement.prototype, "value", {
    ...value,
    set(this: HTMLTextAreaElement, v: string) {
      value.set!.call(this, v);
      fitSoon(this);
    },
  });

  // New text boxes (a step or panel opening) get sized once they are on the page.
  new MutationObserver(records => {
    for (const r of records)
      r.addedNodes.forEach(n => {
        if (n instanceof HTMLTextAreaElement) fitSoon(n);
        else if (n instanceof HTMLElement) n.querySelectorAll("textarea").forEach(fitSoon);
      });
  }).observe(document.body, { childList: true, subtree: true });

  // A <details> section opening shows boxes that were hidden.
  document.addEventListener("toggle", fitAll, true);

  let resizing = 0;
  addEventListener("resize", () => {
    cancelAnimationFrame(resizing);
    resizing = requestAnimationFrame(fitAll);
  });
}
