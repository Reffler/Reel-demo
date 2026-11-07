// The client portal: one shared page per client business that moves through four stages.
// The agency side calls `/api/portals/<id>/…` signed in; the client side calls `/api/portal/<token>/…`
// with the private link and no account. Both get the same `Portal` back.
import { API_BASE, DEMO, api, getToken, type BusinessPlan } from "./api";

export type Stage = "brief" | "strategy" | "filming" | "delivery";
export type Role = "agency" | "client";

export type FilmSlot = { id: string; date: string; time: string; location: string; note: string };

export type Delivery = {
  id: string;
  title: string;
  idea_id: string;
  render_id: string;
  file: string;
  url: string;
  post_date: string;
  platform: string;
  caption: string;
  status: "sent" | "changes" | "approved";
  version: number;
  sent_at: number;
  video_url?: string | null;
  download_url?: string | null;
};

export type PortalState = {
  client_name: string;
  client_email: string;
  stage: Stage;
  brief: "open" | "submitted" | "changes" | "approved";
  strategy: "draft" | "sent" | "changes" | "approved";
  filming: "draft" | "proposed" | "changes" | "booked" | "filmed";
  film_slots: FilmSlot[];
  film_choice: string;
  film_choices: string[];
  deliveries: Delivery[];
};

export type PortalEvent = {
  id: string;
  at: number;
  actor: Role;
  kind: string;
  stage: Stage;
  target: string;
  text: string;
};

export type Turn = { who: Role; what: string; /** What the client sees while it is the agency's turn. */ waiting?: string };

export type Portal = {
  id: string;
  business_id: string;
  role: Role;
  state: PortalState;
  turn: Turn;
  plan: BusinessPlan & { formats?: string[]; reference_videos?: ReferenceVideo[] };
  events: PortalEvent[];
  unread: number;
  seen: number;
  updated_at: number;
  link?: string;
  mail_ready?: boolean;
};

export type PortalSummary = {
  id: string;
  business_id: string;
  name: string;
  client_name: string;
  client_email: string;
  stage: Stage;
  turn: Turn;
  unread: number;
  last_event: PortalEvent | null;
  updated_at: number;
};

export type ActionBody = {
  action: string;
  text?: string;
  target?: string;
  slots?: FilmSlot[];
  choices?: string[];
  delivery?: Partial<Delivery>;
};

export type ClientBrief = Pick<BusinessPlan, "name" | "industry" | "offer" | "audience" | "location" | "links" | "stage" | "goals" | "goal_notes" | "platforms" | "inspiration"> & { formats: string[]; reference_videos: ReferenceVideo[] };

/** A video the client likes, so we see which formats and channels they have in mind. */
export type ReferenceVideo = { url: string; note: string };

/** Where this side of the portal talks to the server. */
export type PortalApi = {
  role: Role;
  /** The full content plan as a page (and PDF). */
  planHref: string;
  load: (peek?: boolean) => Promise<Portal>;
  act: (body: ActionBody) => Promise<Portal>;
  saveBrief?: (brief: ClientBrief) => Promise<unknown>;
};

export const agencyApi = (id: string): PortalApi => ({
  role: "agency",
  planHref: `/clients/${id}/plan`,
  load: async (peek) => (await api<{ portal: Portal }>(`/api/portals/${id}${peek ? "?peek=true" : ""}`)).portal,
  act: async (body) => (await api<{ portal: Portal }>(`/api/portals/${id}/action`, { method: "POST", json: body })).portal,
});

export const clientApi = (token: string): PortalApi => ({
  role: "client",
  planHref: `/c/${token}/plan`,
  load: async (peek) => (await api<{ portal: Portal }>(`/api/portal/${token}${peek ? "?peek=true" : ""}`)).portal,
  act: async (body) => (await api<{ portal: Portal }>(`/api/portal/${token}/action`, { method: "POST", json: body })).portal,
  saveBrief: (brief) => api(`/api/portal/${token}/brief`, { method: "PUT", json: brief }),
});

export const stages: { id: Stage; label: string; client: string; agency: string }[] = [
  { id: "brief", label: "Brief", client: "You tell us about your business", agency: "The client fills in the brief" },
  { id: "strategy", label: "Content plan", client: "We plan, you approve", agency: "You plan, the client approves" },
  { id: "filming", label: "Filming", client: "Pick a date, we film", agency: "Agree a date and film" },
  { id: "delivery", label: "Videos", client: "Approve and post", agency: "Edit, send, get approval" },
];

export const stageIndex = (s: Stage) => stages.findIndex((x) => x.id === s);

export function uploadPortalVideo(portalId: string, file: File, onProgress: (p: number) => void): Promise<{ file: string; filename: string }> {
  if (DEMO) return import("./mock/backend").then(m => m.mockUploadPortalVideo(file, onProgress));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${API_BASE}/api/portals/${portalId}/upload?${new URLSearchParams({ filename: file.name })}`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(JSON.parse(xhr.responseText));
      let msg = `Upload failed (${xhr.status})`;
      try {
        msg = JSON.parse(xhr.responseText).detail || msg;
      } catch {
        /* not JSON */
      }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Upload interrupted."));
    xhr.send(file);
  });
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const niceDate = (s: string, long = false) => {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" });
};
export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
