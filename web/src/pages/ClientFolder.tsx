import { A, useNavigate, useParams } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { api, type Brand, type Business, type ContentIdea, type Project } from "../api";
import { niceDate, type PortalSummary } from "../portal";
import { Spinner } from "../ui/kit";
import { IconArrowLeft, IconCheck, IconFolder, IconPlus, IconSpark, IconVideo } from "../ui/icons";
import { ProjectCard } from "./Projects";
import { ClientMemory } from "../components/ClientMemory";

// One client's folder: their content ideas, each with the videos made for it, and their other videos.

export function ClientFolder() {
  const params = useParams();
  const navigate = useNavigate();
  const [data, { refetch }] = createResource(() => params.id, async () => {
    const [b, p, c, k] = await Promise.all([
      api<{ businesses: Business[] }>("/api/businesses"),
      api<{ projects: Project[] }>("/api/projects"),
      api<{ portals: PortalSummary[] }>("/api/portals"),
      api<{ brand: Brand }>(`/api/businesses/${params.id}/brand`).catch(() => null),
    ]);
    return { businesses: b.businesses, projects: p.projects, portal: c.portals.find(x => x.business_id === params.id), brand: k?.brand };
  });
  const [busy, setBusy] = createSignal("");
  const [error, setError] = createSignal("");

  const business = () => data()?.businesses.find(b => b.id === params.id);
  const plan = () => business()!.plan;
  const videos = () => (data()?.projects ?? []).filter(p => p.settings.agency?.business_id === params.id);
  const slot = (id: string) => plan().calendar.find(s => s.idea_id === id);
  const ideas = () => {
    const list = plan().ideas.some(i => i.shortlisted) ? plan().ideas.filter(i => i.shortlisted || videosFor(i.id).length) : plan().ideas;
    return [...list].sort((a, b) => (slot(a.id)?.date || "9999").localeCompare(slot(b.id)?.date || "9999"));
  };
  const videosFor = (ideaId: string) => videos().filter(v => v.settings.agency?.idea_id === ideaId);
  const loose = () => videos().filter(v => !plan().ideas.some(i => i.id === v.settings.agency?.idea_id));

  async function make(idea?: ContentIdea) {
    setBusy(idea?.id ?? "new"); setError("");
    try {
      const { project } = await api<{ project: Project }>("/api/projects", { method: "POST", json: { name: idea?.title || `${plan().name} video`, business_id: params.id, idea_id: idea?.id ?? "" } });
      navigate(`/p/${project.id}/plan`);
    } catch (e) { setError((e as Error).message); setBusy(""); }
  }
  async function openFolder(sub = "") {
    setError("");
    try {
      if (!data()?.brand?.folder.exists) await api(`/api/businesses/${params.id}/folder`, { method: "POST" });
      await api(`/api/businesses/${params.id}/folder/open`, { method: "POST", json: { sub } });
      refetch();
    } catch (e) { setError((e as Error).message); }
  }
  const folderCount = (sub: string) => Object.entries(data()?.brand?.folder.counts ?? {})
    .filter(([k]) => k === sub || k.startsWith(sub + "/")).reduce((n, [, v]) => n + v, 0);
  const brandLine = () => {
    const k = data()?.brand;
    if (!k || k.status === "none") return "Not made yet. Reel learns the client's style from their reference videos.";
    if (k.status === "working") return k.stage || "Studying the reference videos…";
    if (k.status === "error") return k.error || "Couldn't make it.";
    return `${k.sheet?.name ?? "Brand sheet"} · ${k.status === "approved" ? "approved, every edit follows it" : "waiting for your approval"}`;
  };
  async function remove(p: Project, e: Event) {
    e.stopPropagation();
    if (!confirm(`Delete “${p.name}” and all of its media?`)) return;
    await api(`/api/projects/${p.id}`, { method: "DELETE" });
    refetch();
  }
  // One menu per video: which idea it is, or move it to another client.
  const filing = (p: Project) => <label class="project-move">
    <IconFolder size={14} />
    <select aria-label={`File ${p.name}`} value={`idea:${p.settings.agency?.idea_id ?? ""}`} onChange={async e => {
      const [kind, id] = e.currentTarget.value.split(":");
      await api(`/api/projects/${p.id}/client`, { method: "PUT", json: kind === "idea" ? { business_id: params.id, idea_id: id } : { business_id: id, idea_id: "" } });
      refetch();
    }}>
      <option value="idea:">No idea picked</option>
      <optgroup label="Idea">
        <For each={plan().ideas}>{i => <option value={`idea:${i.id}`}>{i.title}</option>}</For>
      </optgroup>
      <optgroup label="Move to">
        <For each={(data()?.businesses ?? []).filter(b => b.id !== params.id && b.plan.name)}>{b => <option value={`client:${b.id}`}>{b.plan.name}</option>}</For>
        <option value="client:">No client</option>
      </optgroup>
    </select>
  </label>;

  return <Show when={!data.loading} fallback={<div class="portal-loading"><Spinner /></div>}>
    <Show when={business()} fallback={<div class="portal-loading"><p>This client isn't here anymore. <A href="/projects" class="inline-link">Back to projects</A></p></div>}>
      <div class="folder-page">
        <A href="/projects" class="text-button portal-back"><IconArrowLeft size={16} />Projects</A>
        <div class="portal-list-head">
          <div><p class="portal-eyebrow">Client</p><h1>{plan().name}</h1></div>
          <div class="portal-actions">
            <Show when={data()?.portal}><A class="back-button" href={`/clients/${data()!.portal!.id}`}>Client page</A></Show>
            <button class="next-button" disabled={!!busy()} onClick={() => void make()}>{busy() === "new" ? <Spinner /> : <IconPlus size={18} />}New video</button>
          </div>
        </div>
        <Show when={error()}><p class="form-error">{error()}</p></Show>

        <div class="client-kit">
          <A class="client-kit-card" href={`/projects/client/${params.id}/brand`}>
            <span class="client-kit-icon">{data()?.brand?.status === "approved" ? <IconCheck size={18} /> : <IconSpark size={18} />}</span>
            <div><strong>Brand sheet</strong><span>{brandLine()}</span></div>
          </A>
          <div class="client-kit-card">
            <span class="client-kit-icon"><IconFolder size={18} /></span>
            <div><strong>Client folder</strong>
              <span>{data()?.brand?.folder.path}</span>
              <div class="client-kit-links">
                <For each={[["raw footage", "Raw footage"], ["references", "References"], ["exports", "Exports"]] as const}>{([sub, label]) =>
                  <button class="text-button" onClick={() => void openFolder(sub)}>{label}<Show when={folderCount(sub)}>{n => <small>{n()}</small>}</Show></button>}</For>
              </div>
            </div>
          </div>
        </div>

        <ClientMemory businessId={params.id!} />

        <Show when={ideas().length}>
          <h2 class="projects-section">Content ideas</h2>
          <div class="folder-ideas"><For each={ideas()}>{idea => <section class="folder-idea">
            <div class="folder-idea-head">
              <div><strong>{idea.title}</strong>
                <span>{[slot(idea.id) && niceDate(slot(idea.id)!.date), idea.format, slot(idea.id)?.platform || idea.platform, idea.shots?.shots.length ? `${idea.shots.shots.length} shots` : ""].filter(Boolean).join(" · ")}</span></div>
              <button class={videosFor(idea.id).length ? "text-button" : "next-button"} disabled={!!busy()} onClick={() => void make(idea)}>
                {busy() === idea.id ? <Spinner /> : videosFor(idea.id).length ? <IconPlus size={16} /> : <IconVideo size={18} />}{videosFor(idea.id).length ? "Another version" : "Make this video"}
              </button>
            </div>
            <Show when={videosFor(idea.id).length}>
              <div class="folder-videos"><For each={videosFor(idea.id)}>{(p, i) => <ProjectCard project={p} index={i()} onRemove={remove} footer={filing(p)} />}</For></div>
            </Show>
          </section>}</For></div>
        </Show>

        <Show when={loose().length}>
          <h2 class="projects-section">{ideas().length ? "Other videos" : "Videos"}</h2>
          <div class="folder-videos"><For each={loose()}>{(p, i) => <ProjectCard project={p} index={i()} onRemove={remove} footer={filing(p)} />}</For></div>
        </Show>

        <Show when={!ideas().length && !loose().length}>
          <div class="portal-wait"><IconVideo size={22} /><div><strong>No videos yet</strong><p>Ideas from the content plan show up here, each with its videos.</p></div></div>
        </Show>
      </div>
    </Show>
  </Show>;
}
