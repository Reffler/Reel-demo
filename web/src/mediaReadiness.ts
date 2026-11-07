import type { Asset, Settings } from "./api";
import type { Uploading } from "./components/UploadStep";

export type MediaActivity = { reading: boolean; reviewing: boolean; error: string };
const stages: Record<string, [number, number]> = {
  "Reading media": [0.03, 0.04], "Making thumbnails": [0.07, 0.03],
  "Finding the speaker": [0.1, 0.1], "Transcribing": [0.2, 0.6],
  "Aligning words": [0.8, 0.18], "Preparing image": [0.1, 0.85],
  "Preparing audio": [0.1, 0.65], "Listening": [0.78, 0.2],
};
export function mediaReadiness(assets: Asset[], uploads: Uploading[], settings: Settings, activity: MediaActivity) {
  const excluded = new Set(settings.excluded_assets ?? []);
  const selected = assets.filter(a => !excluded.has(a.id));
  const processing = assets.filter(a => a.status === "queued" || a.status === "processing");
  const unreviewed = assets.some(a => a.status === "ready" && !a.detection);
  const failed = uploads.some(u => u.error) || selected.some(a => a.status === "error");
  const hasVideo = selected.some(a => ["main", "broll"].includes(a.kind) && a.status === "ready");
  const ready = hasVideo && !uploads.length && !processing.length && !unreviewed && !failed && !activity.reading && !activity.reviewing && !activity.error;
  const complete = assets.filter(a => a.status === "ready").length;
  const work = assets.reduce((sum, a) => {
    if (a.status === "ready") return sum + 1;
    if (a.status === "error") return sum;
    const [base, weight] = stages[a.stage ?? ""] ?? [0, 0];
    return sum + base + weight * Math.max(0, Math.min(1, a.progress));
  }, 0) + uploads.reduce((sum, u) => sum + Math.max(0, Math.min(1, u.progress)) * 0.08, 0);
  // Stage-weighted work, not an invented ETA. Review has no measurable percentage.
  const progress = ready ? 100 : Math.min(85, Math.round(85 * work / Math.max(1, assets.length + uploads.length)));
  const label = activity.error ? "Media review needs attention" : failed ? "Retry, remove, or exclude failed files" : activity.reading ? "Reading folder…" : uploads.length ? "Uploading files…" : processing.length ? `${processing.find(a => a.status === "processing")?.stage ?? "Preparing files"}…` : activity.reviewing ? "AI is reviewing your media…" : unreviewed ? "Waiting for AI review…" : !hasVideo ? "Include at least one video to continue" : "Your footage is ready";
  return { ready, progress, label, complete, total: assets.length + uploads.length,
    indeterminate: activity.reviewing || activity.reading, failed: failed || !!activity.error };
}
