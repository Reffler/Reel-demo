import type { Aspect, Asset, Settings } from "./api";

// Turns the questionnaire answers into the edit settings the old create wizard used to collect,
// so "Create video" on the Review step can start the edit straight away.

const tones: Record<string, string> = {
  Entertaining: "social", Professional: "clean_professional", Cinematic: "cinematic",
  Educational: "educational", "High energy": "high_energy", Minimal: "minimal",
};
// Formats the renderer can't make yet get the closest one it can; the exact ask still goes to Claude.
const aspects: Record<string, Aspect> = { "9:16": "9:16", "16:9": "16:9", "1:1": "1:1", "4:5": "4:5", "3:4": "4:5", "4:3": "16:9", "21:9": "16:9" };

const clamp = (n: number) => Math.round(Math.min(3600, Math.max(10, n)));

export function briefToSettings(settings: Settings, assets: Asset[]): Settings {
  const b = settings.brief;
  if (!b) return settings;
  const whole = b.scope !== "part";
  const picked = (part: string) => whole || b.parts.includes(part);
  const sub = b.subtitles;
  const excluded = new Set(settings.excluded_assets ?? []);
  // An assist edit keeps the customer's cut, so it stays about as long as their footage.
  const footage = assets.filter(a => a.kind === "main" && a.status === "ready" && !excluded.has(a.id)).reduce((t, a) => t + (a.duration ?? 0), 0);
  return {
    ...settings,
    style: tones[b.style] ?? settings.style,
    aspect: aspects[b.format] ?? settings.aspect,
    duration: whole ? clamp(b.length) : footage ? clamp(footage) : settings.duration,
    description: (whole ? b.about : b.request).trim().slice(0, 2000),
    key_moments: whole ? b.request.trim().slice(0, 2000) : "",
    tighten: picked("rough_cut"),
    hook_title: whole,
    progress_bar: whole && settings.progress_bar,
    zooms: whole || picked("motion_graphics"),
    motion_graphics: picked("motion_graphics") && b.motion_graphics !== "None",
    broll: picked("broll"),
    music: picked("music"),
    sfx: picked("sound") && b.sound_effects !== "None",
    transitions: picked("transitions") ? "auto" : "cut",
    captions: {
      ...settings.captions,
      enabled: picked("subtitles") && sub?.preset !== "none",
      ...(sub && sub.preset !== "none" ? { color: sub.color, outline: sub.outline !== "none", position: sub.position } : {}),
    },
    brief: { ...b, completed: true },
  };
}
