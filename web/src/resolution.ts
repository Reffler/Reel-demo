import { createSignal } from "solid-js";

// The size of the exported MP4, by its short side. Edits are planned at 1080p; captions and graphics
// scale with the picture. The choice is remembered on this computer for the next export.
export type Resolution = "720p" | "1080p" | "1440p" | "2160p";
export const RESOLUTIONS: { value: Resolution; label: string; short: number }[] = [
  { value: "720p", label: "720p", short: 720 },
  { value: "1080p", label: "1080p", short: 1080 },
  { value: "1440p", label: "2K", short: 1440 },
  { value: "2160p", label: "4K", short: 2160 },
];
const KEY = "reel.export.resolution";
function stored(): Resolution {
  try {
    const v = localStorage.getItem(KEY);
    if (RESOLUTIONS.some(r => r.value === v)) return v as Resolution;
  } catch { /* private window */ }
  return "1080p";
}
const [resolution, setResolutionSignal] = createSignal<Resolution>(stored());
export { resolution };
export function setResolution(v: Resolution) {
  setResolutionSignal(v);
  try { localStorage.setItem(KEY, v); } catch { /* not saved, still used now */ }
}
// "1080 × 1920" for a plan of the given size at a resolution
export function outputSize(width: number, height: number, r: Resolution): string {
  const short = RESOLUTIONS.find(x => x.value === r)!.short;
  const f = short / Math.min(width, height);
  return `${Math.round((width * f) / 2) * 2} × ${Math.round((height * f) / 2) * 2}`;
}
export const resolutionLabel = (r: string | null | undefined) => RESOLUTIONS.find(x => x.value === r)?.label ?? "1080p";
