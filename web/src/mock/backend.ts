// An in-browser stand-in for the Reel backend (app.py), used by the static demo build.
// Everything lives in localStorage; processing, planning and rendering are simulated with timers.
import type { Asset, AssetKind, Brand, Business, BusinessPlan, Generation, PlanSummary, Project, ProjectState, Reference, Render, Settings, Storyboard } from "../api";
import type { Delivery, Portal, PortalEvent, PortalState, Turn } from "../portal";
import {
  DEMO_USER, SAMPLE_VIDEO, baseSettings, emptyBrand, hueOf, newIdeas, presets, samplePlan, sampleSheet, shotPlan, tile, transcriptFor,
} from "./data";

export class MockError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type PRec = { project: Project; assets: (Asset & { _t: number })[]; generations: (Generation & { _t: number; _title: string })[]; exports: (Render & { _t: number })[]; reference: (Reference & { _t: number }) | null; reviewed: boolean };
type PortalRec = { id: string; token: string; business_id: string; name: string; client_name: string; client_email: string; state: PortalState; events: PortalEvent[]; seen: { agency: number; client: number }; updated_at: number };
type DB = {
  v: 1; projects: Record<string, PRec>; businesses: Business[]; portals: PortalRec[]; brands: Record<string, Brand>; memory: Record<string, { lessons: string[]; feedback: number }>;
  editor: { editor: string; name: string; live: boolean; connected_at: number } | null; mail: Record<string, unknown>;
};

const KEY = "reel.mock.v1";
const now = () => Math.floor(Date.now() / 1000);
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 11)}`;
const clone = <T,>(x: T): T => structuredClone(x);
const wait = (ms = 120) => new Promise(r => setTimeout(r, ms));

function seed(): DB {
  const plan = samplePlan();
  const bid = "biz_demo";
  const t = now();
  const done = id("prj");
  const fresh: PRec = { project: project("prj_demo_new", "Making 200 croissants before sunrise", bid, plan.ideas[0].id), assets: [], generations: [], exports: [], reference: null, reviewed: false };
  const finished = recordWithEdit(done, "Spring menu reveal", bid);
  const portal = newPortal("por_demo", "demo-client", bid, "Lina's Bakery", "Lina", "lina@example.com", "strategy");
  portal.state.brief = "approved"; portal.state.strategy = "sent";
  portal.events.push(ev("client", "brief", "submitted_brief", "Lina sent the brief."), ev("agency", "strategy", "sent_strategy", "Your content plan is ready for approval."));
  return {
    v: 1, projects: { [fresh.project.id]: fresh, [done]: finished },
    businesses: [{ id: bid, updated_at: t, plan }], portals: [portal], brands: {}, memory: { [bid]: { lessons: ["Music quiet under speech", "Always end on the shop front"], feedback: 2 } },
    editor: null, mail: { host: "", port: 587, username: "", sender: "", agency_email: "", public_url: "" },
  };
}

function recordWithEdit(pid: string, name: string, bid: string): PRec {
  const t = now() - 3600;
  const rec: PRec = { project: project(pid, name, bid, ""), assets: [], generations: [], exports: [], reference: null, reviewed: true };
  rec.project.created_at = t - 600; rec.project.updated_at = t;
  const a = makeAsset("main", "spring-menu.mp4"); a._t = 0; rec.assets.push(a as Asset & { _t: number });
  const g = makeGeneration(rec, rec.project.settings); g._t = 0; rec.generations.push(g);
  const e = makeExport(g.plan!.id, "1080p"); e._t = 0; rec.exports.push(e);
  return rec;
}

function project(pid: string, name: string, bid: string, ideaId: string): Project {
  const settings = baseSettings();
  settings.agency = { business_id: bid, idea_id: ideaId, filming: "", filming_dates: "", filming_location: "", filming_notes: "", shot_plan: null, completed: false };
  return { id: pid, name, created_at: now(), updated_at: now(), settings, asset_counts: {}, cover_url: null, has_export: false };
}

let db: DB = (() => {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw) as DB; if (d.v === 1) return d; } } catch { /* start fresh */ }
  return seed();
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ } };
save();
export function resetMock() { localStorage.removeItem(KEY); localStorage.removeItem("reel.token"); }

// ── assets ──
const PROCESS_MS = 3000;
const stages = ["Reading media", "Making thumbnails", "Finding the speaker", "Transcribing", "Aligning words"];

function makeAsset(kind: AssetKind, filename: string, size = 24_000_000): Asset & { _t: number } {
  const visual = kind === "main" || kind === "broll" || kind === "image" || kind === "logo";
  return {
    id: id("ast"), kind, filename, size, status: "queued", stage: null, progress: 0, error: null,
    duration: kind === "image" || kind === "logo" ? null : kind === "music" ? 96 : kind === "sfx" ? 2 : 38 + (hueOf(filename) % 40),
    width: visual ? (kind === "main" ? 1080 : 1920) : null, height: visual ? (kind === "main" ? 1920 : 1080) : null,
    has_audio: kind === "image" || kind === "logo" ? false : true, thumb_url: visual ? tile(filename, hueOf(filename)) : null,
    speaker_found: kind === "main" ? true : null, transcript: null, detection: null, _t: Date.now(),
  };
}

function viewAsset(a: Asset & { _t: number }): Asset {
  const { _t, ...rest } = a;
  const elapsed = Date.now() - _t;
  if (elapsed >= PROCESS_MS || _t === 0) {
    return { ...rest, status: "ready", stage: null, progress: 1, transcript: a.kind === "main" ? transcriptFor(a.filename) : null };
  }
  const frac = elapsed / PROCESS_MS;
  return { ...rest, status: "processing", stage: stages[Math.min(stages.length - 1, Math.floor(frac * stages.length))], progress: (frac * stages.length) % 1 };
}

// ── generations and exports ──
const STAGES: Exclude<Generation["stage"], "done">[] = ["analyzing", "transcribing", "planning", "preview"];
const GEN_MS = 8000;
const EXPORT_MS = 5000;

function planFor(rec: PRec, settings: Settings): PlanSummary {
  const brief = settings.brief;
  const title = (brief?.about && brief.about.split(/[.!?]/)[0].slice(0, 60)) || rec.project.name;
  const mains = rec.assets.filter(a => a.kind === "main");
  const source = mains.reduce((t, a) => t + (a.duration ?? 0), 0) || 60;
  const out = Math.round(Math.min(settings.duration, source * 0.8));
  const aspect = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] }[settings.aspect];
  return {
    id: id("pln"), title, width: aspect[0], height: aspect[1], duration_seconds: out,
    summary: `A ${out}-second ${settings.style.replace(/_/g, " ")} edit. It opens on the strongest line, removes the dead air and stumbles, adds captions and zooms on the key moments, and ends on a clear call to action.`,
    used_assets: rec.assets.map(a => ({ id: a.id, filename: a.filename, kind: a.kind })),
    stats: { fillers_removed: 14, pauses_removed: 9, cuts: 18, punch_ins: settings.zooms ? 6 : 0, broll: settings.broll ? 4 : 0, sfx: settings.sfx ? 7 : 0, caption_pages: settings.captions.enabled ? 31 : 0,
      music: settings.music, logo: settings.logo.enabled, graphics: settings.motion_graphics ? 3 : 0, output_seconds: out, warnings: [] },
  };
}

function makeGeneration(rec: PRec, settings: Settings): Generation & { _t: number; _title: string } {
  const plan = planFor(rec, settings);
  return {
    id: id("gen"), status: "queued", stage: "analyzing", progress: 0, message: null, error: null, plan, settings: clone(settings), created_at: now(), _t: Date.now(), _title: plan.title,
    preview: { id: id("rnd"), plan_id: plan.id, quality: "preview", status: "queued", progress: 0, error: null, video_url: null, download_url: null },
  };
}

function viewGeneration(g: Generation & { _t: number }): Generation {
  const { _t, ...rest } = g;
  const frac = _t === 0 ? 1 : (Date.now() - _t) / GEN_MS;
  const preview = (progress: number, done: boolean): Render => ({ ...rest.preview!, status: done ? "done" : progress > 0 ? "running" : "queued", progress, video_url: done ? SAMPLE_VIDEO : null, download_url: done ? SAMPLE_VIDEO : null, size: 2_400_000 });
  if (frac >= 1) return { ...rest, status: "done", stage: "done", progress: 1, plan: rest.plan, preview: preview(1, true) };
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(frac * STAGES.length))];
  const messages = { analyzing: "Watching your footage…", transcribing: "Reading the transcript…", planning: "Deciding the cuts…", preview: "Rendering the preview…" };
  return { ...rest, status: "running", stage, progress: frac, message: messages[stage], plan: stage === "preview" ? rest.plan : null, preview: preview(stage === "preview" ? (frac - 0.75) * 4 : 0, false) };
}

function makeExport(planId: string, resolution: string): Render & { _t: number } {
  return { id: id("rnd"), plan_id: planId, quality: "final", resolution, status: "queued", progress: 0, error: null, video_url: null, download_url: null, saved_to: null, _t: Date.now() };
}

function viewExport(e: Render & { _t: number }): Render {
  const { _t, ...rest } = e;
  const frac = _t === 0 ? 1 : (Date.now() - _t) / EXPORT_MS;
  if (frac >= 1) return { ...rest, status: "done", progress: 1, video_url: SAMPLE_VIDEO, download_url: SAMPLE_VIDEO, size: 8_800_000, saved_to: "~/Reel/exports/reel-edit.mp4" };
  return { ...rest, status: "running", progress: frac };
}

function viewProject(rec: PRec): Project {
  const counts: Project["asset_counts"] = {};
  for (const a of rec.assets) counts[a.kind] = (counts[a.kind] ?? 0) + 1;
  const first = rec.assets.find(a => a.thumb_url);
  const exp = rec.exports.length ? viewExport(rec.exports[rec.exports.length - 1]) : null;
  return { ...rec.project, asset_counts: counts, cover_url: first?.thumb_url ?? null, has_export: exp?.status === "done" };
}

function state(rec: PRec): ProjectState {
  const g = rec.generations[rec.generations.length - 1];
  const e = rec.exports[rec.exports.length - 1];
  return {
    project: viewProject(rec), assets: rec.assets.map(viewAsset), media_review_running: false,
    generation: g ? viewGeneration(g) : null, export: e ? viewExport(e) : null, reference: rec.reference ? viewReference(rec.reference) : null,
  };
}

function viewReference(r: Reference & { _t: number }): Reference {
  const { _t, ...rest } = r;
  const frac = (Date.now() - _t) / 4000;
  if (frac < 1) return { ...rest, status: "processing", stage: "Studying the style", progress: frac };
  return { ...rest, status: "ready", stage: null, progress: 1, duration: 28, style: {
    summary: "Fast, bright and punchy: jump cuts every 2 seconds, bold captions and a driving beat.", pacing: "Very fast", cuts: "Jump cuts on every beat", transitions: "Whip pans and flashes",
    motion_graphics: "Animated callouts for key numbers", music: "Upbeat electronic, loud", sound_effects: "Whooshes on transitions", color_grading: "Vivid and saturated", broll: "Quick inserts of the product",
    captions: "Large uppercase, one to three words at a time", techniques: ["Hook in the first second", "Punch-in on emphasis", "Beat-synced cuts"],
    present: ["pacing", "cuts", "transitions", "music", "captions"] } };
}

function storyboard(rec: PRec, planId: string): Storyboard {
  const g = rec.generations.find(x => x.plan?.id === planId) ?? rec.generations[rec.generations.length - 1];
  const clip = rec.assets.find(a => a.kind === "main")?.filename ?? "clip.mp4";
  const words = ["So this is where it all starts.", "Everything is made fresh, by hand.", "That's the secret nobody talks about.", "You can taste the difference.", "Come and see for yourself."];
  const dur = g?.plan?.duration_seconds ?? 30;
  const step = dur / words.length;
  return { music: "Warm acoustic", duration: dur, approved_at: null, panels: words.map((w, i) => ({
    index: i, start: i * step, end: (i + 1) * step, clip, source: [i * 9, i * 9 + step], transition: i ? ["cut", "zoom", "fade"][i % 3] : "cut", words: w,
    broll: i === 2 ? "close-up-hands.mp4" : "", graphics: i === 0 ? ["Hook title"] : i === 4 ? ["End card"] : [], text: i === 0 ? [g?.plan?.title ?? ""] : [], zoom: i % 2 === 1, frame_url: tile(`Scene ${i + 1}`, 250 + i * 25) })) };
}

// ── businesses ──
const touch = (b: Business) => { b.updated_at = now(); };
const business = (bid: string) => db.businesses.find(b => b.id === bid) ?? (() => { throw new MockError(404, "Client not found."); })();

function suggest(b: Business, body: { kind: string; plan: BusinessPlan }) {
  const plan = body.plan;
  if (body.kind === "strategy") {
    const name = plan.name || "your business";
    return { strategy: { summary: `Show the people and the craft behind ${name}. Post short, honest, behind-the-scenes videos three times a week, and let the owner's voice carry the trust.`,
      platforms: plan.platforms.length ? plan.platforms : ["Instagram", "TikTok"], posts_per_week: 3, posting_days: ["Tue", "Thu", "Sat"], pillars: ["Behind the scenes", "Customer stories", "Tips & how-tos"], voice: ["Friendly", "Entertaining"] } };
  }
  if (body.kind === "ideas") return { ideas: newIdeas(plan.name) };
  return { scores: plan.ideas.filter(i => !i.fit).map(i => ({ id: i.id, fit: 4, hook_score: 3 + (hueOf(i.title) % 3), effort: 3 + (hueOf(i.id) % 3), verdict: "Fits your goals; sharpen the first line to stop the scroll." })) };
}

// ── portals ──
function ev(actor: "agency" | "client", stage: PortalEvent["stage"], kind: string, text: string, target = ""): PortalEvent {
  return { id: id("evt"), at: now(), actor, kind, stage, target, text };
}

function newPortal(pid: string, token: string, bid: string, name: string, clientName: string, email: string, stage: PortalState["stage"] = "brief"): PortalRec {
  return { id: pid, token, business_id: bid, name, client_name: clientName, client_email: email, events: [], seen: { agency: 0, client: 0 }, updated_at: now(),
    state: { client_name: clientName, client_email: email, stage, brief: "open", strategy: "draft", filming: "draft", film_slots: [], film_choice: "", film_choices: [], deliveries: [] } };
}

function turn(p: PortalRec): Turn {
  const s = p.state;
  const t = (who: "agency" | "client", what: string, waiting?: string): Turn => ({ who, what, waiting });
  switch (s.stage) {
    case "brief": return s.brief === "submitted" ? t("agency", "Review the brief", "We're reading your brief.") : t("client", "Fill in the brief");
    case "strategy": return s.strategy === "sent" ? t("client", "Approve the content plan") : t("agency", s.strategy === "changes" ? "Update the plan" : "Write the content plan", "We're writing your plan.");
    case "filming": return s.filming === "proposed" ? t("client", "Pick a filming date") : t("agency", s.filming === "booked" ? "Film the video" : "Propose filming dates", "We're finding a date.");
    default: return s.deliveries.some(d => d.status === "sent") ? t("client", "Approve your videos") : t("agency", s.deliveries.length ? "Revise the video" : "Edit and send the first video", "We're editing your videos.");
  }
}

function viewPortal(p: PortalRec, role: "agency" | "client"): Portal {
  const b = business(p.business_id);
  const other = role === "agency" ? "client" : "agency";
  return {
    id: p.id, business_id: p.business_id, role, state: clone({ ...p.state, client_name: p.client_name, client_email: p.client_email }), turn: turn(p), plan: clone(b.plan),
    events: clone(p.events), unread: p.events.filter(e => e.actor === other && e.at > p.seen[role]).length, seen: p.seen[role], updated_at: p.updated_at,
    link: role === "agency" ? `${location.href.split("#")[0]}#/c/${p.token}` : undefined, mail_ready: false,
  };
}

function summary(p: PortalRec) {
  const last = p.events[p.events.length - 1] ?? null;
  return { id: p.id, business_id: p.business_id, name: p.name, client_name: p.client_name, client_email: p.client_email, stage: p.state.stage, turn: turn(p),
    unread: p.events.filter(e => e.actor === "client" && e.at > p.seen.agency).length, last_event: last, updated_at: p.updated_at };
}

const portalOf = (key: string, by: "id" | "token") => db.portals.find(p => p[by] === key) ?? (() => { throw new MockError(404, "This link isn't valid any more."); })();

function act(p: PortalRec, role: "agency" | "client", body: { action: string; text?: string; target?: string; slots?: PortalState["film_slots"]; choices?: string[]; delivery?: Partial<Delivery> }) {
  const s = p.state;
  const log = (stage: PortalEvent["stage"], kind: string, text: string, target = "") => p.events.push(ev(role, stage, kind, body.text ? `${text} “${body.text}”` : text, target));
  switch (body.action) {
    case "submit_brief": s.brief = "submitted"; log("brief", "submitted_brief", "Sent the brief."); break;
    case "approve_brief": s.brief = "approved"; s.stage = "strategy"; log("brief", "approved_brief", "Approved the brief."); break;
    case "request_brief_changes": s.brief = "changes"; log("brief", "brief_changes", "Asked for changes to the brief."); break;
    case "send_strategy": s.strategy = "sent"; log("strategy", "sent_strategy", "Sent the content plan."); break;
    case "approve_strategy": s.strategy = "approved"; s.stage = "filming"; log("strategy", "approved_strategy", "Approved the content plan."); break;
    case "request_strategy_changes": s.strategy = "changes"; log("strategy", "strategy_changes", "Asked for changes to the plan."); break;
    case "propose_dates": s.film_slots = body.slots ?? []; s.filming = "proposed"; log("filming", "proposed_dates", "Proposed filming dates."); break;
    case "pick_slot": s.film_choice = body.target ?? ""; s.filming = "booked"; log("filming", "picked_date", "Picked a filming date.", s.film_choice); break;
    case "request_other_dates": s.filming = "changes"; s.film_choices = body.choices ?? []; log("filming", "other_dates", "Asked for other dates."); break;
    case "mark_filmed": s.filming = "filmed"; s.stage = "delivery"; log("filming", "filmed", "Filming is done."); break;
    case "set_stage": s.stage = (body.target as PortalState["stage"]) ?? s.stage; break;
    case "deliver": {
      const d = body.delivery ?? {};
      const existing = d.id ? s.deliveries.find(x => x.id === d.id) : undefined;
      if (existing) Object.assign(existing, d, { status: "sent", version: existing.version + 1, sent_at: now() });
      else s.deliveries.push({ id: id("dlv"), title: d.title ?? "Video", idea_id: d.idea_id ?? "", render_id: d.render_id ?? "", file: d.file ?? "", url: d.url ?? "", post_date: d.post_date ?? "", platform: d.platform ?? "",
        caption: d.caption ?? "", status: "sent", version: 1, sent_at: now(), video_url: SAMPLE_VIDEO, download_url: SAMPLE_VIDEO });
      log("delivery", "delivered", `Sent “${d.title ?? "a video"}”.`); break;
    }
    case "approve_video": case "request_video_changes": {
      const d = s.deliveries.find(x => x.id === body.target);
      if (d) d.status = body.action === "approve_video" ? "approved" : "changes";
      if (body.action === "request_video_changes") { const m = (db.memory[p.business_id] ??= { lessons: [], feedback: 0 }); m.feedback++; }
      log("delivery", body.action, body.action === "approve_video" ? `Approved “${d?.title}”.` : `Asked for changes to “${d?.title}”.`, body.target); break;
    }
    case "comment": log(s.stage, "comment", "Commented:"); break;
    default: throw new MockError(400, "That isn't available in the demo.");
  }
  p.updated_at = now();
}

// ── routing ──
type Ctx = { method: string; path: string; query: URLSearchParams; json: any; m: RegExpMatchArray };
const routes: [string, RegExp, (c: Ctx) => unknown][] = [];
const on = (method: string, re: string, fn: (c: Ctx) => unknown) => routes.push([method, new RegExp(`^${re}$`), fn]);
const proj = (pid: string) => db.projects[pid] ?? (() => { throw new MockError(404, "Project not found."); })();
const touchProject = (r: PRec) => { r.project.updated_at = now(); };

on("GET", "/api/auth/me", () => ({ user: DEMO_USER }));
on("POST", "/api/auth/logout", () => ({}));
on("POST", "/api/auth/login", () => ({ token: "demo-token", user: DEMO_USER }));
on("GET", "/api/auth/options", () => ({ claude_code: { installed: true, logged_in: true, subscription: true, plan: "max", email: "demo@reel.app", local: true, problem: null }, signin_command: "claude auth login" }));
on("GET", "/api/presets", () => presets());
on("GET", "/api/claude/usage", () => ({ connection: DEMO_USER, plan: "max",
  subscription_limits: { available: true, observed_at: now(), windows: [{ label: "Current session", percent: 18, resets: "in 3 h" }, { label: "Weekly", percent: 41, resets: "in 4 d" }] },
  app_usage: { last_5_hours: { calls: 6, input_tokens: 42_000, output_tokens: 9_500, cache_read_tokens: 120_000, cache_write_tokens: 18_000 }, last_7_days: { calls: 51, input_tokens: 390_000, output_tokens: 71_000, cache_read_tokens: 980_000, cache_write_tokens: 140_000 } } }));

// projects
on("GET", "/api/projects", () => ({ projects: Object.values(db.projects).map(viewProject).sort((a, b) => b.updated_at - a.updated_at) }));
on("POST", "/api/projects", ({ json }) => {
  const pid = id("prj");
  const bid = json.business_id === "none" ? "" : json.business_id || db.businesses[0]?.id || "";
  const rec: PRec = { project: project(pid, (json.name ?? "Untitled edit").trim() || "Untitled edit", bid, json.idea_id ?? ""), assets: [], generations: [], exports: [], reference: null, reviewed: false };
  if (!bid) rec.project.settings.agency = { ...rec.project.settings.agency!, business_id: "" };
  db.projects[pid] = rec;
  if (bid && json.idea_id) for (const s of business(bid).plan.calendar) if (s.idea_id === json.idea_id && !s.project_id) s.project_id = pid;
  return { project: viewProject(rec) };
});
on("GET", "/api/projects/([^/]+)", ({ m }) => state(proj(m[1])));
on("DELETE", "/api/projects/([^/]+)", ({ m }) => { delete db.projects[m[1]]; return {}; });
on("PUT", "/api/projects/([^/]+)/settings", ({ m, json }) => { const r = proj(m[1]); r.project.settings = json; touchProject(r); return { settings: json }; });
on("PUT", "/api/projects/([^/]+)/client", ({ m, json }) => {
  const r = proj(m[1]);
  r.project.settings.agency = { ...(r.project.settings.agency ?? { filming: "", filming_dates: "", filming_location: "", filming_notes: "", shot_plan: null, completed: true }), business_id: json.business_id, idea_id: json.idea_id } as Settings["agency"];
  return { project: viewProject(r) };
});
on("GET", "/api/projects/([^/]+)/past-edits", ({ m }) => ({ edits: Object.values(db.projects).filter(r => r.project.id !== m[1] && r.exports.length).map(r => ({
  id: r.project.id, name: r.project.name, title: r.generations[0]?.plan?.title ?? r.project.name, summary: r.generations[0]?.plan?.summary ?? "", style: r.project.settings.style, aspect: r.project.settings.aspect,
  seconds: r.generations[0]?.plan?.duration_seconds ?? null, client: business(r.project.settings.agency?.business_id || db.businesses[0].id)?.plan.name ?? "", cover_url: r.assets[0]?.thumb_url ?? null, has_export: true, edited_at: r.project.updated_at })) }));
on("POST", "/api/projects/([^/]+)/media-review", ({ m }) => {
  const r = proj(m[1]);
  r.reviewed = true;
  return { assets: r.assets.map(a => { a.detection = { kind: a.kind, use: true, reason: a.kind === "main" ? "Speaker to camera: the main footage." : "Looks usable." }; return { asset_id: a.id, kind: a.kind, use: true, reason: a.detection.reason }; }) };
});
on("POST", "/api/projects/([^/]+)/shot-plan", ({ m }) => { const r = proj(m[1]); return { shot_plan: shotPlan(r.project.name) }; });
on("POST", "/api/projects/([^/]+)/generations", ({ m, json }) => {
  const r = proj(m[1]);
  r.project.settings = json.settings;
  r.generations.push(makeGeneration(r, json.settings));
  touchProject(r);
  return { generation: viewGeneration(r.generations[r.generations.length - 1]) };
});
on("POST", "/api/projects/([^/]+)/exports", ({ m, json }) => { const r = proj(m[1]); r.exports.push(makeExport(json.plan_id, json.resolution)); touchProject(r); return { render: viewExport(r.exports[r.exports.length - 1]) }; });
on("GET", "/api/plans/([^/]+)/storyboard", ({ m }) => { const r = Object.values(db.projects).find(x => x.generations.some(g => g.plan?.id === m[1])); return { storyboard: storyboard(r ?? Object.values(db.projects)[0], m[1]) }; });
on("POST", "/api/plans/([^/]+)/storyboard/approve", ({ m, json }) => { const r = Object.values(db.projects).find(x => x.generations.some(g => g.plan?.id === m[1])) ?? Object.values(db.projects)[0]; const sb = storyboard(r, m[1]); sb.approved_at = json.approved ? now() : null; return { storyboard: sb }; });
on("POST", "/api/plans/([^/]+)/handoff", () => ({ editor: db.editor?.editor ?? "resolve", name: db.editor?.name ?? "DaVinci Resolve", method: "file", message: "Demo: in the real app this opens your edit as a new timeline.", folder: "~/Reel/exports", downloads: {} }));

// assets
on("DELETE", "/api/assets/([^/]+)", ({ m }) => { for (const r of Object.values(db.projects)) r.assets = r.assets.filter(a => a.id !== m[1]); return {}; });
on("POST", "/api/assets/([^/]+)/reanalyze", ({ m }) => { for (const r of Object.values(db.projects)) for (const a of r.assets) if (a.id === m[1]) { a._t = Date.now(); a.detection = null; } return {}; });

// reference
on("POST", "/api/projects/([^/]+)/reference/link", ({ m, json }) => {
  const r = proj(m[1]);
  r.reference = { id: id("ref"), filename: json.url, size: 0, status: "queued", stage: null, progress: 0, error: null, duration: null, thumb_url: tile("Reference", 20), measurements: null, style: null, _t: Date.now() };
  return { reference: viewReference(r.reference) };
});
on("POST", "/api/projects/([^/]+)/reference/analyze", () => ({}));
on("DELETE", "/api/projects/([^/]+)/reference", ({ m }) => { proj(m[1]).reference = null; return {}; });

// footage folders (need a real computer)
const noFolders = () => { throw new MockError(400, "Linking folders on your computer needs the real app. In this demo, upload files instead."); };
on("POST", "/api/footage-folder/choose", () => ({ path: null }));
on("POST", "/api/projects/([^/]+)/footage-folder", noFolders);
on("DELETE", "/api/projects/([^/]+)/footage-folder", () => ({}));
on("POST", "/api/projects/([^/]+)/client-footage", noFolders);
on("POST", "/api/businesses/([^/]+)/folder", () => ({}));
on("POST", "/api/businesses/([^/]+)/folder/open", () => { throw new MockError(400, "Opening folders needs the real app."); });

// editors
const editorList = [{ id: "resolve", name: "DaVinci Resolve", installed: true, app: "DaVinci Resolve" }, { id: "fcp", name: "Final Cut Pro", installed: true, app: "Final Cut Pro" }, { id: "premiere", name: "Adobe Premiere Pro", installed: true, app: "Adobe Premiere Pro" }];
on("GET", "/api/editors", () => ({ editors: editorList, connection: db.editor }));
on("POST", "/api/editors/connect", ({ json }) => {
  const e = editorList.find(x => x.id === json.editor)!;
  db.editor = { editor: e.id, name: e.name, live: false, connected_at: now() };
  return { connection: db.editor, check: { installed: true, live: false, message: `${e.name} is set up (demo).` } };
});
on("DELETE", "/api/editors/connect", () => { db.editor = null; return {}; });

// businesses
on("GET", "/api/businesses", () => ({ businesses: clone(db.businesses).sort((a, b) => b.updated_at - a.updated_at) }));
on("POST", "/api/businesses", ({ json }) => { const b: Business = { id: id("biz"), updated_at: now(), plan: json }; db.businesses.unshift(b); return { business: clone(b) }; });
on("GET", "/api/businesses/([^/]+)", ({ m }) => ({ business: clone(business(m[1])) }));
on("PUT", "/api/businesses/([^/]+)", ({ m, json }) => { const b = business(m[1]); b.plan = json; touch(b); return { business: clone(b) }; });
on("POST", "/api/businesses/([^/]+)/suggest", ({ m, json }) => suggest(business(m[1]), json));
on("POST", "/api/businesses/([^/]+)/shot-list", ({ m, json }) => { const b = business(m[1]); const i = json.plan.ideas.find((x: { id: string }) => x.id === json.idea_id); const sp = shotPlan(i?.title ?? "this idea"); const idea = b.plan.ideas.find(x => x.id === json.idea_id); if (idea) idea.shots = sp; return { shot_plan: sp }; });
on("GET", "/api/businesses/([^/]+)/memory", ({ m }) => db.memory[m[1]] ?? { lessons: [], feedback: 0 });
on("PUT", "/api/businesses/([^/]+)/memory", ({ m, json }) => (db.memory[m[1]] = { lessons: json.lessons, feedback: db.memory[m[1]]?.feedback ?? 0 }));
on("GET", "/api/businesses/([^/]+)/brand", ({ m }) => ({ brand: clone(db.brands[m[1]] ??= emptyBrand(m[1])) }));
on("POST", "/api/businesses/([^/]+)/brand/study", ({ m }) => { const b = (db.brands[m[1]] ??= emptyBrand(m[1])); b.status = "draft"; b.sheet = sampleSheet(business(m[1]).plan.name); return { brand: clone(b) }; });
on("PUT", "/api/businesses/([^/]+)/brand", ({ m, json }) => { const b = (db.brands[m[1]] ??= emptyBrand(m[1])); b.sheet = json; if (b.status === "none") b.status = "draft"; return { brand: clone(b) }; });
on("POST", "/api/businesses/([^/]+)/brand/approve", ({ m, json }) => { const b = (db.brands[m[1]] ??= emptyBrand(m[1])); b.status = json.approved ? "approved" : "draft"; b.approved_at = json.approved ? now() : null; return { brand: clone(b) }; });

// portals (agency side)
on("GET", "/api/portals", () => ({ portals: db.portals.map(summary), mail_ready: false }));
on("POST", "/api/portals", ({ json }) => {
  let bid = json.business_id;
  if (!bid) { const plan = { ...samplePlan(), name: json.name || "New client", ideas: [], calendar: [], goals: [], platforms: [], pillars: [], voice: [], strategy_summary: "" }; const b: Business = { id: id("biz"), updated_at: now(), plan }; db.businesses.unshift(b); bid = b.id; }
  const p = newPortal(id("por"), id("tok"), bid, business(bid).plan.name, json.client_name ?? "", json.client_email ?? "");
  db.portals.push(p);
  return { portal: viewPortal(p, "agency") };
});
on("GET", "/api/portals/([^/]+)", ({ m, query }) => { const p = portalOf(m[1], "id"); if (!query.get("peek")) p.seen.agency = now() + 1; return { portal: viewPortal(p, "agency") }; });
on("POST", "/api/portals/([^/]+)/action", ({ m, json }) => { const p = portalOf(m[1], "id"); act(p, "agency", json); return { portal: viewPortal(p, "agency") }; });
on("PATCH", "/api/portals/([^/]+)", ({ m, json }) => { const p = portalOf(m[1], "id"); p.client_name = json.client_name ?? p.client_name; p.client_email = json.client_email ?? p.client_email; return {}; });
on("DELETE", "/api/portals/([^/]+)", ({ m }) => { db.portals = db.portals.filter(p => p.id !== m[1]); return {}; });
on("POST", "/api/portals/([^/]+)/new-link", ({ m }) => { portalOf(m[1], "id").token = id("tok"); return {}; });
on("GET", "/api/portals/([^/]+)/exports", ({ m }) => {
  const p = portalOf(m[1], "id");
  return { exports: Object.values(db.projects).filter(r => r.exports.length && (r.project.settings.agency?.business_id ?? "") === p.business_id)
    .map(r => ({ render_id: r.exports[r.exports.length - 1].id, name: r.project.name, idea_id: r.project.settings.agency?.idea_id ?? "", ours: true, created_at: r.project.updated_at })) };
});
on("GET", "/api/portal-settings", () => ({ settings: db.mail, ready: false, default_url: location.href.split("#")[0] }));
on("PUT", "/api/portal-settings", ({ json }) => { db.mail = { ...json, password: undefined }; return { settings: db.mail, ready: false, default_url: location.href.split("#")[0] }; });
on("POST", "/api/portal-settings/test", () => { throw new MockError(400, "Emails aren't sent from the demo."); });
// portals (client side, by private link)
on("GET", "/api/portal/([^/]+)", ({ m, query }) => { const p = portalOf(m[1], "token"); if (!query.get("peek")) p.seen.client = now() + 1; return { portal: viewPortal(p, "client") }; });
on("POST", "/api/portal/([^/]+)/action", ({ m, json }) => { const p = portalOf(m[1], "token"); act(p, "client", json); return { portal: viewPortal(p, "client") }; });
on("PUT", "/api/portal/([^/]+)/brief", ({ m, json }) => { const p = portalOf(m[1], "token"); const b = business(p.business_id); b.plan = { ...b.plan, ...json }; touch(b); return {}; });

export async function mockApi<T>(method: string, rawPath: string, json?: unknown): Promise<T> {
  await wait();
  const url = new URL(rawPath, "http://x");
  for (const [m, re, fn] of routes) {
    if (m !== method) continue;
    const match = url.pathname.match(re);
    if (!match) continue;
    const out = fn({ method, path: url.pathname, query: url.searchParams, json, m: match });
    save();
    return clone(out) as T;
  }
  throw new MockError(404, "That isn't available in the demo.");
}

/** Pretends to upload a file: reports progress for a moment, then adds a processed asset. */
export function mockUpload(projectId: string, kind: AssetKind, file: File, onProgress: (p: number) => void, filename: string): { promise: Promise<Asset>; abort: () => void } {
  let cancelled = false;
  let timer = 0;
  const promise = new Promise<Asset>((resolve, reject) => {
    let p = 0;
    timer = window.setInterval(() => {
      if (cancelled) { window.clearInterval(timer); return reject(new MockError(0, "Upload cancelled.")); }
      p = Math.min(1, p + 0.25);
      onProgress(p);
      if (p < 1) return;
      window.clearInterval(timer);
      const rec = proj(projectId);
      const a = makeAsset(kind, filename, file.size);
      rec.assets.push(a);
      rec.reviewed = false;
      touchProject(rec);
      save();
      resolve(viewAsset(a));
    }, 120);
  });
  return { promise, abort: () => { cancelled = true; } };
}

export function mockUploadReference(projectId: string, file: File, onProgress: (p: number) => void): Promise<Reference> {
  return new Promise(resolve => {
    let p = 0;
    const timer = window.setInterval(() => {
      p = Math.min(1, p + 0.25);
      onProgress(p);
      if (p < 1) return;
      window.clearInterval(timer);
      const rec = proj(projectId);
      rec.reference = { id: id("ref"), filename: file.name, size: file.size, status: "queued", stage: null, progress: 0, error: null, duration: null, thumb_url: tile(file.name, 20), measurements: null, style: null, _t: Date.now() };
      save();
      resolve(viewReference(rec.reference));
    }, 120);
  });
}

export function mockUploadPortalVideo(file: File, onProgress: (p: number) => void): Promise<{ file: string; filename: string }> {
  return new Promise(resolve => {
    let p = 0;
    const timer = window.setInterval(() => {
      p = Math.min(1, p + 0.25);
      onProgress(p);
      if (p >= 1) { window.clearInterval(timer); resolve({ file: file.name, filename: file.name }); }
    }, 120);
  });
}
