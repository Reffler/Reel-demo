// Scrolls a sideways-scrolling row of tabs so the current one is visible, without moving the page.
// The row itself or one of its parents may be the part that scrolls.
export function followCurrent(row: HTMLElement | undefined, index: number) {
  const item = row?.children[index] as HTMLElement | undefined;
  let scroller: HTMLElement | null = row ?? null;
  while (scroller && scroller.scrollWidth <= scroller.clientWidth) scroller = scroller.parentElement;
  if (!item || !scroller || scroller === document.body || scroller === document.documentElement) return;
  const left = item.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
  scroller.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
}
