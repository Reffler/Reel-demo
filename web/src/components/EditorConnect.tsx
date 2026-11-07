import { For, Show, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { api, mediaUrl, type EditorCheck, type EditorConnection, type EditorId, type EditorInfo, type Handoff } from "../api";
import { IconArrowRight, IconCheck, IconDownload, IconSwap, IconUnlink, IconX } from "../ui/icons";
import { Button } from "../ui/kit";

// Connecting an editor is a one-time choice per account (saved by the server); every edit can
// then be opened there to review it or finish it by hand.

const blurbs: Record<EditorId, { mark: string; how: string }> = {
  resolve: { mark: "DR", how: "Opens as a new timeline in Resolve." },
  fcp: { mark: "FC", how: "Opens as a new project in Final Cut." },
  premiere: { mark: "Pr", how: "Arrives as a sequence you import." },
};

const [connection, setConnection] = createSignal<EditorConnection | null | undefined>(undefined);
const [editors, setEditors] = createSignal<EditorInfo[]>([]);
const [pickerOpen, setPickerOpen] = createSignal(false);
let loading: Promise<void> | null = null;

function loadEditors() {
  loading ??= api<{ editors: EditorInfo[]; connection: EditorConnection | null }>("/api/editors")
    .then((r) => { setEditors(r.editors); setConnection(r.connection); })
    .catch(() => { setConnection(null); })
    .finally(() => { loading = null; });
  return loading;
}

export const editorConnection = () => {
  if (connection() === undefined) void loadEditors();
  return connection();
};
export const openEditorPicker = () => { void loadEditors(); setPickerOpen(true); };

export function EditorPicker() {
  const [busy, setBusy] = createSignal<EditorId | null>(null);
  const [check, setCheck] = createSignal<EditorCheck | null>(null);
  const [error, setError] = createSignal("");
  const close = () => { setPickerOpen(false); setCheck(null); setError(""); };

  async function connect(id: EditorId) {
    setBusy(id);
    setError("");
    setCheck(null);
    try {
      const r = await api<{ connection: EditorConnection; check: EditorCheck }>("/api/editors/connect", { method: "POST", json: { editor: id } });
      setConnection(r.connection);
      setCheck(r.check);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function disconnect() {
    await api("/api/editors/connect", { method: "DELETE" }).catch(() => {});
    setConnection(null);
    setCheck(null);
  }

  return (
    <Show when={pickerOpen()}>
      <Portal>
        <div class="editor-modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
          <div class="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-modal-title">
            <button class="editor-modal-close" aria-label="Close" onClick={close}><IconX size={18} /></button>
            <h2 id="editor-modal-title">Connect your editing software</h2>
            <p class="field-hint">You only do this once. After each edit you can open it there, check it and finish it yourself. Every cut, caption, B-roll shot and sound stays a separate clip you can change.</p>
            <div class="editor-grid">
              <For each={editors().length ? editors() : (["resolve", "fcp", "premiere"] as EditorId[]).map((id) => ({ id, name: { resolve: "DaVinci Resolve", fcp: "Final Cut Pro", premiere: "Premiere Pro" }[id], installed: false, app: null }))}>{(ed) =>
                <button class="editor-tile" aria-pressed={connection()?.editor === ed.id} disabled={!!busy()} onClick={() => connect(ed.id)}>
                  <span class={`editor-mark ${ed.id}`}>{blurbs[ed.id].mark}</span>
                  <strong>{ed.name}</strong>
                  <span class="editor-how">{blurbs[ed.id].how}</span>
                  <span class="editor-state">{busy() === ed.id ? "Checking…" : connection()?.editor === ed.id ? "Connected" : ed.installed ? "Found on this Mac" : "Not found on this Mac"}</span>
                </button>
              }</For>
            </div>
            <Show when={check()}>
              {(c) => <div class="editor-check" classList={{ ok: c().live === true || (c().installed && c().live !== false) }}>
                <Show when={c().live === true || (c().installed && c().live !== false)}><IconCheck size={16} /></Show>
                <span>{c().message}</span>
              </div>}
            </Show>
            <Show when={error()}><p class="form-error">{error()}</p></Show>
            <div class="editor-modal-footer">
              <Show when={connection()} fallback={<span />}>
                <button class="text-button danger" onClick={disconnect}><IconUnlink size={16} />Disconnect</button>
              </Show>
              <button class="next-button" onClick={close}>{connection() ? "Done" : "Not now"}</button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}

/** First page: the one-time connect step. Shrinks to a status line once connected. */
export function EditorConnectCard() {
  const c = () => editorConnection();
  return (
    <>
      <Show when={c() !== undefined}>
        <Show when={c()} fallback={
          <button class="editor-connect-card" onClick={openEditorPicker}>
            <span class="editor-marks"><span class="editor-mark resolve">DR</span><span class="editor-mark fcp">FC</span><span class="editor-mark premiere">Pr</span></span>
            <span class="editor-connect-text">
              <strong>Connect your editing software</strong>
              <span>One time. Then open every edit in DaVinci Resolve, Final Cut Pro or Premiere Pro to review or finish it.</span>
            </span>
            <span class="editor-connect-go">Connect <IconArrowRight size={16} /></span>
          </button>
        }>
          {(conn) => <div class="editor-connected">
            <span class={`editor-mark ${conn().editor}`}>{blurbs[conn().editor].mark}</span>
            <span>Edits open in <strong>{conn().name}</strong>{conn().live ? " · live connection" : ""}</span>
            <button class="text-button" onClick={openEditorPicker}><IconSwap size={16} />Switch app</button>
          </div>}
        </Show>
      </Show>
      <EditorPicker />
    </>
  );
}

/** After an edit: put it into the connected editor. */
export function OpenInEditor(props: { planId: string; size?: "md" | "lg" }) {
  const [busy, setBusy] = createSignal(false);
  const [result, setResult] = createSignal<Handoff | null>(null);
  const [error, setError] = createSignal("");
  const conn = () => editorConnection();

  async function send() {
    if (!conn()) return openEditorPicker();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api<Handoff>(`/api/plans/${props.planId}/handoff`, { method: "POST", json: {} }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size={props.size ?? "lg"} loading={busy()} onClick={send}>
        <span class={`editor-mark small ${conn()?.editor ?? "none"}`}>{conn() ? blurbs[conn()!.editor].mark : "↗"}</span>
        {conn() ? `Open in ${conn()!.name}` : "Open in your editor"}
      </Button>
      <Show when={result() || error()}>
        <div class="handoff-result" classList={{ error: !!error() }}>
          <Show when={result()} fallback={<span>{error()}</span>}>
            {(r) => <>
              <p><Show when={r().method !== "file"}><IconCheck size={15} /> </Show>{r().message}</p>
              <p class="handoff-files">
                Files are saved in <code>{r().folder}</code>
                <For each={Object.entries(r().downloads)}>{([kind, url]) =>
                  <a href={mediaUrl(url)} download=""><IconDownload size={13} /> {{ fcpxml: "FCPXML", xml: "Premiere XML", srt: "Captions .srt" }[kind]}</a>
                }</For>
              </p>
            </>}
          </Show>
        </div>
      </Show>
      <EditorPicker />
    </>
  );
}
