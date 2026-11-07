import { For, Show, createSignal } from "solid-js";
import { api, mediaUrl, type Reference, type ReferenceStyle } from "../api";
import { clearReferenceUpload, referenceUpload, startReferenceUpload } from "../referenceUpload";
import { IconRefresh, IconSwap, IconTrash } from "../ui/icons";

const aspects: { key: keyof ReferenceStyle; label: string }[] = [
  { key: "pacing", label: "Pacing" }, { key: "cuts", label: "Cuts" }, { key: "transitions", label: "Transitions" },
  { key: "motion_graphics", label: "Motion graphics" }, { key: "music", label: "Music" },
  { key: "sound_effects", label: "Sound effects" }, { key: "color_grading", label: "Color grading" },
  { key: "broll", label: "B-roll" }, { key: "captions", label: "Captions" },
];

const isVideo = (f: File) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(f.name);

/** Upload a reference video, follow its analysis, and show the editing style Claude found. */
export function ReferencePanel(props: {
  projectId: string; reference: Reference | null | undefined; refresh: () => Promise<void>;
  /** Leave out the style breakdown when the page lists it another way. */
  compact?: boolean;
}) {
  let input!: HTMLInputElement;
  const [dragging, setDragging] = createSignal(false);
  const [error, setError] = createSignal("");
  const upload = () => referenceUpload(props.projectId);
  const ref = () => props.reference ?? null;
  const analyzing = () => ref()?.status === "queued" || ref()?.status === "processing";

  function choose(files: FileList | null | undefined) {
    const file = files?.[0];
    setError("");
    if (!file) return;
    if (!isVideo(file)) return setError("Choose a video file, like an MP4 or MOV.");
    void startReferenceUpload(props.projectId, file, () => void props.refresh());
    void props.refresh();
  }
  async function remove() {
    clearReferenceUpload(props.projectId);
    await api(`/api/projects/${props.projectId}/reference`, { method: "DELETE" }).catch(() => {});
    await props.refresh();
  }
  async function retry() {
    await api(`/api/projects/${props.projectId}/reference/analyze`, { method: "POST" }).catch((e) => setError((e as Error).message));
    await props.refresh();
  }

  const Picker = () => <input ref={input} type="file" accept="video/*" hidden onChange={(e) => { choose(e.currentTarget.files); e.currentTarget.value = ""; }} />;

  return (
    <div class="reference-panel">
      <Picker />
      <Show
        when={upload() || ref()}
        fallback={
          <div class="folder-drop reference-drop" classList={{ dragging: dragging() }} role="button" tabindex={0}
            aria-label="Drop a video here or browse" onClick={() => input.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer?.files); }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" /></svg>
            <span class="folder-browse">Drop a video here or browse</span>
            <p>MP4, MOV or any common video. It uploads in the background while you keep going.</p>
          </div>
        }
      >
        <div class="reference-card">
          <Show when={ref()?.thumb_url && !upload()} fallback={<div class="reference-thumb placeholder"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" /></svg></div>}>
            <img class="reference-thumb" src={mediaUrl(ref()!.thumb_url)} alt="" />
          </Show>
          <div class="reference-info">
            <strong>{upload()?.filename ?? ref()?.filename}</strong>
            <Show when={upload()} fallback={
              <Show when={!analyzing()} fallback={<>
                <span class="media-status">{ref()?.stage ?? "Waiting"}…</span>
                <div class="media-progress-track"><div style={{ width: `${Math.round((ref()?.progress ?? 0) * 100)}%` }} /></div>
                <span class="reference-note">Claude is studying the editing style. You can keep going.</span>
              </>}>
                <Show when={ref()?.status === "error"} fallback={<span class="media-status">Style analyzed</span>}>
                  <span class="form-error">{ref()?.error}</span>
                </Show>
              </Show>
            }>
              <Show when={!upload()!.error} fallback={<span class="form-error">{upload()!.error}</span>}>
                <span class="media-status">Uploading {Math.round(upload()!.progress * 100)}%</span>
                <div class="media-progress-track"><div style={{ width: `${Math.round(upload()!.progress * 100)}%` }} /></div>
                <span class="reference-note">You can keep going. The upload continues in the background.</span>
              </Show>
            </Show>
          </div>
          <div class="reference-actions">
            <Show when={ref()?.status === "error" && !upload()}><button class="text-button" onClick={retry}><IconRefresh size={16} />Try again</button></Show>
            <Show when={!upload() || upload()!.error}><button class="text-button" onClick={() => input.click()}><IconSwap size={16} />Use another video</button></Show>
            <Show when={!upload() || upload()!.error}><button class="text-button danger" onClick={remove}><IconTrash size={16} />Remove</button></Show>
          </div>
        </div>
        <Show when={!props.compact && !upload() && ref()?.style}>{(style) => (
          <div class="reference-style">
            <p class="reference-summary">{style().summary}</p>
            <Show when={style().techniques.length}>
              <div class="reference-tags"><For each={style().techniques}>{(t) => <span>{t}</span>}</For></div>
            </Show>
            <div class="reference-grid"><For each={aspects}>{(a) => <div><h3>{a.label}</h3><p>{style()[a.key] as string}</p></div>}</For></div>
          </div>
        )}</Show>
      </Show>
      <Show when={error()}><p class="form-error" role="alert">{error()}</p></Show>
    </div>
  );
}
