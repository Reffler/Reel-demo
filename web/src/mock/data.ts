// Static content for the demo build: style presets, canned "Claude" answers and the sample workspace.
import type { Asset, Brand, BrandSheet, BusinessPlan, ContentIdea, Settings, ShotPlan, StylePreset } from "../api";

export const DEMO_USER = { id: "demo", label: "demo@reel.app", method: "claude_code" };

const caption = { enabled: true, key_moments_only: false, color: "#FFFFFF", outline: true, position: "bottom" as const };

export const baseSettings = (): Settings => ({
  goal: "Product promo", description: "", key_moments: "", duration: 45, aspect: "9:16", style: "social", transitions: "cut",
  captions: { ...caption }, progress_bar: true, progress_bar_color: "#C8F763", progress_bar_position: "top",
  excluded_assets: [], hook_title: true, zooms: true, broll: true, music: true, sfx: true,
  logo: { enabled: false, position: "top-right" }, tighten: true, motion_graphics: true, brief: null, agency: null,
});

const style = (id: string, label: string, tagline: string, accent: string, over: Partial<Settings>): StylePreset => ({
  id, label, tagline, accent, defaults: { ...baseSettings(), style: id, ...over },
});

export const presets = () => ({
  styles: [
    style("fast_punchy", "Fast & Punchy", "Tight cuts, zero dead air", "#FF3B5C", { progress_bar: false, sfx: true }),
    style("clean_professional", "Clean & Professional", "Polished, credible, calm", "#4F8CFF", { progress_bar: false, hook_title: false, sfx: false }),
    style("cinematic", "Cinematic", "Moody, deliberate, filmic", "#E0B872", { progress_bar: false, hook_title: false, sfx: false, captions: { ...caption, color: "#F5EFE6", outline: false } }),
    style("podcast", "Podcast / Talking Head", "Conversation first", "#22D3EE", { progress_bar: false, sfx: false }),
    style("educational", "Educational", "Clear steps, easy to follow", "#FACC15", { sfx: false }),
    style("social", "Social Media", "Built for the feed", "#A3FF12", {}),
    style("minimal", "Minimal", "Quiet, understated, honest", "#E5E5E5", { progress_bar: false, hook_title: false, zooms: false, sfx: false, motion_graphics: false, captions: { ...caption, outline: false } }),
    style("high_energy", "High Energy", "Loud, bold, relentless", "#FF2D55", {}),
  ],
  aspects: [],
  durations: [15, 30, 45, 60, 90, 180, 300],
  caption_colors: ["#FFFFFF", "#FFD60A", "#A3FF12", "#22D3EE", "#FF5CAA", "#FF9F1C"],
  defaults: baseSettings(),
});

/** A gradient tile standing in for a thumbnail or frame. */
export const tile = (label: string, hue = 260) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue},70%,45%)'/><stop offset='1' stop-color='hsl(${(hue + 60) % 360},75%,60%)'/></linearGradient></defs><rect width='320' height='180' fill='url(#g)'/><path d='M140 65v50l42-25z' fill='white' fill-opacity='.85'/><text x='160' y='155' font-family='sans-serif' font-size='14' fill='white' fill-opacity='.8' text-anchor='middle'>${label.replace(/[<>&']/g, "").slice(0, 28)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
export const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export const SAMPLE_VIDEO = "demo/sample.mp4";

export const transcriptFor = (filename: string): Asset["transcript"] => ({
  language: "en", words: 214,
  preview: `So this is ${filename.replace(/\.[^.]+$/, "")}. We start the day early, and honestly, that's the secret — everything is made fresh, by hand, every single morning…`,
});

// ── sample business ──
const idea = (id: string, title: string, hook: string, description: string, pillar: string, platform: string, scores: [number, number, number], verdict: string, shortlisted = true): ContentIdea => ({
  id, title, hook, description, pillar, platform, format: "Short video", fit: scores[0], hook_score: scores[1], effort: scores[2], verdict,
  source: "claude", shortlisted,
});

export const sampleIdeas = (): ContentIdea[] => [
  idea("idea_croissant", "Making 200 croissants before sunrise", "You won't believe what happens at 4am", "Time-lapse of the early shift: dough, folding, the oven door opening, the first tray out.", "Behind the scenes", "Instagram", [5, 5, 4], "Strong visual hook and easy to film in one go."),
  idea("idea_secret", "The one ingredient we never skip", "Most bakeries cut this corner. We don't.", "Owner talks to camera about real butter, with close-ups of the lamination.", "Founder story", "TikTok", [5, 4, 5], "Personal, quick to shoot, builds trust."),
  idea("idea_faq", "Three questions customers always ask", "“Is it really made today?”", "Staff answer the most common questions at the counter.", "FAQs", "Instagram", [4, 3, 5], "Easy and useful, needs a sharper hook.", false),
  idea("idea_order", "How to order a custom cake", "Your dream cake in 3 steps", "Walkthrough of the ordering process with finished cakes as B-roll.", "Tips & how-tos", "YouTube Shorts", [4, 4, 3], "Drives enquiries directly.", false),
];

export const samplePlan = (): BusinessPlan => {
  const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const ideas = sampleIdeas();
  return {
    name: "Lina's Bakery", industry: "Food & drinks", offer: "Fresh viennoiserie, sourdough and custom cakes, baked every morning.",
    audience: "Locals aged 25–45 who care where their food comes from.", location: "Lisbon, Portugal", links: "instagram.com/linasbakery",
    stage: "Growing", goals: ["Get known", "Sell more"], goal_notes: "More foot traffic on weekends and more custom cake orders.",
    involvement: "Lina is happy to be on camera; the team is shy.", platforms: ["Instagram", "TikTok"], posts_per_week: 3,
    posting_days: ["Tue", "Thu", "Sat"], pillars: ["Behind the scenes", "Founder story", "FAQs", "Tips & how-tos"], voice: ["Friendly", "Premium"],
    inspiration: "Warm, tactile, slow-paced food videos.",
    strategy_summary: "Show the craft behind every loaf. Lead with sensory, behind-the-scenes moments on Instagram and TikTok, and use Lina's voice for trust.",
    ideas, calendar: [
      { id: "slot_1", idea_id: ideas[0].id, date: day(2), platform: "Instagram", project_id: "prj_demo_new" },
      { id: "slot_2", idea_id: ideas[1].id, date: day(4), platform: "TikTok", project_id: "" },
    ],
  };
};

export const newIdeas = (name: string): ContentIdea[] => [
  idea(`idea_${Math.random().toString(36).slice(2, 9)}`, `A day in the life at ${name || "the shop"}`, "This is what 12 hours looks like", "Follow one person from opening to closing, fast cuts with a voiceover.", "Behind the scenes", "Instagram", [0, 0, 0], "", false),
  idea(`idea_${Math.random().toString(36).slice(2, 9)}`, "Meet the team", "Four people, one very big job", "Quick intro to each team member with one fun fact.", "Team & culture", "TikTok", [0, 0, 0], "", false),
  idea(`idea_${Math.random().toString(36).slice(2, 9)}`, "Before & after", "Watch this transform in 15 seconds", "A satisfying transformation shot from a fixed angle.", "Before & after", "Instagram", [0, 0, 0], "", false),
];

export const shotPlan = (title: string): ShotPlan => ({
  shots: [
    { shot: "Wide establishing shot of the space", detail: "Hold for 4 seconds, phone vertical, natural light.", seconds: 4 },
    { shot: "Close-up of hands at work", detail: "Slow, steady movement. Fill the frame.", seconds: 6 },
    { shot: `Presenter to camera: what “${title}” is about`, detail: "Eye level, clip-on mic, one take, smile at the end.", seconds: 20 },
    { shot: "The finished result", detail: "Turn it slowly in the light, then a close-up detail.", seconds: 5 },
  ],
  talking_points: ["Say who you are in the first sentence.", "One surprising fact in the first 3 seconds.", "End with a clear invitation: come by, order, or follow."],
  tips: ["Wipe the lens first.", "Film each shot twice.", "Record 10 seconds of room silence for cleaner edits."],
});

export const sampleSheet = (name: string): BrandSheet => ({
  name: `${name || "Client"} house style`, summary: "Warm, tactile and unhurried. Close-ups of craft, soft natural colour and captions that stay out of the way.",
  inspired_by: "Slow food documentaries and small-batch brand reels.", own_twist: "Real faces from the team and the shop's own warm tones.",
  headline_font: "Playfair Display", colors: { primary: "#F5EFE6", accent: "#E0B872", text: "#FFFFFF" },
  captions: { font: "Inter", words: "few", uppercase: false, animation: "rise", background: "shadow", position: "bottom", notes: "Highlight the product name in the accent colour." },
  pacing: "Relaxed, 3–5 second shots that let the food breathe.", shot_seconds: 4, pause_seconds: 0.45,
  cuts: "Straight cuts on action, soft fades between scenes.", transitions: ["cut", "fade"], zooms: "Gentle push-ins on faces and finished products.", zoom_amount: "subtle",
  motion_graphics: "A simple lower third for names and prices.", graphics_amount: "subtle", music: "Warm acoustic, low under speech.",
  sound_effects: "Natural sounds only: oven, knife, crunch.", sfx_amount: "few", color_grade: "warm", color_notes: "Lift the shadows slightly, keep skin tones natural.",
  do: ["Open on a close-up", "Show hands", "Keep text short"], dont: ["No flashy transitions", "No stock music with vocals"],
});

export const emptyBrand = (id: string): Brand => ({
  status: "none", stage: null, progress: 0, error: null, sheet: null, sources: [], approved_at: null,
  folder: { path: `~/Reel/My clients/${id}`, exists: true, counts: { "raw footage": 0, "edited videos": 0 } },
});
