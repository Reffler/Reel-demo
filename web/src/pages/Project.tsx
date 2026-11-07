import { tracked } from "../saveStatus";
import * as stylex from "@stylexjs/stylex";
import { A, useNavigate, useParams } from "@solidjs/router";
import { Match, Show, Switch, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { api, type ProjectState, type Settings } from "../api";
import { AgencyFlow } from "../components/AgencyFlow";
import { ExportStep } from "../components/ExportStep";
import { PreviewStep } from "../components/PreviewStep";
import { Questionnaire } from "../components/Questionnaire";
import { referenceUpload } from "../referenceUpload";
import { type Uploading } from "../components/UploadStep";
import { sx } from "../sx";
import { color } from "../tokens.stylex";
import { Spinner } from "../ui/kit";

export type Step = "plan" | "brief" | "upload" | "configure" | "preview" | "export";

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "configure", label: "Configure" },
  { id: "preview", label: "Preview" },
  { id: "export", label: "Export" },
];

const s = stylex.create({
  center: { display: "grid", placeItems: "center", paddingBlock: 100, color: color.muted, gap: 12 },
});

export function ProjectPage() {
  const params = useParams<{ id: string; step?: string }>();
  const navigate = useNavigate();
  const [state, setState] = createStore<{ data: ProjectState | null; error: string }>({ data: null, error: "" });
  const [settings, setSettings] = createStore<Settings>({} as Settings);
  const [uploads, setUploads] = createSignal<Uploading[]>([]);
  const [name, setName] = createSignal("");
  let settingsLoaded = false;

  async function refresh() {
    try {
      const data = await api<ProjectState>(`/api/projects/${params.id}`);
      setState("data", reconcile(data));
      if (!settingsLoaded) {
        // A copy: sharing the object with state.data would let every later poll overwrite
        // what the user is typing with the last saved settings.
        setSettings(reconcile(structuredClone(data.project.settings)));
        setName(data.project.name);
        settingsLoaded = true;
      }
    } catch (e) {
      setState("error", (e as Error).message);
    }
  }

  // Poll quickly while anything is processing, slowly otherwise.
  const busy = createMemo(() => {
    const d = state.data;
    if (!d) return false;
    return (
      uploads().length > 0 || d.media_review_running || !!referenceUpload(params.id) ||
      d.reference?.status === "queued" || d.reference?.status === "processing" ||
      d.assets.some((a) => a.status === "queued" || a.status === "processing") ||
      (d.generation && (d.generation.status === "queued" || d.generation.status === "running")) ||
      (d.export && (d.export.status === "queued" || d.export.status === "running"))
    );
  });
  createEffect(
    on(
      () => params.id,
      () => {
        settingsLoaded = false;
        setState({ data: null, error: "" });
        void refresh();
      },
    ),
  );
  let timer: number | undefined;
  createEffect(() => {
    window.clearInterval(timer);
    timer = window.setInterval(refresh, busy() ? 1200 : 8000);
  });
  onCleanup(() => window.clearInterval(timer));

  // Debounced settings autosave.
  let saveTimer: number | undefined;
  const updateSettings = (next: Settings) => {
    setSettings(reconcile(next));
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void tracked(() => api(`/api/projects/${params.id}/settings`, { method: "PUT", json: next })).catch(() => {});
    }, 400);
  };

  const hasVideo = () => !!state.data?.assets.some((a) => (a.kind === "main" || a.kind === "broll") && a.status !== "error");
  const enabled = (step: Step) => {
    const d = state.data;
    if (!d) return false;
    if (step === "upload") return true;
    if (step === "configure") return hasVideo();
    if (step === "preview") return !!d.generation;
    return !!d.export || d.generation?.status === "done";
  };
  const step = createMemo<Step>(() => {
    const requested = params.step as Step | undefined;
    if (requested === "plan" || requested === "brief") return requested;
    // New projects start with the planning steps until they hand over to the questionnaire.
    if (!requested && settings.agency && !settings.agency.completed) return "plan";
    if (requested && STEPS.some((x) => x.id === requested) && enabled(requested)) return requested;
    const d = state.data;
    if (!d) return "upload";
    if (d.export && requested === "export") return "export";
    if (d.generation) return "preview";
    return "configure";
  });
  const go = (st: Step) => navigate(`/p/${params.id}/${st}`);

  return (
    <Show
      when={state.data}
      fallback={
        <div {...sx(s.center)}>
          <Show when={state.error} fallback={<Spinner />}>
            {state.error}
          </Show>
        </div>
      }
    >
      {(data) => (
        <>
          <Show when={step() === "preview" || step() === "export"}>
            <div class="project-context"><A href="/projects">← Projects</A><span>{name()}</span></div>
          </Show>
          <Switch>
            <Match when={step() === "plan"}>
              <AgencyFlow projectId={params.id} settings={settings} onChange={updateSettings} onDone={() => go("brief")} />
            </Match>
            <Match when={step() === "brief" || step() === "upload" || step() === "configure"}>
              <Questionnaire reviewRunning={!!data().media_review_running} projectId={params.id} assets={data().assets} settings={settings}
                onChange={updateSettings} refresh={refresh} uploads={uploads()} setUploads={setUploads}
                reference={data().reference} generation={data().generation} onCreated={() => go("preview")}
                onBackToPlan={settings.agency ? () => go("plan") : undefined} />
            </Match>
            <Match when={step() === "preview"}>
              <PreviewStep
                projectId={params.id}
                generation={data().generation!}
                settings={settings}
                exportRender={data().export}
                refresh={refresh}
                onConfigure={() => go("configure")}
                onExport={() => go("export")}
              />
            </Match>
            <Match when={step() === "export"}>
              <ExportStep
                projectId={params.id}
                projectName={data().project.name}
                generation={data().generation}
                exportRender={data().export}
                refresh={refresh}
                onPreview={() => go("preview")}
              />
            </Match>
          </Switch>
        </>
      )}
    </Show>
  );
}
