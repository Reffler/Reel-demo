import { For, Index, Match, Show, Switch, createEffect, createMemo, createResource, createSignal, on } from "solid-js";
import { StepBar, enterStep } from "./StepBar";
import { Portal } from "solid-js/web";
import { A } from "@solidjs/router";
import { api, type Asset, type Brief, type Generation, type PastEdit, type Reference, type ReferenceStyle, type Settings } from "../api";
import { type Uploading } from "./UploadStep";
import { ReferencePanel } from "./ReferencePanel";
import { Button, Toggle } from "../ui/kit";
import { SubtitleDesigner, subtitlePresets } from "./SubtitleDesigner";
import { SubMenu } from "./SubMenu";
import { FootageSource } from "./FootageSource";
import { mediaReadiness, type MediaActivity } from "../mediaReadiness";
import { briefToSettings } from "../briefSettings";
import { referenceUpload } from "../referenceUpload";
import { ReviewCards } from "./ReviewCards";
import { IconArrowLeft, IconArrowRight, IconCaptions, IconChat, IconFilm, IconFolder, IconFrame, IconLayers, IconPlus, IconSliders, IconSpark, IconStory, IconWand } from "../ui/icons";

// The questions asked before the editor, from "Evaluating the perfect video for the customer".
// Answers are saved as `settings.brief`. "Create video" on the Review step turns them into the
// edit settings and starts the edit; Claude also gets the answers in its brief.

type Question = "scope" | "parts" | "video" | "format" | "files" | "specify" | "create";

// A full edit asks about the video first (with its format), then the footage, then the details.
// A reference video is optional, so it is one section of "Make it personal" rather than a step.
const flows: Record<"whole" | "part", { id: Question; label: string }[]> = {
  whole: [
    { id: "scope", label: "What to create" }, { id: "video", label: "Your video" }, { id: "files", label: "Footage" },
    { id: "specify", label: "Make it personal" }, { id: "create", label: "Review" },
  ],
  part: [
    { id: "scope", label: "What to create" }, { id: "parts", label: "Focus" }, { id: "format", label: "Format" },
    { id: "files", label: "Footage" }, { id: "specify", label: "Make it personal" }, { id: "create", label: "Review" },
  ],
};

const titles: Record<Question, string> = {
  scope: "What should we make?",
  parts: "What should we work on?",
  video: "Tell us about your video",
  format: "Choose a format",
  files: "Add your footage",
  specify: "Make it personal",
  create: "Review your brief",
};

const intros: Partial<Record<Question, string>> = {
  files: "Select the folder with your footage, images, logos and music, or upload it. You can add more later.",
  video: "What it’s about, how long it should be, how it should feel, and where it will be posted.",
  specify: "All optional. Anything you leave open, Claude decides.",
};

const parts: { id: string; label: string; hint: string; placeholder: string; ref?: keyof ReferenceStyle; tweak?: string }[] = [
  { id: "rough_cut", label: "Cutting", hint: "What stays, and the pace", ref: "cuts", tweak: "the same rhythm, but a bit slower", placeholder: "How should the cut be? E.g. remove pauses and mistakes, keep it under a minute, start with the product shot." },
  { id: "subtitles", label: "Subtitles", hint: "Words on screen", ref: "captions", tweak: "same style, but in our brand color", placeholder: "Anything else about the subtitles? E.g. highlight key words, translate to German." },
  { id: "motion_graphics", label: "Animated text", hint: "Titles, callouts and graphics", ref: "motion_graphics", tweak: "fewer graphics, only on key numbers", placeholder: "Where should motion graphics appear, and what should they show? E.g. animated title at the start, price callout at 0:30." },
  { id: "transitions", label: "Transitions", hint: "Between shots and scenes", ref: "transitions", tweak: "same whip pans, only between topics", placeholder: "Which transitions, and where? E.g. quick whip pans between scenes, no effects inside a scene." },
  { id: "sound", label: "Sound effects", hint: "Whooshes and a clean mix", ref: "sound_effects", tweak: "the same whooshes, but quieter", placeholder: "What should it sound like? E.g. subtle whooshes on transitions, clean up background noise." },
  { id: "music", label: "Music", hint: "Soundtrack and mood", ref: "music", tweak: "similar mood, but no lyrics", placeholder: "What mood or track? E.g. upbeat lo-fi, quieter while someone talks." },
  { id: "color", label: "Colors and look", hint: "Warm, cool, bright or moody", ref: "color_grading", tweak: "same look, slightly warmer", placeholder: "Describe the look. E.g. warm and bright, matching our brand colors." },
  { id: "broll", label: "Extra shots", hint: "Shots over the talking", ref: "broll", tweak: "only product shots, no stock footage", placeholder: "What should be shown over the talking? E.g. product close-ups when the features are mentioned." },
  { id: "other", label: "Something else", hint: "Tell us what you need", placeholder: "What should we do?" },
];

// In a full edit Claude does every part, so each one can get a quick choice instead of only a description.
const partChoices: Record<string, { field: "cut_type" | "sound_effects" | "motion_graphics"; options: { id: string; label: string }[] }> = {
  rough_cut: { field: "cut_type", options: [{ id: "Straight cuts", label: "Clean and calm" }, { id: "Jump cuts", label: "Fast jump cuts" }, { id: "J and L cuts", label: "Smooth, sound leads" }, { id: "Match cuts", label: "Creative match cuts" }, { id: "Mixed cuts", label: "Mix it up" }] },
  motion_graphics: { field: "motion_graphics", options: [{ id: "None", label: "None" }, { id: "Subtle", label: "Subtle" }, { id: "Plenty", label: "Plenty" }] },
  sound: { field: "sound_effects", options: [{ id: "None", label: "None" }, { id: "Subtle", label: "Subtle" }, { id: "Plenty", label: "Plenty" }] },
};

const formats = [
  { id: "9:16", name: "Vertical", use: "TikTok, Reels, Shorts", size: "1080 × 1920", w: 9, h: 16 },
  { id: "16:9", name: "Widescreen", use: "YouTube, web, TV", size: "1920 × 1080", w: 16, h: 9 },
  { id: "1:1", name: "Square", use: "Feeds and ads", size: "1080 × 1080", w: 1, h: 1 },
  { id: "4:5", name: "Portrait", use: "Instagram and Facebook feed", size: "1080 × 1350", w: 4, h: 5 },
  { id: "4:3", name: "Classic", use: "Presentations, archive footage", size: "1440 × 1080", w: 4, h: 3 },
  { id: "3:4", name: "Upright", use: "Instagram grid, tablets", size: "1080 × 1440", w: 3, h: 4 },
  { id: "21:9", name: "Cinematic", use: "Film, trailers, banners", size: "2560 × 1080", w: 21, h: 9 },
];

const platforms: { id: string; formats: string[] }[] = [
  { id: "YouTube", formats: ["16:9"] }, { id: "YouTube Shorts", formats: ["9:16"] }, { id: "TikTok", formats: ["9:16"] },
  { id: "Instagram", formats: ["9:16", "4:5", "3:4"] }, { id: "Facebook", formats: ["4:5", "1:1", "16:9"] },
  { id: "LinkedIn", formats: ["1:1", "16:9", "4:5"] }, { id: "X", formats: ["16:9", "1:1"] }, { id: "Pinterest", formats: ["9:16", "3:4"] },
  { id: "Snapchat", formats: ["9:16"] }, { id: "Website", formats: ["16:9", "21:9"] }, { id: "TV and cinema", formats: ["16:9", "21:9"] },
];

const styles = [
  { id: "Entertaining", hint: "Fun, fast, keeps attention" }, { id: "Professional", hint: "Clean, calm, trustworthy" },
  { id: "Cinematic", hint: "Moody shots and smooth pacing" }, { id: "Educational", hint: "Clear and easy to follow" },
  { id: "High energy", hint: "Punchy cuts and big moments" }, { id: "Minimal", hint: "Simple and understated" },
];

// Quick lengths; the slider covers anything in between.
const lengths = [{ s: 15, label: "15 sec" }, { s: 30, label: "30 sec" }, { s: 60, label: "1 min" }, { s: 180, label: "3 min" }, { s: 600, label: "10 min" }];

const reviewIcons: Record<string, typeof IconSliders> = {
  "Reference video": IconFilm, "What to create": IconWand, Focus: IconLayers, Format: IconFrame, Footage: IconFolder, "From reference": IconFilm,
  "Your notes": IconChat, Subtitles: IconCaptions, Story: IconStory, "Your video": IconSpark, "Edit it like": IconFilm,
};

const typicalSections = ["Hook", "Intro", "Main part", "Call to action"];

export const emptyBrief = (): Brief => ({
  scope: "", parts: [], part_details: {}, reference_features: {}, request: "", format: "", custom_format: "", platforms: [], sections: [],
  about: "", length: 60, style: "", style_notes: "", reference_url: "", reference_notes: "", dive_deeper: false,
  cut_type: "", sound_effects: "", motion_graphics: "", motion_graphics_notes: "", subtitles: null, like_project: "", like_notes: "", completed: false,
});

// Draws each format at its true proportions inside a 100 × 60 box.
const shape = (w: number, h: number) => { const k = Math.min(100 / w, 60 / h); return { width: `${Math.round(w * k)}px`, height: `${Math.round(h * k)}px` }; };
// The same, inside the 120 × 90 frame on the review page.
const frame = (w: number, h: number) => { const k = Math.min(120 / w, 90 / h); return { width: `${Math.round(w * k)}px`, height: `${Math.round(h * k)}px` }; };
const length = (s: number) => s < 60 ? `${s} sec` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} sec` : ""}`;
const Check = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

function Pills<T extends string>(props: { label: string; options: readonly { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return <div class="pills" role="group" aria-label={props.label}><For each={props.options}>{o =>
    <button aria-pressed={props.value === o.id} onClick={() => props.onChange(props.value === o.id ? "" as T : o.id)}>{o.label}</button>
  }</For></div>;
}

function ServiceArt(props: { kind: "whole" | "part" }) {
  // A small timeline: every track lit for a full edit, one track for a targeted job.
  const tracks = [[8, 40, 52, 30], [20, 28, 64, 26], [4, 70, 82, 22]];
  return <svg class="service-art" viewBox="0 0 180 70" aria-hidden="true">
    <For each={tracks}>{(t, i) => <>
      <rect x="2" y={6 + i() * 21} width="176" height="14" rx="5" class="track" />
      <rect x={t[0]} y={8 + i() * 21} width={t[1]} height="10" rx="3" class={props.kind === "whole" || i() === 1 ? "clip on" : "clip"} />
      <rect x={t[2]} y={8 + i() * 21} width={t[3]} height="10" rx="3" class={props.kind === "whole" || i() === 1 ? "clip on" : "clip"} />
    </>}</For>
    <rect x="118" y="2" width="2" height="66" rx="1" class="playhead" />
  </svg>;
}

export function Questionnaire(props: {
  reviewRunning?: boolean;
  projectId: string; assets: Asset[]; settings: Settings; onChange: (s: Settings) => void;
  uploads: Uploading[]; setUploads: (fn: (u: Uploading[]) => Uploading[]) => void; refresh: () => Promise<void>;
  reference: Reference | null | undefined; generation: Generation | null; onCreated: () => void;
  onBackToPlan?: () => void;
}) {
  // A finished brief reopens on Review, where the video can be created again.
  const [index, setIndex] = createSignal(props.settings.brief?.completed ? 99 : 0);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [newSection, setNewSection] = createSignal("");
  const [refTab, setRefTab] = createSignal<"file" | "link">(props.settings.brief?.reference_url && !props.reference ? "link" : "file");
  const [dragged, setDragged] = createSignal<number | null>(null);
  const [specChoice, setSpecTab] = createSignal("");
  // A length that is not one of the quick choices shows the slider.
  const [customLength, setCustomLength] = createSignal(!lengths.some(l => l.s === (props.settings.brief?.length ?? 60)));
  const [mediaActivity, setMediaActivity] = createSignal<MediaActivity>({ reading: false, reviewing: false, error: "" });
  const readiness = () => mediaReadiness(props.assets, props.uploads, props.settings, { ...mediaActivity(), reviewing: mediaActivity().reviewing || !!props.reviewRunning });
  const running = () => ["queued", "running"].includes(props.generation?.status ?? "");
  const b = () => ({ ...emptyBrief(), ...(props.settings.brief ?? {}) });
  const set = (patch: Partial<Brief>) => props.onChange({ ...props.settings, brief: { ...b(), ...patch } });
  const flow = () => flows[b().scope === "part" ? "part" : "whole"];
  const question = () => flow()[index()]?.id ?? "scope";
  const last = () => index() === flow().length - 1;
  const whole = () => b().scope !== "part";
  const answered = (q: Question) => q === "scope" ? !!b().scope : q === "parts" ? b().parts.length > 0 : true;
  const reachable = (i: number) => flow().slice(0, i).every(q => answered(q.id));
  createEffect(() => { if (index() >= flow().length) setIndex(flow().length - 1); });
  async function create() {
    if (busy() || running() || !readiness().ready) return;
    setBusy(true); setError("");
    const settings = briefToSettings(props.settings, props.assets);
    props.onChange(settings);
    try {
      await api(`/api/projects/${props.projectId}/generations`, { method: "POST", json: { settings } });
      await props.refresh(); props.onCreated();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const go = (i: number) => { if (!reachable(i)) return; setIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goTo = (q: Question, tab?: string) => { if (tab) setSpecTab(tab); go(flow().findIndex(x => x.id === q)); };
  const selectedParts = () => parts.filter(p => b().parts.includes(p.id));
  // A full edit covers every part; an assist edit only the ones picked under Focus.
  const workParts = () => whole() ? parts.filter(p => p.id !== "other") : selectedParts();
  const fileCount = () => props.assets.filter(a => a.status !== "error").length + props.uploads.filter(u => !u.error).length;
  const hasReference = () => !!props.reference || !!referenceUpload(props.projectId);
  const [fetchingRef, setFetchingRef] = createSignal(false);
  const [refLinkError, setRefLinkError] = createSignal("");
  // yt-dlp on the server downloads the linked video; it then gets the same analysis as an upload.
  async function downloadReference() {
    const url = b().reference_url.trim();
    if (!url || fetchingRef()) return;
    setFetchingRef(true); setRefLinkError("");
    try {
      await api(`/api/projects/${props.projectId}/reference/link`, { method: "POST", json: { url } });
      await props.refresh();
    } catch (e) { setRefLinkError((e as Error).message); }
    finally { setFetchingRef(false); }
  }
  const recommended = () => new Set(platforms.filter(p => b().platforms.includes(p.id)).flatMap(p => p.formats));
  const formatLabel = () => b().format === "custom" ? `Custom${b().custom_format ? ` · ${b().custom_format}` : ""}`
    : (f => f ? `${f.name} · ${f.id}` : "No format yet")(formats.find(f => f.id === b().format));

  function togglePart(id: string) {
    const has = b().parts.includes(id);
    set({ parts: has ? b().parts.filter(p => p !== id) : [...b().parts, id] });
  }
  function toggleFeature(id: string, on: boolean) {
    const next = { ...b().reference_features };
    if (on) next[id] = next[id] ?? "";
    else delete next[id];
    set({ reference_features: next });
  }
  // Parts not taken from the reference get their own description below.
  // A part can be copied only when the analysis found it in the reference.
  const present = (p: (typeof parts)[number]) => {
    const style = props.reference?.style;
    if (!style || !p.ref) return false;
    if (style.present) return (style.present as string[]).includes(p.ref);
    return !/^\s*(no|none|not (used|present|visible)|there (is|are) no|n\/a)\b/i.test(String(style[p.ref] ?? ""));
  };
  const inReference = () => workParts().filter(present);
  const rest = () => workParts().filter(p => !(present(p) && p.id in b().reference_features));
  const partNote = (id: string) => b().part_details[id] ?? (id === "motion_graphics" ? b().motion_graphics_notes : "");
  const partDone = (id: string) => id in b().reference_features || !!partNote(id).trim() || (id === "subtitles" && !!b().subtitles) || (whole() && !!partChoices[id] && !!b()[partChoices[id].field]);
  function choosePart(field: "cut_type" | "sound_effects" | "motion_graphics", value: string) {
    const next = { ...b(), [field]: value };
    set({ [field]: value, dive_deeper: !!(next.cut_type || next.sound_effects || next.motion_graphics) });
  }
  // Videos already edited in Reel, so this one can be edited the same way.
  const [pastEdits] = createResource(() => props.projectId, id => api<{ edits: PastEdit[] }>(`/api/projects/${id}/past-edits`).then(r => r.edits).catch(() => []));
  const likeEdit = () => pastEdits()?.find(e => e.id === b().like_project);
  const likeLabel = () => b().like_project ? likeEdit()?.name ?? "A past video" : "";
  const seconds = (s: number | null) => s == null ? "" : s < 60 ? `${Math.round(s)} sec` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")} min`;
  // Specify shows one section at a time: like a past video, the reference, (for a full edit) the story, each remaining part, then a free note.
  const copiedCount = () => Object.keys(b().reference_features).length;
  const specItems = () => [
    { id: "__like", label: "Like a past video", hint: likeLabel() || "Copy one you made", done: !!b().like_project },
    { id: "__ref", label: "Reference video", hint: copiedCount() ? `${copiedCount()} copied` : hasReference() || b().reference_url.trim() ? "Added" : "A video you like", done: hasReference() || !!b().reference_url.trim() },
    ...(whole() ? [{ id: "__story", label: "Story", hint: b().sections.length ? `${b().sections.length} parts in order` : "The order of the parts", done: b().sections.length > 0 }] : []),
    ...rest().map(p => ({ id: p.id, label: p.label, hint: p.hint, done: partDone(p.id) })),
    { id: "__more", label: "Anything else", hint: "Optional", done: !!b().request.trim() },
  ];
  // A memo, so it only changes when the open section does. As a plain function every keystroke
  // re-ran the step-change effect below, which moved focus to the heading after each letter.
  const specTab = createMemo(() => specItems().some(i => i.id === specChoice()) ? specChoice() : specItems()[0].id);
  const nextSpec = () => question() === "specify" ? specItems()[specItems().findIndex(i => i.id === specTab()) + 1] : undefined;
  const prevSpec = () => question() === "specify" ? specItems()[specItems().findIndex(i => i.id === specTab()) - 1] : undefined;
  // Inside "Make it personal", Next and Back move through its sections before leaving the step.
  function next() {
    const n = nextSpec();
    if (n) { setSpecTab(n.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else go(index() + 1);
  }
  function back() {
    const p = prevSpec();
    if (p) { setSpecTab(p.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else go(index() - 1);
  }
  function togglePlatform(id: string) {
    const has = b().platforms.includes(id);
    // The first platform picked also picks its usual format, until a format is chosen by hand.
    const format = !has && !b().format ? platforms.find(p => p.id === id)?.formats[0] ?? "" : b().format;
    set({ platforms: has ? b().platforms.filter(p => p !== id) : [...b().platforms, id], format });
  }
  function moveSection(from: number, to: number) {
    const list = [...b().sections];
    if (to < 0 || to >= list.length || from === to) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    set({ sections: list });
  }
  function addSection() {
    const name = newSection().trim();
    if (!name) return;
    set({ sections: [...b().sections, name] });
    setNewSection("");
  }

  const referenceStatus = () => {
    const up = referenceUpload(props.projectId);
    if (up) return up.error ? "Upload failed" : `${up.filename} · uploading`;
    const r = props.reference;
    if (!r) return b().reference_url.trim() || "None added";
    return `${r.filename} · ${r.status === "ready" ? "style analyzed" : r.status === "error" ? "analysis failed" : "being analyzed"}`;
  };
  const heroShape = () => formats.find(f => f.id === b().format);
  const summary = () => {
    const x = b();
    const rows: { q: Question; tab?: string; label: string; value: string }[] = [
      { q: "scope", label: "What to create", value: x.scope === "part" ? "Assist edit" : "Full edit" },
    ];
    if (x.scope === "part") rows.push({ q: "parts", label: "Focus", value: selectedParts().map(p => p.label).join(", ") });
    else rows.push({ q: "video", label: "Your video", value: [length(x.length), x.style || "Any tone", x.about.trim(), x.style_notes.trim()].filter(Boolean).join(" · ") });
    rows.push({ q: whole() ? "video" : "format", label: "Format", value: [formatLabel(), x.platforms.join(", ")].filter(Boolean).join(" · ") });
    rows.push({ q: "files", label: "Footage", value: (x.footage_source === "folder" || x.footage_source === "client") && x.footage_folder ? `${fileCount()} files in ${x.footage_folder} · not uploaded` : fileCount() ? `${fileCount()} files added` : "Not added yet" });
    if (x.like_project) rows.push({ q: "specify", tab: "__like", label: "Edit it like", value: [likeLabel(), x.like_notes?.trim()].filter(Boolean).join(" · ") });
    rows.push({ q: "specify", tab: "__ref", label: "Reference video", value: referenceStatus() });
    const copied = workParts().filter(p => p.id in x.reference_features);
    if (copied.length) rows.push({ q: "specify", tab: "__ref", label: "From reference", value: copied.map(p => x.reference_features[p.id]?.trim() ? `${p.label} (${x.reference_features[p.id].trim()})` : p.label).join(", ") });
    if (whole()) rows.push({ q: "specify", tab: "__story", label: "Story", value: x.sections.length ? x.sections.join(" → ") : "Up to Claude" });
    const note = (p: (typeof parts)[number]) => {
      const choice = whole() && partChoices[p.id] ? x[partChoices[p.id].field] : "";
      const text = [choice, partNote(p.id).trim()].filter(Boolean).join(", ");
      return text ? `${p.label}: ${text}` : "";
    };
    rows.push({ q: "specify", label: "Your notes", value: [...rest().map(note), x.request.trim()].filter(Boolean).join(" · ") || "Up to Claude" });
    if (rest().some(p => p.id === "subtitles")) rows.push({ q: "specify", tab: "subtitles", label: "Subtitles", value: subtitleLabel() });
    return rows;
  };
  const subtitleLabel = () => {
    const s = b().subtitles;
    if (!s) return "Up to Claude";
    if (s.preset === "none") return "No subtitles";
    return `${subtitlePresets.find(p => p.id === s.preset)?.label ?? "Custom"} · ${s.font} · ${s.animation}`;
  };

  let page!: HTMLDivElement;
  let first = true;
  createEffect(on([index, specTab], () => { if (first) first = false; else enterStep(page); }));
  const FormatPicker = () => <>
    <div class="format-grid">
      <For each={formats}>{f =>
        <button class="format-card" aria-pressed={b().format === f.id} onClick={() => set({ format: f.id })}>
          <span class="format-shape"><span style={shape(f.w, f.h)} /></span>
          <Show when={recommended().has(f.id)}><span class="format-badge">Recommended</span></Show>
          <strong>{f.name} <span>{f.id}</span></strong>
          <span class="format-use">{f.use}</span>
          <span class="format-size">{f.size}</span>
        </button>
      }</For>
      <button class="format-card" aria-pressed={b().format === "custom"} onClick={() => set({ format: "custom" })}>
        <span class="format-shape"><span class="custom" style={shape(1, 1)}>+</span></span>
        <strong>Custom</strong>
        <span class="format-use">Any other size</span>
        <span class="format-size">You choose</span>
      </button>
    </div>
    <Show when={b().format === "custom"}>
      <section class="wizard-field q-gap"><h2><label for="q-custom">Which size or ratio?</label></h2>
        <input id="q-custom" maxLength={300} placeholder="E.g. 3840 × 2160, or 3:1 for a website banner" value={b().custom_format} onInput={e => set({ custom_format: e.currentTarget.value })} />
      </section>
    </Show>
  </>;
  const PlatformPicker = () =>
    <div class="pills"><For each={platforms}>{p =>
      <button aria-pressed={b().platforms.includes(p.id)} onClick={() => togglePlatform(p.id)}>{p.id}</button>
    }</For></div>;

  return <>
    <StepBar phase={props.onBackToPlan ? "Edit" : undefined} label="Questions" steps={flow()} current={index()} reachable={reachable} onGo={go}
      lockedHint={b().scope === "part" && !b().parts.length ? "Pick what to work on first" : "Choose what to create first"} />
    <div ref={page} class="wizard questionnaire">
      <h1 tabindex="-1">{titles[question()]}</h1>
      <Show when={intros[question()]}><p class="q-intro">{intros[question()]}</p></Show>
      <Switch>
        <Match when={question() === "scope"}>
          <div class="service-grid">
            <button class="service-card" aria-pressed={b().scope === "whole"} onClick={() => set({ scope: "whole" })}>
              <span class="service-check"><Check /></span>
              <ServiceArt kind="whole" />
              <strong>Full edit</strong>
              <span class="service-desc">We take care of everything: story, cuts, subtitles, music and color.</span>
              <div class="service-flow"><div><small>You send</small><b>Raw footage</b></div><IconArrowRight size={18} /><div><small>You get</small><b>A video ready to post</b></div></div>
            </button>
            <button class="service-card" aria-pressed={b().scope === "part"} onClick={() => set({ scope: "part" })}>
              <span class="service-check"><Check /></span>
              <ServiceArt kind="part" />
              <strong>Assist edit</strong>
              <span class="service-desc">Keep your own cut. We add only what you pick, like subtitles or transitions.</span>
              <div class="service-flow"><div><small>You send</small><b>Your edit</b></div><IconArrowRight size={18} /><div><small>You get</small><b>Upgraded edit</b></div></div>
            </button>
          </div>
        </Match>
        <Match when={question() === "parts"}>
          <div class="choice-grid styles q-three"><For each={parts}>{p =>
            <button class="choice" aria-pressed={b().parts.includes(p.id)} onClick={() => togglePart(p.id)}><strong>{p.label}</strong><span>{p.hint}</span></button>
          }</For></div>
        </Match>
        <Match when={question() === "video"}>
          <section class="wizard-field"><h2><label for="q-about">What’s the video about?</label></h2>
            <textarea id="q-about" maxLength={2000} placeholder="E.g. A behind-the-scenes look at our new collection, for people who already follow us." value={b().about} onInput={e => set({ about: e.currentTarget.value })} />
          </section>
          <section class="wizard-field"><h2>Length</h2>
            <div class="pills" role="group" aria-label="Length"><For each={lengths}>{l =>
              <button aria-pressed={!customLength() && b().length === l.s} onClick={() => { setCustomLength(false); set({ length: l.s }); }}>{l.label}</button>
            }</For>
              <button aria-pressed={customLength()} onClick={() => setCustomLength(true)}>{customLength() ? length(b().length) : "Other"}</button>
            </div>
            <Show when={customLength()}>
              <input id="q-length" aria-label="Length" class="duration-slider" type="range" min="10" max="3600" step={b().length >= 600 ? 60 : 5} value={b().length} onInput={e => set({ length: +e.currentTarget.value })} />
              <div class="range-labels"><span>10 sec</span><span>60 min</span></div>
            </Show>
          </section>
          <section class="wizard-field"><h2>Tone <span class="optional">Optional</span></h2>
            <div class="choice-grid styles q-three"><For each={styles}>{x =>
              <button class="choice" aria-pressed={b().style === x.id} onClick={() => set({ style: b().style === x.id ? "" : x.id })}><strong>{x.id}</strong><span>{x.hint}</span></button>
            }</For></div>
            <textarea class="q-below" id="q-style-notes" maxLength={2000} aria-label="Anything else about the tone?" placeholder="Anything else about the tone? E.g. Fun, but not silly. Our audience is small business owners." value={b().style_notes} onInput={e => set({ style_notes: e.currentTarget.value })} />
          </section>
          <section class="wizard-field"><h2>Where will it be posted? <span class="optional">Optional</span></h2>
            <p class="field-hint">We’ll mark the formats that fit best.</p>
            <PlatformPicker />
          </section>
          <section class="wizard-field"><h2>Format</h2>
            <FormatPicker />
          </section>
        </Match>
        <Match when={question() === "format"}>
          <FormatPicker />
          <section class="wizard-field q-gap"><h2>Where will it be posted? <span class="optional">Optional</span></h2>
            <p class="field-hint">We’ll mark the formats that fit best.</p>
            <PlatformPicker />
          </section>
        </Match>
        <Match when={question() === "specify"}>
          <SubMenu label="What you need" items={specItems()} current={specTab()} onSelect={setSpecTab}>
            <Switch>
              <Match when={specTab() === "__like"}>
                <h2>Edit it like a past video</h2>
                <p class="field-hint">Pick a video you already made in Reel. Claude edits this one the same way: the pace and cuts, zooms, subtitles, animated text, music and look. Only the footage and story are new.</p>
                <Show when={!pastEdits.loading} fallback={<p class="spec-waiting">Loading your videos…</p>}>
                  <Show when={pastEdits()?.length} fallback={<p class="spec-waiting">No finished edits yet. Once Reel has edited a video for you, you can pick it here.</p>}>
                    <div class="past-grid" role="group" aria-label="Past videos">
                      <For each={pastEdits()}>{e =>
                        <button class="past-card" aria-pressed={b().like_project === e.id} onClick={() => set({ like_project: b().like_project === e.id ? "" : e.id })}>
                          <Show when={e.cover_url} fallback={<span class="past-cover placeholder"><IconFilm /></span>}>
                            <img class="past-cover" src={e.cover_url!} alt="" loading="lazy" />
                          </Show>
                          <span class="past-text">
                            <strong>{e.name}</strong>
                            <Show when={e.title && e.title !== e.name}><span class="past-title">{e.title}</span></Show>
                            <span class="past-meta">{[e.style, e.aspect, seconds(e.seconds), e.client].filter(Boolean).join(" · ")}</span>
                          </span>
                        </button>
                      }</For>
                    </div>
                  </Show>
                </Show>
                <Show when={b().like_project}>
                  <section class="wizard-field q-gap"><h2>Anything different this time? <span class="optional">Optional</span></h2>
                    <textarea rows={2} maxLength={2000} aria-label="What should be different from the past video" placeholder="E.g. same style, but calmer music and no progress bar."
                      value={b().like_notes ?? ""} onInput={e => set({ like_notes: e.currentTarget.value })} />
                    <p class="field-hint">Choices you make in the other sections, like the tone or the subtitle design, also win over the past video.</p>
                  </section>
                </Show>
              </Match>
              <Match when={specTab() === "__ref"}>
                <h2>Reference video</h2>
                <p class="field-hint">Have a video whose editing you love? Add it, and Claude can copy parts of its style.</p>
                <Show when={!hasReference()}>
                  <div class="sub-tabs" role="tablist" aria-label="Reference video">
                    <button role="tab" aria-selected={refTab() === "file"} onClick={() => setRefTab("file")}>Upload a video</button>
                    <button role="tab" aria-selected={refTab() === "link"} onClick={() => setRefTab("link")}>Paste a link</button>
                  </div>
                  <div class="q-gap small" />
                </Show>
                <Show when={refTab() === "link" && !hasReference()} fallback={<ReferencePanel compact projectId={props.projectId} reference={props.reference} refresh={props.refresh} />}>
                  <form class="ref-link-row" onSubmit={e => { e.preventDefault(); void downloadReference(); }}>
                    <input id="q-ref" type="url" maxLength={300} aria-label="Link to a reference video" placeholder="https://www.youtube.com/watch?v=…" value={b().reference_url} onInput={e => set({ reference_url: e.currentTarget.value })} />
                    <Button type="submit" variant="primary" loading={fetchingRef()} disabled={!b().reference_url.trim()}>Download and analyze</Button>
                  </form>
                  <Show when={refLinkError()}><p class="form-error" role="alert">{refLinkError()}</p></Show>
                  <p class="field-hint">YouTube, TikTok, Instagram, Vimeo and most other sites work. Reel downloads the video and Claude studies its editing.</p>
                </Show>
                <Show when={hasReference()}>
                  <h2 class="q-gap">Copy its style</h2>
                  <Show when={props.reference?.style} fallback={
                    <p class="spec-waiting">{props.reference?.status === "error"
                      ? "Claude couldn’t analyze your reference, so describe each part in its own section."
                      : `Claude is checking which ${whole() ? "parts" : "of your chosen parts"} appear in the reference. You can fill in the other sections meanwhile.`}</p>
                  }>
                    <Show when={props.reference!.style!.summary}><p class="field-hint">{props.reference!.style!.summary}</p></Show>
                    <Show when={inReference().length} fallback={<p class="spec-waiting">Claude didn’t spot {whole() ? "these parts" : "the parts you chose"} in your reference. You can still pick “Same as in the reference” in each part’s own section.</p>}>
                      <div class="spec-features"><For each={inReference()}>{p => {
                        const on = () => p.id in b().reference_features;
                        return <div class="spec-feature" classList={{ on: on() }}>
                          <div class="toggle-row">
                            <div><strong>{p.label}</strong><p>{props.reference!.style![p.ref!] as string}</p></div>
                            <Toggle label={`Copy ${p.label} from the reference`} checked={on()} onChange={v => toggleFeature(p.id, v)} />
                          </div>
                          <Show when={on()}>
                            <textarea rows={2} maxLength={2000} aria-label={`Note about ${p.label}`} placeholder={`Anything to change? E.g. ${p.tweak}`}
                              value={b().reference_features[p.id] ?? ""} onInput={e => set({ reference_features: { ...b().reference_features, [p.id]: e.currentTarget.value } })} />
                          </Show>
                        </div>;
                      }}</For></div>
                    </Show>
                  </Show>
                </Show>
              </Match>
              <Match when={specTab() === "__story"}>
                <section class="wizard-field"><h2>Should there be a set structure?</h2>
                  <p class="field-hint">Put the parts of your video in order, or let Claude find the best one.</p>
                  <Pills label="Structure" options={[{ id: "auto", label: "Let Claude decide" }, { id: "own", label: "I’ll set the order" }] as const}
                    value={b().sections.length ? "own" : "auto"} onChange={v => set({ sections: v === "own" ? [...typicalSections] : [] })} />
                  <Show when={b().sections.length}>
                    <p class="field-hint">Drag the parts left or right to put them in order.</p>
                    <ol class="q-sections"><Index each={b().sections}>{(name, i) =>
                      <li draggable="true" classList={{ dragging: dragged() === i }}
                        onDragStart={e => { setDragged(i); e.dataTransfer?.setData("text/plain", String(i)); }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const from = dragged(); if (from !== null) moveSection(from, i); setDragged(null); }}
                        onDragEnd={() => setDragged(null)}>
                        <span class="q-section-number">{i + 1}</span><span class="q-section-name">{name()}</span>
                        <span class="q-section-actions">
                          <button aria-label={`Move ${name()} left`} disabled={i === 0} onClick={() => moveSection(i, i - 1)}>←</button>
                          <button aria-label={`Move ${name()} right`} disabled={i === b().sections.length - 1} onClick={() => moveSection(i, i + 1)}>→</button>
                          <button aria-label={`Remove ${name()}`} onClick={() => set({ sections: b().sections.filter((_, j) => j !== i) })}>×</button>
                        </span>
                      </li>
                    }</Index></ol>
                    <form class="q-add-section" onSubmit={e => { e.preventDefault(); addSection(); }}>
                      <input maxLength={300} placeholder="Add a part, e.g. Product demo" value={newSection()} onInput={e => setNewSection(e.currentTarget.value)} />
                      <button class="back-button" type="submit" disabled={!newSection().trim()}><IconPlus size={16} />Add</button>
                    </form>
                  </Show>
                </section>
              </Match>
              <Match when={specTab() === "__more"}>
                <h2><label for="q-request">Anything else? <span class="optional">Optional</span></label></h2>
                <textarea id="q-request" maxLength={2000} rows={4} placeholder="E.g. keep it under a minute, our brand colors are navy and orange." value={b().request} onInput={e => set({ request: e.currentTarget.value })} />
              </Match>
              <Match when={rest().find(p => p.id === specTab())}>{p =>
                <>
                  <h2><label for={`q-part-${p().id}`}>{p().label}</label></h2>
                  <p class="field-hint">{p().hint}. {whole() ? "Pick or describe what you want, or leave it to Claude." : "Describe what you want."}</p>
                  <Show when={hasReference() && p().ref && !present(p())}>
                    <div class="spec-feature q-gap-after" classList={{ on: p().id in b().reference_features }}>
                      <div class="toggle-row">
                        <div><strong>Same as in the reference</strong><p>{props.reference?.style ? "Claude didn’t spot this in your reference, but if it’s there, switch this on and it will be matched." : "Match how your reference video does it."}</p></div>
                        <Toggle label={`${p().label} same as in the reference`} checked={p().id in b().reference_features} onChange={v => toggleFeature(p().id, v)} />
                      </div>
                    </div>
                  </Show>
                  <Show when={whole() && partChoices[p().id]}>{c =>
                    <><Pills label={p().label} options={c().options} value={b()[c().field]} onChange={v => choosePart(c().field, v)} /><div class="q-gap small" /></>
                  }</Show>
                  <Show when={p().id === "subtitles"}>
                    <SubtitleDesigner value={b().subtitles} format={b().format} onChange={subtitles => set({ subtitles })} />
                    <div class="q-gap small" />
                  </Show>
                  <textarea id={`q-part-${p().id}`} maxLength={2000} placeholder={p().placeholder} value={partNote(p().id)}
                    onInput={e => set({ part_details: { ...b().part_details, [p().id]: e.currentTarget.value } })} />
                </>
              }</Match>
            </Switch>
          </SubMenu>
        </Match>
        <Match when={question() === "create"}>
          <div class="review-hero">
            <Show when={heroShape()}>{f =>
              <div class="review-hero-frame"><div class="review-hero-shape" style={frame(f().w, f().h)}>{f().id}</div></div>
            }</Show>
            <div class="review-hero-text">
              <h2>{b().scope === "part" ? "Assist edit" : "Full edit"}</h2>
              <p>{[formatLabel(), b().platforms.join(", ")].filter(Boolean).join(" · ")}</p>
              <div class="review-stats">
                <Show when={b().scope === "part"} fallback={<><span>{length(b().length)}</span><span>{b().style || "Any tone"}</span></>}>
                  <span>{selectedParts().length} {selectedParts().length === 1 ? "part" : "parts"}</span>
                </Show>
                <span>{fileCount() ? `${fileCount()} files` : "No footage yet"}</span>
                <Show when={hasReference()}><span>With reference</span></Show>
              </div>
            </div>
          </div>
          <ReviewCards items={summary().map(row => ({ label: row.label, value: row.value, icon: reviewIcons[row.label] ?? IconSliders, onEdit: () => goTo(row.q, row.tab) }))} />
          <Show when={!readiness().ready} fallback={<p class="field-hint review-next">{running() ? "Your video is already being created." : "Everything look right? Claude will now edit your video."}</p>}>
            <p class="field-hint review-next" role="status">{readiness().label}. <button class="inline-link big" onClick={() => goTo("files")}>Go to Footage</button></p>
          </Show>
          <Show when={error()}><p class="form-error" role="alert">{error()}</p></Show>
        </Match>
      </Switch>
      <div hidden={question() !== "files"}>
        <section class="wizard-field"><FootageSource {...props} onActivity={setMediaActivity} /></section>
      </div>
      <footer class="wizard-footer"><Show when={index() > 0} fallback={<Show when={props.onBackToPlan} fallback={<A class="projects-link" href="/projects"><IconArrowLeft size={16} />All projects</A>}>
        <button class="back-button" onClick={() => props.onBackToPlan!()}><IconArrowLeft size={18} />Back to plan</button></Show>}><button class="back-button" onClick={back}><IconArrowLeft size={18} />Back</button></Show>
        <Show when={!last()} fallback={<button class="next-button" disabled={busy() || running() || !readiness().ready} onClick={create}>{busy() ? "Creating…" : <><IconSpark size={18} />Create video</>}</button>}>
          <span class="footer-next">
            <Show when={!answered(question())}><span class="footer-hint">{question() === "parts" ? "Pick at least one to continue" : "Pick one to continue"}</span></Show>
            <button class="next-button" disabled={!answered(question())} onClick={next}>Next<IconArrowRight size={18} /></button>
          </span>
        </Show>
      </footer>
    </div>
  </>;
}
