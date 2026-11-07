import { For, Show, createEffect, createSignal } from "solid-js";
import { api, uploadFile, type Asset, type AssetKind, type Settings } from "../api";
import { mediaReadiness, type MediaActivity } from "../mediaReadiness";
import type { Uploading } from "./UploadStep";
import { IconFiles, IconRefresh, IconX } from "../ui/icons";

const kinds: { id: AssetKind; label: string }[] = [
  { id: "main", label: "Main footage and voice-over" }, { id: "broll", label: "B-roll" },
  { id: "image", label: "Images" }, { id: "logo", label: "Logos" },
  { id: "music", label: "Music" }, { id: "sfx", label: "Sound effects" },
];
type Entry = { file: File; path: string };
function initialKind(file: File): AssetKind | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type.startsWith("video/") || /^(mp4|mov|mkv|webm|avi|m4v|mts|m2ts)$/.test(ext)) return "main";
  if (file.type.startsWith("image/") || /^(png|jpg|jpeg|webp|gif|bmp|tif|tiff)$/.test(ext)) return "image";
  if (file.type.startsWith("audio/") || /^(mp3|wav|m4a|aac|flac|ogg|aiff|opus)$/.test(ext))
    // a recorded voice-over is the main footage of a documentary-style video, not music
    return /voice|narrat|sprecher|kommentar|(^|[\s_-])vo([\s_.-]|$)/i.test(file.name) ? "main" : "music";
  return null;
}
async function readEntry(entry: FileSystemEntry, prefix = ""): Promise<Entry[]> {
  const path = `${prefix}${entry.name}`;
  if (entry.isFile) return [{ file: await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject)), path }];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const files: Entry[] = [];
  while (true) {
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (!entries.length) return files;
    for (const child of entries) files.push(...await readEntry(child, `${path}/`));
  }
}

export function FolderUpload(props: {
  reviewRunning?: boolean;
  projectId: string; assets: Asset[]; uploads: Uploading[];
  setUploads: (fn: (u: Uploading[]) => Uploading[]) => void; refresh: () => Promise<void>;
  settings: Settings; onChange: (s: Settings) => void; onActivity: (v: MediaActivity) => void;
  /** Footage linked from a folder: show its progress and review, but no upload area. */
  hideDrop?: boolean;
}) {
  let folder!: HTMLInputElement;
  let files!: HTMLInputElement;
  const [dragging, setDragging] = createSignal(false);
  const [reviewing, setReviewing] = createSignal(false);
  const [reading, setReading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [skipped, setSkipped] = createSignal<string[]>([]);
  const [attempted, setAttempted] = createSignal("");
  const ready = () => props.assets.filter(a => a.status === "ready");
  const processing = () => props.assets.some(a => a.status === "queued" || a.status === "processing");
  const pending = () => props.uploads.some(u => !u.error);
  const signature = () => ready().map(a => a.id).sort().join(",");
  const included = (a: Asset) => !(props.settings.excluded_assets ?? []).includes(a.id);
  const selectable = () => props.assets.filter(a => a.status !== "error");
  const activity = () => ({ reading: reading(), reviewing: reviewing() || !!props.reviewRunning, error: error() });
  const locked = () => reviewing() || reading() || pending();
  const readiness = () => mediaReadiness(props.assets, props.uploads, props.settings, activity());
  createEffect(() => props.onActivity(activity()));
  createEffect(() => {
    if (!pending() && !processing() && !reading() && !reviewing() && !props.reviewRunning && ready().some(a => !a.detection) && attempted() !== signature()) void review();
  });
  async function review() {
    if (reviewing() || props.reviewRunning) return;
    const previous = new Set(props.assets.filter(a => a.detection).map(a => a.id));
    setAttempted(signature()); setReviewing(true); setError("");
    try {
      // Send the latest brief with the review rather than racing the settings autosave.
      const result = await api<{ assets: { asset_id: string; kind: AssetKind; use: boolean; reason: string }[] }>(
        `/api/projects/${props.projectId}/media-review`, { method: "POST", json: props.settings });
      const excluded = new Set(props.settings.excluded_assets ?? []);
      for (const item of result.assets) if (!previous.has(item.asset_id) && !item.use) excluded.add(item.asset_id);
      props.onChange({ ...props.settings, excluded_assets: [...excluded],
        music: result.assets.some(a => a.kind === "music" && !excluded.has(a.asset_id)),
        sfx: result.assets.some(a => a.kind === "sfx" && !excluded.has(a.asset_id)),
        broll: result.assets.some(a => ["broll", "image"].includes(a.kind) && !excluded.has(a.asset_id)),
        logo: { ...props.settings.logo, enabled: result.assets.some(a => a.kind === "logo" && !excluded.has(a.asset_id)) },
      });
      await props.refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setReviewing(false); }
  }
  async function start(entries: Entry[]) {
    const ignored: string[] = [];
    const batch = entries.flatMap(entry => {
      const kind = initialKind(entry.file);
      if (!kind || entry.file.name.startsWith(".")) { ignored.push(entry.path); return []; }
      return [{ ...entry, kind, key: crypto.randomUUID(), cancelled: false, abort: (() => {}) as () => void }];
    });
    setSkipped(ignored); setError("");
    props.setUploads(list => [...list, ...batch.map(item => ({ key: item.key, kind: item.kind, name: item.path, size: item.file.size, progress: 0,
      abort: () => { item.cancelled = true; item.abort(); } }))]);
    // Limit concurrent uploads so a large folder does not flood the connection.
    let cursor = 0;
    async function worker() {
      while (cursor < batch.length) {
        const item = batch[cursor++];
        if (item.cancelled) continue;
        try {
          const job = uploadFile(props.projectId, item.kind, item.file, progress =>
            props.setUploads(list => list.map(u => u.key === item.key ? { ...u, progress } : u)), item.path);
          item.abort = job.abort;
          await job.promise;
          await props.refresh();
          props.setUploads(list => list.filter(u => u.key !== item.key));
        } catch (e) {
          if (!item.cancelled) props.setUploads(list => list.map(u => u.key === item.key ? { ...u, error: (e as Error).message } : u));
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
  }
  async function drop(event: DragEvent) {
    event.preventDefault(); setDragging(false);
    if (!event.dataTransfer || reviewing() || pending() || reading()) return;
    const entries = Array.from(event.dataTransfer.items).map(item => item.webkitGetAsEntry?.()).filter((entry): entry is FileSystemEntry => !!entry);
    const fallback = Array.from(event.dataTransfer.files).map(file => ({ file, path: file.name }));
    setReading(true);
    try { await start(entries.length ? (await Promise.all(entries.map(entry => readEntry(entry)))).flat() : fallback); }
    catch (e) { setError(`Couldn’t read that folder. ${(e as Error).message}`); }
    finally { setReading(false); }
  }
  function toggle(a: Asset, use: boolean) {
    const excluded = new Set(props.settings.excluded_assets ?? []);
    if (use) excluded.delete(a.id); else excluded.add(a.id);
    props.onChange({ ...props.settings, excluded_assets: [...excluded],
      ...(use && a.kind === "music" ? { music: true } : {}),
      ...(use && a.kind === "sfx" ? { sfx: true } : {}),
      ...(use && ["broll", "image"].includes(a.kind) ? { broll: true } : {}),
      ...(use && a.kind === "logo" ? { logo: { ...props.settings.logo, enabled: true } } : {}),
    });
  }
  async function remove(a: Asset) {
    try { await api(`/api/assets/${a.id}`, { method: "DELETE" }); setError(""); await props.refresh(); }
    catch (e) { setError((e as Error).message); }
  }
  async function retry(a: Asset) {
    try { await api(`/api/assets/${a.id}/reanalyze`, { method: "POST" }); setError(""); await props.refresh(); }
    catch (e) { setError((e as Error).message); }
  }
  return <>
    <Show when={props.assets.length || props.uploads.length || reading()}>
      <div class="media-progress" aria-busy={!readiness().ready && !readiness().failed}>
        <div class="field-heading"><strong role="status">{readiness().label}</strong><span>{readiness().complete} / {readiness().total} files prepared</span></div>
        <div class="media-progress-track" classList={{ indeterminate: readiness().indeterminate }} role="progressbar" aria-label="Footage preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness().indeterminate ? undefined : readiness().progress} aria-valuetext={readiness().label}>
          <div style={{ width: `${readiness().progress}%` }} />
        </div>
        <p>{readiness().ready ? "Analysis and AI review complete. You can continue." : "Next unlocks once uploads, transcription, alignment, and AI review are complete."}</p>
      </div>
    </Show>
    <Show when={!props.hideDrop}>
    {/* The whole area opens the folder picker, not just its label. */}
    <div class="folder-drop" classList={{ dragging: dragging(), disabled: locked() }} role="button" tabindex={locked() ? -1 : 0} aria-disabled={locked()}
      aria-label="Drop a folder here or browse" onClick={() => !locked() && folder.click()}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && !locked()) { e.preventDefault(); folder.click(); } }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M12 16V9m-3 3 3-3 3 3"/></svg>
      <span class="folder-browse">Drop a folder here or browse</span>
      <p>Main footage, B-roll, images, logos, music, and sound effects.<br />Keep your subfolders — we’ll organize everything.</p>
      <button class="text-button" disabled={locked()} onClick={e => { e.stopPropagation(); files.click(); }}><IconFiles size={16} />Pick single files instead</button>
    </div>
    </Show>
    <input ref={el => { folder = el; el.setAttribute("webkitdirectory", ""); }} type="file" multiple hidden onChange={e => {
      void start(Array.from(e.currentTarget.files ?? []).map(file => ({ file, path: file.webkitRelativePath || file.name }))); e.currentTarget.value = "";
    }} />
    <input ref={files} type="file" multiple hidden accept="video/*,image/*,audio/*,.mkv,.mts,.m2ts" onChange={e => {
      void start(Array.from(e.currentTarget.files ?? []).map(file => ({ file, path: file.name }))); e.currentTarget.value = "";
    }} />
    <Show when={skipped().length}><details class="upload-skipped"><summary>{skipped().length} unsupported or hidden files skipped</summary><For each={skipped()}>{name => <p>{name}</p>}</For></details></Show>
    <Show when={props.uploads.length}><div class="upload-queue" aria-live="polite"><For each={props.uploads}>{u => <div class="upload-line"><div><strong>{u.name}</strong><span>{u.error || `${Math.round(u.progress * 100)}% uploaded`}</span></div><button class="text-button" onClick={() => { u.abort(); props.setUploads(list => list.filter(item => item.key !== u.key)); }}><IconX size={15} />{u.error ? "Dismiss" : "Cancel"}</button></div>}</For></div></Show>
    <Show when={props.assets.length}>
      <section class="media-review"><div class="field-heading"><h2>{reviewing() ? "AI is reviewing your folder…" : processing() ? "Analyzing your files…" : "Your media, organized"}</h2><Show when={!processing() && !pending() && !reviewing() && !props.reviewRunning && ready().length}><button class="text-button" onClick={review}><IconRefresh size={16} />Sort again</button></Show></div>
        <p class="field-hint" aria-live="polite">{reviewing() ? "Identifying each file and choosing what fits your video." : processing() ? "Preparing previews and transcripts for the AI review." : `${selectable().filter(included).length} of ${props.assets.length} files included. The AI chooses the best moments from this selection when creating your edit.`}</p>
        {/* One folded row per kind, so a big folder stays short. Open a row to check single files. */}
        <div class="media-groups"><For each={kinds.filter(kind => props.assets.some(a => a.kind === kind.id))}>{kind => {
          const items = () => props.assets.filter(a => a.kind === kind.id);
          const used = () => items().filter(a => included(a) && a.status !== "error").length;
          const failed = () => items().filter(a => a.status === "error").length;
          return <details class="media-group">
            <summary><strong>{kind.label}</strong><span>{items().length} {items().length === 1 ? "file" : "files"}</span>
              <span class="media-group-used">{failed() ? `${failed()} need attention` : `${used()} included`}</span></summary>
            <div class="media-list"><For each={items()}>{a =>
              <div class="media-file" classList={{ excluded: !included(a) }}>
                <input type="checkbox" aria-label={`Include ${a.filename}`} checked={included(a) && a.status !== "error"} disabled={a.status === "queued" || a.status === "processing" || reviewing()} onChange={e => toggle(a, e.currentTarget.checked)} />
                <div><strong title={a.filename}>{a.filename}</strong>
                  <Show when={a.colour}><span class="media-colour" title="Reel turns this into normal colour for previews and exports. The original file stays untouched.">{a.colour} · normal colour</span></Show>
                  <Show when={a.steadied}><span class="media-colour" title="This clip is shaky. Reel steadies it for previews and exports. The original file stays untouched.">Steadied</span></Show>
                  <p title={a.error || a.detection?.reason || ""}>{a.error || (a.status !== "ready" ? a.stage || "Preparing…" : a.detection?.reason || "Waiting for AI review")}</p></div>
                <span class="media-status">{a.status === "error" ? "Needs attention" : a.status !== "ready" ? "Analyzing" : !included(a) ? "Not included" : a.detection ? "Included" : "Awaiting review"}</span>
                <Show when={a.status === "error"}><button class="text-button" onClick={() => retry(a)}>Retry</button></Show>
                <button class="media-remove" disabled={reviewing() || a.status === "processing" || a.status === "queued"} aria-label={`Remove ${a.filename}`} title="Remove" onClick={() => remove(a)}><IconX size={15} /></button>
              </div>
            }</For></div>
          </details>;
        }}</For></div>
      </section>
    </Show>
    <Show when={error()}><p class="form-error" role="alert">{error()} <button class="text-button" disabled={reviewing() || processing() || pending()} onClick={review}><IconRefresh size={16} />Try again</button></p></Show>
  </>;
}
