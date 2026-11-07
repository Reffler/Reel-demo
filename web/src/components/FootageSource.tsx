import { Show, createSignal } from "solid-js";
import { api, type Asset, type Settings } from "../api";
import { type MediaActivity } from "../mediaReadiness";
import { EditorPicker, editorConnection, openEditorPicker } from "./EditorConnect";
import { FolderUpload } from "./FolderUpload";
import { type Uploading } from "./UploadStep";
import { emptyBrief } from "./Questionnaire";
import { IconFolder, IconSwap, IconUpload, IconX } from "../ui/icons";

// Two ways in. With editing software connected, the footage can stay where it is: Reel runs on
// this computer, so it reads the files from the folder the customer selects. Otherwise: connect one, or upload.

const folderName = (path: string) => path.split("/").filter(Boolean).pop() ?? path;

export function FootageSource(props: {
  reviewRunning?: boolean;
  projectId: string; assets: Asset[]; uploads: Uploading[];
  setUploads: (fn: (u: Uploading[]) => Uploading[]) => void; refresh: () => Promise<void>;
  settings: Settings; onChange: (s: Settings) => void; onActivity: (v: MediaActivity) => void;
}) {
  const brief = () => ({ ...emptyBrief(), ...(props.settings.brief ?? {}) });
  const setBrief = (patch: Partial<ReturnType<typeof brief>>) => props.onChange({ ...props.settings, brief: { ...brief(), ...patch } });
  const connected = () => editorConnection();
  const client = () => props.settings.agency?.business_id || "";
  const source = () => brief().footage_source || (props.uploads.length || (props.assets.length && !brief().footage_folder) ? "upload" : client() ? "client" : connected() ? "folder" : "");
  const folder = () => brief().footage_folder ?? "";
  const [busy, setBusy] = createSignal<"" | "choose" | "remove" | "client">("");
  const [error, setError] = createSignal("");

  // Opens the Mac's folder dialog. A new folder replaces the one selected before.
  async function choose() {
    setBusy("choose"); setError("");
    try {
      const r = await api<{ path: string | null }>("/api/footage-folder/choose", { method: "POST" });
      if (!r.path) return;
      if (folder()) await api(`/api/projects/${props.projectId}/footage-folder`, { method: "DELETE" });
      const linked = await api<{ folder: string; added: number }>(`/api/projects/${props.projectId}/footage-folder`, { method: "POST", json: { path: r.path } });
      setBrief({ footage_source: "folder", footage_folder: linked.folder });
      if (!linked.added) setError("No video, image or audio files in this folder. Select another one.");
      await props.refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
  async function remove() {
    setBusy("remove"); setError("");
    try {
      await api(`/api/projects/${props.projectId}/footage-folder`, { method: "DELETE" });
      setBrief({ footage_folder: "" });
      await props.refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
  // The client's own folder in Client projects: raw footage, plus the logos, images and music in references.
  async function useClientFolder() {
    setBusy("client"); setError("");
    try {
      if (folder() && brief().footage_source !== "client") await api(`/api/projects/${props.projectId}/footage-folder`, { method: "DELETE" });
      const linked = await api<{ folder: string; added: number }>(`/api/projects/${props.projectId}/client-footage`, { method: "POST" });
      setBrief({ footage_source: "client", footage_folder: linked.folder });
      await props.refresh();
    } catch (e) { setBrief({ footage_source: "client" }); setError((e as Error).message); }
    finally { setBusy(""); }
  }
  const openClientFolder = () => api(`/api/businesses/${client()}/folder/open`, { method: "POST", json: { sub: "raw footage" } }).catch(e => setError((e as Error).message));
  function pickFolderOption() {
    setBrief({ footage_source: "folder" });
    if (!folder()) void choose();
  }

  return <>
    <div class="source-options" classList={{ three: !!client() }} role="radiogroup" aria-label="How should we get your footage?">
      <Show when={client()}>
        <button class="source-option" role="radio" aria-checked={source() === "client"} onClick={() => void useClientFolder()}>
          <span class="source-mark"><IconFolder size={24} /></span>
          <strong>From the client folder</strong>
          <span>Everything in raw footage, plus logos and music from references. Nothing is uploaded.</span>
        </button>
      </Show>
      <Show when={connected()} fallback={
        <button class="source-option" role="radio" aria-checked="false" onClick={openEditorPicker}>
          <span class="source-mark"><span class="editor-mark resolve">DR</span><span class="editor-mark fcp">FC</span><span class="editor-mark premiere">Pr</span></span>
          <strong>Connect your editing software</strong>
          <span>Then just select the folder with your footage. No upload needed.</span>
        </button>
      }>
        <button class="source-option" role="radio" aria-checked={source() === "folder"} onClick={pickFolderOption}>
          <span class="source-mark"><IconFolder size={24} /></span>
          <strong>Select folder</strong>
          <span>Your files stay where they are, ready for {connected()!.name}.</span>
        </button>
      </Show>
      <button class="source-option" role="radio" aria-checked={source() === "upload"} onClick={() => setBrief({ footage_source: "upload" })}>
        <span class="source-mark"><IconUpload size={24} /></span>
        <strong>Upload the footage</strong>
        <span>Drop the folder with your footage, images, logos and music into Reel.</span>
      </button>
    </div>
    <Show when={source() === "client"}>
      <div class="folder-chosen">
        <span class="folder-chosen-icon"><IconFolder size={22} /></span>
        <div class="folder-chosen-text">
          <strong>{folder() ? folderName(folder()) : "Client folder"}</strong>
          <span title={folder()}>{busy() === "client" ? "Reading the client folder…" : folder() ? `${folder()}/raw footage` : "Put the footage into raw footage/video, audio and b-roll, then read it."}</span>
        </div>
        <button class="text-button" onClick={() => void openClientFolder()}><IconFolder size={15} />Open</button>
        <button class="text-button" disabled={!!busy()} onClick={() => void useClientFolder()}><IconSwap size={15} />Read again</button>
      </div>
      <Show when={error()}><p class="form-error" role="alert">{error()}</p></Show>
    </Show>
    <Show when={source() === "folder" && connected()}>
      <Show when={folder()} fallback={
        <button class="folder-pick" disabled={!!busy()} onClick={choose}>
          <IconFolder size={26} />
          <strong>{busy() === "choose" ? "Reading your folder…" : "Select the folder with your footage"}</strong>
          <span>Subfolders are included. Nothing is uploaded.</span>
        </button>
      }>
        <div class="folder-chosen">
          <span class="folder-chosen-icon"><IconFolder size={22} /></span>
          <div class="folder-chosen-text">
            <strong>{folderName(folder())}</strong>
            <span title={folder()}>{busy() === "choose" ? "Reading your folder…" : folder()}</span>
          </div>
          <button class="text-button" disabled={!!busy()} onClick={choose}><IconSwap size={15} />Change</button>
          <button class="text-button danger" disabled={!!busy()} onClick={remove}><IconX size={15} />{busy() === "remove" ? "Removing…" : "Remove"}</button>
        </div>
      </Show>
      <Show when={error()}><p class="form-error" role="alert">{error()}</p></Show>
    </Show>
    <Show when={source()}>
      <FolderUpload {...props} hideDrop={source() === "folder" || source() === "client"} />
    </Show>
    <EditorPicker />
  </>;
}
