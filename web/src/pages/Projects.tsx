import * as stylex from "@stylexjs/stylex";
import { A, useNavigate } from "@solidjs/router";
import { For, Show, createResource, createSignal, type JSX } from "solid-js";
import { api, mediaUrl, type Business, type Project } from "../api";
import { fmtAgo } from "../format";
import { sx } from "../sx";
import { color, radius } from "../tokens.stylex";
import { IconFilm, IconFolder, IconPlus, IconTrash } from "../ui/icons";
import { Button, Card, Spinner, TextInput } from "../ui/kit";

const fadeUp = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const s = stylex.create({
  head: {
    display: "flex",
    alignItems: { default: "flex-start", "@media (min-width: 720px)": "flex-end" },
    flexDirection: { default: "column", "@media (min-width: 720px)": "row" },
    justifyContent: "space-between",
    gap: 16,
    paddingTop: 44,
    marginBottom: 28,
  },
  h1: { fontSize: 34, fontWeight: 700, letterSpacing: "-0.022em", margin: 0 },
  sub: { color: color.muted, marginTop: 6 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 18,
  },
  project: {
    position: "relative",
    textAlign: "left",
    padding: 0,
    overflow: "hidden",
    cursor: "pointer",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: color.border, ":hover": color.borderStrong },
    backgroundColor: color.surface,
    color: color.text,
    transitionProperty: "transform, border-color, box-shadow",
    transitionDuration: "200ms",
    transform: { default: "none", ":active": "scale(0.99)" },
    animationName: fadeUp,
    animationDuration: "350ms",
    animationFillMode: "both",
    outline: { default: "none", ":focus-visible": `2px solid ${color.accent}` },
  },
  cover: {
    position: "relative",
    aspectRatio: "16 / 10",
    backgroundColor: color.surface2,
    display: "grid",
    placeItems: "center",
    color: color.faint,
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  body: { padding: 16 },
  name: { fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { fontSize: 13, color: color.muted, marginTop: 4 },
  exported: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingInline: 10,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    backdropFilter: "blur(6px)",
  },
  del: {
    position: "absolute",
    top: 10,
    right: 10,
    // Always shown on touch screens and to keyboard users; on hover otherwise.
    opacity: { default: 0, ":focus-within": 1, "@media (hover: none)": 1 },
    transitionProperty: "opacity",
    transitionDuration: "150ms",
  },
  delVisible: { opacity: 1 },
  stage: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: color.muted,
    marginBottom: 10,
  },
  stageDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: color.faint },
  stageDotActive: { backgroundColor: color.accent },
  stageDotDone: { backgroundColor: color.success },
  newCard: { padding: 20, marginBottom: 22, animationName: fadeUp, animationDuration: "200ms" },
  newRow: { display: "flex", gap: 10, flexDirection: { default: "column", "@media (min-width: 600px)": "row" } },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 12,
    paddingBlock: 80,
    paddingInline: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    display: "grid",
    placeItems: "center",
    backgroundColor: color.surface,
    color: color.muted,
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 20, fontWeight: 700 },
  center: { display: "grid", placeItems: "center", paddingBlock: 80, color: color.muted },
  error: { color: color.danger, fontSize: 14, marginTop: 10 },
});

const KIND_WORDS: Record<string, [string, string]> = {
  main: ["clip", "clips"],
  broll: ["B-roll", "B-roll"],
  image: ["image", "images"],
  music: ["track", "tracks"],
};

// Where a project stands, so cards without a picture still tell apart.
function stage(p: Project): { label: string; tone: "active" | "done" | "idle" } {
  const st = p.settings;
  if (p.has_export) return { label: "Exported", tone: "done" };
  if (st.agency && !st.agency.completed) return { label: "Planning", tone: "active" };
  if (st.brief?.completed) return { label: "Editing", tone: "active" };
  if (st.brief?.scope) return { label: "Brief in progress", tone: "active" };
  return { label: "Not started", tone: "idle" };
}

function describe(p: Project) {
  const parts = Object.entries(KIND_WORDS)
    .filter(([k]) => p.asset_counts[k as keyof Project["asset_counts"]])
    .map(([k, [one, many]]) => {
      const n = p.asset_counts[k as keyof Project["asset_counts"]]!;
      return `${n} ${n === 1 ? one : many}`;
    });
  return parts.length ? parts.join(" · ") : "No media yet";
}


/** What a dragged video card carries, so only Reel videos light up a folder. */
const DRAG_TYPE = "application/x-reel-project";

/** One video as a card: cover, where it stands, and its media. Used on Projects and in client folders. */
export function ProjectCard(props: { project: Project; index: number; onRemove: (p: Project, e: Event) => void; footer?: JSX.Element; draggable?: boolean }) {
  const navigate = useNavigate();
  const [hover, setHover] = createSignal(false);
  const [dragging, setDragging] = createSignal(false);
  return (
                <div
                  role="link"
                  tabindex="0"
                  {...sx(s.project)}
                  classList={{ "project-dragging": dragging() }}
                  draggable={props.draggable}
                  onDragStart={(e) => {
                    if (!e.dataTransfer) return;
                    e.dataTransfer.setData(DRAG_TYPE, props.project.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(true);
                  }}
                  onDragEnd={() => setDragging(false)}
                  style={{ "animation-delay": `${Math.min(props.index, 8) * 40}ms` }}
                  onClick={() => navigate(`/p/${props.project.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/p/${props.project.id}`)}
                  onMouseEnter={() => setHover(true)}
                  onMouseLeave={() => setHover(false)}
                >
                  <Show when={props.project.cover_url}>
                    <div {...sx(s.cover)}>
                      <img src={mediaUrl(props.project.cover_url)} alt="" draggable={false} {...sx(s.img)} />
                    </div>
                  </Show>
                  <div {...sx(s.body)}>
                    <span {...sx(s.stage)}>
                      <span {...sx(s.stageDot, stage(props.project).tone === "active" && s.stageDotActive, stage(props.project).tone === "done" && s.stageDotDone)} />
                      {stage(props.project).label}
                    </span>
                    <div {...sx(s.name)}>{props.project.name}</div>
                    <div {...sx(s.meta)}>
                      {describe(props.project)} · {fmtAgo(props.project.updated_at)}
                    </div>
                  </div>
                  <Show when={props.footer}><div class="project-footer" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>{props.footer}</div></Show>
                  <span {...sx(s.del, hover() && s.delVisible)}>
                    <Button variant="danger" size="sm" iconOnly aria-label={`Delete ${props.project.name}`} onClick={(e) => props.onRemove(props.project, e)}>
                      <IconTrash size={15} />
                    </Button>
                  </span>
                </div>
  );
}

/** Files a video under a client, or takes it out. */
export function MoveToClient(props: { project: Project; businesses: Business[]; onMoved: () => void }) {
  const current = () => props.project.settings.agency?.business_id ?? "";
  return <label class="project-move">
    <IconFolder size={14} />
    <select aria-label={`Client for ${props.project.name}`} value={current()} onChange={async (e) => {
      await api(`/api/projects/${props.project.id}/client`, { method: "PUT", json: { business_id: e.currentTarget.value, idea_id: "" } });
      props.onMoved();
    }}>
      <option value="">No client</option>
      <For each={props.businesses.filter(b => b.plan.name)}>{b => <option value={b.id}>{b.plan.name}</option>}</For>
    </select>
  </label>;
}

export function Projects() {
  const navigate = useNavigate();
  const [projects, { refetch }] = createResource(() => api<{ projects: Project[] }>("/api/projects").then((r) => r.projects));
  const [creating, setCreating] = createSignal(false);
  const [name, setName] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [businesses, { refetch: refetchBusinesses }] = createResource(() => api<{ businesses: Business[] }>("/api/businesses").then((r) => r.businesses));
  const [client, setClient] = createSignal("");
  // Videos sit in their client's folder; the rest are listed below the folders.
  const known = () => new Set((businesses() ?? []).filter(b => b.plan.name).map(b => b.id));
  const clientOf = (p: Project) => p.settings.agency?.business_id ?? "";
  const folders = () => (businesses() ?? []).filter(b => b.plan.name).map(b => ({ b, videos: (projects() ?? []).filter(p => clientOf(p) === b.id) }))
    .sort((x, y) => Math.max(y.b.updated_at, ...y.videos.map(v => v.updated_at)) - Math.max(x.b.updated_at, ...x.videos.map(v => v.updated_at)));
  const loose = () => (projects() ?? []).filter(p => !known().has(clientOf(p)));
  // A new video can start with the planning steps, or go straight to the editing questions.
  const [start, setStart] = createSignal<"plan" | "edit">("plan");

  async function create(e: Event) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { project } = await api<{ project: Project }>("/api/projects", {
        method: "POST",
        json: { name: name().trim() || "Untitled edit", business_id: client() || (folders().length ? "none" : "") },
      });
      if (start() === "edit" || (folders().length && !client())) {
        const agency = project.settings.agency;
        if (agency) await api(`/api/projects/${project.id}/settings`, { method: "PUT", json: { ...project.settings, agency: { ...agency, completed: true } } });
        navigate(`/p/${project.id}/brief`);
      } else navigate(`/p/${project.id}/plan`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove(p: Project, e: Event) {
    e.stopPropagation();
    if (!confirm(`Delete “${p.name}” and all of its media?`)) return;
    await api(`/api/projects/${p.id}`, { method: "DELETE" });
    refetch();
  }
  const refetchAll = () => { refetch(); refetchBusinesses(); };

  // Dragging a video card onto a client folder files it there.
  const [dropOn, setDropOn] = createSignal("");
  const [moveError, setMoveError] = createSignal("");
  const isVideo = (e: DragEvent) => !!e.dataTransfer?.types.includes(DRAG_TYPE);
  async function fileUnder(projectId: string, businessId: string) {
    if (!projectId) return;
    setMoveError("");
    try {
      await api(`/api/projects/${projectId}/client`, { method: "PUT", json: { business_id: businessId, idea_id: "" } });
    } catch (err) {
      setMoveError((err as Error).message);
    }
    refetchAll();
  }

  return (
    <>
      <div {...sx(s.head)}>
        <div>
          <h1 {...sx(s.h1)}>Projects</h1>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <IconPlus size={17} /> New project
        </Button>
      </div>

      <Show when={creating()}>
        <Card style={s.newCard}>
          <form onSubmit={create} {...sx(s.newRow)}>
            <TextInput
              ref={(el) => queueMicrotask(() => el.focus())}
              placeholder="Name your project — e.g. “Launch teaser”"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              maxLength={120}
            />
            <Button variant="primary" type="submit" loading={busy()}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </form>
          <Show when={folders().length}>
            <label class="project-client">For
              <select value={client()} onChange={(e) => setClient(e.currentTarget.value)}>
                <option value="">No client</option>
                <For each={folders()}>{f => <option value={f.b.id}>{f.b.plan.name}</option>}</For>
              </select>
            </label>
          </Show>
          <Show when={client() || !folders().length}><div class="start-choice" role="radiogroup" aria-label="How to start">
            <button type="button" role="radio" aria-checked={start() === "plan"} onClick={() => setStart("plan")}>
              <strong>Plan it first</strong><span>Business, goals, ideas and filming, then the edit</span>
            </button>
            <button type="button" role="radio" aria-checked={start() === "edit"} onClick={() => setStart("edit")}>
              <strong>Go straight to editing</strong><span>You already know what the video is</span>
            </button>
          </div></Show>
          <Show when={error()}>
            <div {...sx(s.error)}>{error()}</div>
          </Show>
        </Card>
      </Show>

      <Show
        when={!projects.loading}
        fallback={
          <div {...sx(s.center)}>
            <Spinner />
          </div>
        }
      >
        <Show
          when={projects()?.length || folders().length}
          fallback={
            <Show when={!creating()}>
              <Card>
                <div {...sx(s.empty)}>
                  <div {...sx(s.emptyIcon)}>
                    <IconFilm size={28} />
                  </div>
                  <div {...sx(s.emptyTitle)}>Make your first edit</div>
                  <div {...sx(s.sub)}>Tell us about your business, plan your posts, and Claude edits the videos.</div>
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    <IconPlus size={17} /> New project
                  </Button>
                </div>
              </Card>
            </Show>
          }
        >
          <Show when={folders().length}>
            <h2 class="projects-section">Clients</h2>
            <div class="folder-grid">
              <For each={folders()}>{(f) => <A class={`folder-card${dropOn() === f.b.id ? " drop-target" : ""}`} href={`/projects/client/${f.b.id}`}
                onDragEnter={(e) => { if (isVideo(e)) { e.preventDefault(); setDropOn(f.b.id); } }}
                onDragOver={(e) => { if (isVideo(e)) { e.preventDefault(); e.dataTransfer!.dropEffect = "move"; setDropOn(f.b.id); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null) && dropOn() === f.b.id) setDropOn(""); }}
                onDrop={(e) => { e.preventDefault(); setDropOn(""); fileUnder(e.dataTransfer?.getData(DRAG_TYPE) ?? "", f.b.id); }}>
                <span class="folder-icon"><IconFolder size={22} /></span>
                <span class="folder-text"><strong>{f.b.plan.name}</strong>
                  <span>{[`${f.videos.length} ${f.videos.length === 1 ? "video" : "videos"}`, f.b.plan.ideas.length ? `${f.b.plan.ideas.length} ${f.b.plan.ideas.length === 1 ? "idea" : "ideas"}` : ""].filter(Boolean).join(" · ")}</span></span>
              </A>}</For>
            </div>
            <Show when={loose().length}>
              <h2 class="projects-section">Other videos</h2>
              <p class="projects-hint">Drag a video onto a client to put it in their folder.</p>
            </Show>
            <Show when={moveError()}><div {...sx(s.error)}>{moveError()}</div></Show>
          </Show>
          <div {...sx(s.grid)}>
            <For each={loose()}>
              {(p, i) => (
                <ProjectCard project={p} index={i()} onRemove={remove} draggable={folders().length > 0} footer={<MoveToClient project={p} businesses={businesses() ?? []} onMoved={refetchAll} />} />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </>
  );
}
