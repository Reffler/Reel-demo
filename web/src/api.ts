// Thin typed client for the Reel backend (app.py).
export const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

const TOKEN_KEY = "reel.token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

/** The static demo build (GitHub Pages) has no server: a mock backend in the browser answers instead. */
export const DEMO = import.meta.env.VITE_DEMO === "1";
const mock = () => import("./mock/backend");

export const mediaUrl = (path: string | null | undefined) =>
  !path ? undefined : DEMO ? (/^(data:|https?:)/.test(path) ? path : import.meta.env.BASE_URL + path.replace(/^\//, "")) : API_BASE + path;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  if (DEMO) {
    try {
      return await (await mock()).mockApi<T>((init.method ?? "GET").toUpperCase(), path, init.json);
    } catch (e) {
      const err = e as { status?: number; message: string };
      if (err.status === 401 && getToken()) onUnauthorized();
      throw new ApiError(err.status ?? 0, err.message);
    }
  }
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { ...init, headers, body });
  } catch {
    throw new ApiError(0, "Can't reach the Reel server. Is it running?");
  }
  if (res.status === 401 && token) onUnauthorized();
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.detail || data.message || msg;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

export function uploadFile(
  projectId: string,
  kind: AssetKind,
  file: File,
  onProgress: (p: number) => void,
  filename = file.name,
): { promise: Promise<Asset>; abort: () => void } {
  if (DEMO) {
    let job: ReturnType<typeof import("./mock/backend").mockUpload> | undefined;
    let aborted = false;
    const promise = mock().then(m => {
      if (aborted) throw new ApiError(0, "Upload cancelled.");
      job = m.mockUpload(projectId, kind, file, onProgress, filename);
      return job.promise;
    });
    return { promise, abort: () => { aborted = true; job?.abort(); } };
  }
  const xhr = new XMLHttpRequest();
  const promise = new Promise<Asset>((resolve, reject) => {
    const q = new URLSearchParams({ kind, filename });
    xhr.open("PUT", `${API_BASE}/api/projects/${projectId}/assets?${q}`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).asset);
      else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          msg = JSON.parse(xhr.responseText).detail || msg;
        } catch {
          /* ignore */
        }
        reject(new ApiError(xhr.status, msg));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "Upload interrupted."));
    xhr.onabort = () => reject(new ApiError(0, "Upload cancelled."));
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
}

export function uploadReference(projectId: string, file: File, onProgress: (p: number) => void): Promise<Reference> {
  if (DEMO) return mock().then(m => m.mockUploadReference(projectId, file, onProgress));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${API_BASE}/api/projects/${projectId}/reference?${new URLSearchParams({ filename: file.name })}`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(JSON.parse(xhr.responseText).reference);
      let msg = `Upload failed (${xhr.status})`;
      try {
        msg = JSON.parse(xhr.responseText).detail || msg;
      } catch {
        /* ignore */
      }
      reject(new ApiError(xhr.status, msg));
    };
    xhr.onerror = () => reject(new ApiError(0, "Upload interrupted."));
    xhr.send(file);
  });
}

// ── types ──

export type AssetKind = "main" | "broll" | "image" | "logo" | "music" | "sfx";
export type Aspect = "9:16" | "16:9" | "1:1" | "4:5";
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type Settings = {
  goal?: string;
  description?: string;
  key_moments?: string;
  duration: number;
  aspect: Aspect;
  style: string;
  transitions?: "cut" | "auto" | "fade" | "blur" | "zoom";
  captions: {
    enabled: boolean;
    key_moments_only: boolean;
    color: string;
    outline: boolean;
    position: "top" | "center" | "bottom";
  };
  progress_bar: boolean;
  progress_bar_color?: string;
  progress_bar_position?: "top" | "bottom";
  excluded_assets?: string[];
  hook_title: boolean;
  zooms: boolean;
  broll: boolean;
  music: boolean;
  sfx: boolean;
  logo: { enabled: boolean; position: Corner };
  tighten: boolean;
  motion_graphics?: boolean;
  brief?: Brief | null;
  agency?: Agency | null;
};

/** The planning steps before the questionnaire: which business and idea this video is for, and who films it. */
export type Agency = {
  business_id: string;
  idea_id: string;
  filming: "" | "with_us" | "self" | "have_footage";
  filming_dates: string;
  filming_location: string;
  filming_notes: string;
  shot_plan: ShotPlan | null;
  completed: boolean;
};

export type ShotPlan = {
  shots: { shot: string; detail: string; seconds: number }[];
  talking_points: string[];
  tips: string[];
};

export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type ContentIdea = {
  id: string;
  title: string;
  hook: string;
  description: string;
  pillar: string;
  platform: string;
  format: string;
  /** Ratings from 1 to 5; 0 means not rated yet. Effort 5 is the easiest. */
  fit: number;
  hook_score: number;
  effort: number;
  verdict: string;
  source: "claude" | "you";
  shortlisted: boolean;
  /** The shot list, once the agency has written one. */
  shots?: ShotPlan | null;
};

export type CalendarSlot = { id: string; idea_id: string; date: string; platform: string; project_id: string };

/** A customer's business, goals and content strategy, shared by all of its videos. */
export type BusinessPlan = {
  name: string;
  industry: string;
  offer: string;
  audience: string;
  location: string;
  links: string;
  stage: string;
  goals: string[];
  goal_notes: string;
  involvement: string;
  platforms: string[];
  posts_per_week: number;
  posting_days: Day[];
  pillars: string[];
  voice: string[];
  inspiration: string;
  strategy_summary: string;
  ideas: ContentIdea[];
  calendar: CalendarSlot[];
};

export type Business = { id: string; updated_at: number; plan: BusinessPlan };

/** Answers to the questionnaire shown before the editor. */
export type SubtitleBrief = {
  preset: string;
  font: "Inter" | "Montserrat" | "Anton" | "Poppins" | "Playfair Display";
  size: "S" | "M" | "L" | "XL";
  case: "as_spoken" | "upper" | "lower";
  words: "one" | "few" | "line";
  color: string;
  highlight: string;
  outline: "none" | "outline" | "shadow";
  background: boolean;
  background_color: string;
  animation: "none" | "pop" | "fade" | "bounce" | "karaoke" | "typewriter";
  position: "top" | "center" | "bottom";
  emojis: boolean;
};

export type Brief = {
  scope: "" | "whole" | "part";
  parts: string[];
  part_details: Record<string, string>;
  /** Parts to copy from the reference video, each with an optional note. */
  reference_features: Record<string, string>;
  request: string;
  format: string;
  custom_format: string;
  platforms: string[];
  sections: string[];
  about: string;
  length: number;
  style: string;
  style_notes: string;
  reference_url: string;
  reference_notes: string;
  dive_deeper: boolean;
  cut_type: string;
  sound_effects: string;
  motion_graphics: string;
  motion_graphics_notes: string;
  /** How the footage reaches Reel: linked from a folder on this computer, or uploaded. */
  footage_source?: "" | "folder" | "client" | "upload";
  footage_folder?: string;
  subtitles: SubtitleBrief | null;
  /** A previous video in Reel whose editing this one should copy, and what should be different. */
  like_project?: string;
  like_notes?: string;
  completed: boolean;
};

/** A video already edited in Reel, offered as "edit it like this one". */
export type PastEdit = {
  id: string; name: string; title: string; summary: string; style: string; aspect: string;
  seconds: number | null; client: string; cover_url: string | null; has_export: boolean; edited_at: number;
};

export type ReferenceStyle = {
  summary: string; pacing: string; cuts: string; transitions: string; motion_graphics: string; music: string;
  sound_effects: string; color_grading: string; broll: string; captions: string; techniques: string[];
  /** Aspects the reference actually uses (missing on analyses made before this existed). */
  present?: (keyof Omit<ReferenceStyle, "summary" | "techniques" | "present">)[];
};

export type Reference = {
  id: string;
  filename: string;
  size: number;
  status: "queued" | "processing" | "ready" | "error";
  stage: string | null;
  progress: number;
  error: string | null;
  duration: number | null;
  thumb_url: string | null;
  measurements: Record<string, unknown> | null;
  style: ReferenceStyle | null;
};

export type User = { id: string; label: string; method: string };

export type Asset = {
  id: string;
  detection?: { kind: AssetKind; use: boolean; reason: string } | null;
  kind: AssetKind;
  filename: string;
  size: number;
  status: "queued" | "processing" | "ready" | "error";
  stage: string | null;
  progress: number;
  error: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  has_audio: boolean | null;
  thumb_url: string | null;
  audio_url?: string;
  speaker_found: boolean | null;
  steadied?: boolean; // shaky handheld/action footage Reel stabilises
  colour?: string | null; // LOG/HDR footage Reel turns into normal colour, e.g. "Sony S-Log3 / S-Gamut3"
  transcript: { language: string; words: number; preview: string } | null;
};

export type Project = {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  settings: Settings;
  asset_counts: Partial<Record<AssetKind, number>>;
  cover_url: string | null;
  has_export: boolean;
};

export type Render = {
  saved_to?: string | null;
  chapters?: string; // YouTube chapters ("0:00 Intro" per line), for long videos
  id: string;
  plan_id: string;
  quality: "preview" | "final";
  resolution?: string | null; // exports: "720p" | "1080p" | "1440p" | "2160p"
  status: "queued" | "running" | "done" | "error";
  progress: number;
  error: string | null;
  video_url: string | null;
  download_url: string | null;
  size?: number;
};

export type PlanSummary = {
  used_assets?: { id: string; filename: string; kind: AssetKind }[];
  id: string;
  title: string;
  summary: string;
  width: number;
  height: number;
  duration_seconds: number;
  stats: {
    fillers_removed: number;
    pauses_removed: number;
    slow_motion?: number;
    cuts: number;
    punch_ins: number;
    broll: number;
    sfx: number;
    caption_pages: number;
    music: boolean;
    logo: boolean;
    graphics?: number;
    picture_only_seconds?: number;
    output_seconds: number;
    warnings: string[];
  };
};

export type Generation = {
  id: string;
  status: "queued" | "running" | "done" | "error";
  stage: "analyzing" | "transcribing" | "planning" | "preview" | "done";
  progress: number;
  message: string | null;
  error: string | null;
  plan: PlanSummary | null;
  preview: Render | null;
  settings: Settings;
  created_at: number;
};

export type ProjectState = {
  media_review_running?: boolean;
  project: Project;
  assets: Asset[];
  generation: Generation | null;
  export: Render | null;
  reference?: Reference | null;
};

export type StylePreset = { id: string; label: string; tagline: string; accent: string; defaults: Settings };
export type Presets = { styles: StylePreset[]; durations: number[]; caption_colors: string[]; defaults: Settings };

export type UsageWindow = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
};
export type LimitWindow = { label: string; percent: number; resets: string | null };
export type Usage = {
  connection: User;
  plan: string | null;
  subscription_limits: { available: boolean; windows: LimitWindow[]; observed_at: number | null };
  app_usage: { last_5_hours: UsageWindow; last_7_days: UsageWindow };
};

export type ClaudeCodeStatus = {
  installed: boolean;
  logged_in: boolean;
  subscription: boolean;
  plan: string | null;
  email: string | null;
  local: boolean;
  problem: string | null;
};
export type AuthOptions = { claude_code: ClaudeCodeStatus; signin_command: string };

export type EditorId = "resolve" | "fcp" | "premiere";
export type EditorInfo = { id: EditorId; name: string; installed: boolean; app: string | null };
export type EditorConnection = { editor: EditorId; name: string; live: boolean | null; connected_at: number };
export type EditorCheck = { installed: boolean; live: boolean | null; message: string; product?: string; version?: string; error?: string };
export type Handoff = {
  editor: EditorId;
  name: string;
  method: "live" | "opened" | "file";
  message: string;
  error?: string;
  folder: string;
  downloads: Partial<Record<"fcpxml" | "xml" | "srt", string>>;
};

export type FontName = "Inter" | "Montserrat" | "Anton" | "Poppins" | "Playfair Display";
export type BrandSheet = {
  name: string; summary: string; inspired_by: string; own_twist: string;
  headline_font: FontName;
  colors: { primary: string; accent: string; text: string };
  captions: { font: FontName; words: "one" | "few" | "line"; uppercase: boolean; animation: "none" | "pop" | "rise"; background: "none" | "box" | "shadow"; position: "top" | "center" | "bottom"; notes: string };
  pacing: string; shot_seconds: number; pause_seconds: number;
  cuts: string; transitions: ("cut" | "zoom" | "whip" | "flash" | "blur" | "fade")[];
  zooms: string; zoom_amount: "none" | "subtle" | "strong";
  motion_graphics: string; graphics_amount: "none" | "subtle" | "normal" | "plenty";
  music: string; sound_effects: string; sfx_amount: "none" | "few" | "many";
  color_grade: "none" | "warm" | "cool" | "cinematic" | "vivid" | "mono" | "clean"; color_notes: string;
  do: string[]; dont: string[];
};
export type BrandSource = { key: string; kind: "link" | "file"; label: string; note: string; status: "ready" | "error"; error: string | null; thumb_url: string | null };
export type ClientFolderInfo = { path: string; exists: boolean; counts: Record<string, number> };
export type Brand = {
  status: "none" | "working" | "draft" | "approved" | "error";
  stage: string | null; progress: number; error: string | null;
  sheet: BrandSheet | null; sources: BrandSource[]; approved_at: number | null; folder: ClientFolderInfo;
};
export type StoryboardPanel = {
  index: number; start: number; end: number; clip: string; source: [number, number]; transition: string;
  words: string; broll: string; graphics: string[]; text: string[]; zoom: boolean; speed?: string; chapter?: string; frame_url: string | null;
};
export type Storyboard = { panels: StoryboardPanel[]; music: string; duration: number; approved_at: number | null };
