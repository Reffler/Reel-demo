import { For, Show, createSignal } from "solid-js";
import { mediaUrl, type Storyboard } from "../api";
import { fmtDuration } from "../format";
import { IconCheck, IconFilm, IconLayers, IconMusic } from "../ui/icons";
import { Spinner } from "../ui/kit";

// The edit shot by shot: one frame and a line per shot, with what is said, shown and heard there.
// It is approved before the video is exported.

export type RevisionRequest = { notes: string; shots: Record<number, string> };

export function StoryboardView(props: {
  board: Storyboard | null; loading: boolean; busy: boolean; onApprove: (approved: boolean) => void;
  revising?: boolean; onRevise?: (r: RevisionRequest) => void; reviseError?: string;
}) {
  // Changes in words: a note on any shot and/or one about the whole video; Claude then changes the edit.
  const [shots, setShots] = createSignal<Record<number, string>>({});
  const [notes, setNotes] = createSignal("");
  const [open, setOpen] = createSignal<Record<number, boolean>>({});
  const hasNotes = () => !!notes().trim() || Object.values(shots()).some(v => v.trim());
  const setShot = (i: number, v: string) => setShots(prev => ({ ...prev, [i]: v }));
  return <section class="storyboard">
    <div class="storyboard-head">
      <div><h2>Storyboard</h2>
        <p>{props.board ? `${props.board.panels.length} shots · ${fmtDuration(props.board.duration)}${props.board.music ? ` · music: ${props.board.music}` : ""}` : "Every shot of the edit, to check before exporting."}</p></div>
      <Show when={props.board}>
        <Show when={props.board!.approved_at} fallback={
          <button class="next-button" disabled={props.busy} onClick={() => props.onApprove(true)}>{props.busy ? <Spinner /> : <IconCheck size={18} />}Approve storyboard</button>}>
          <div class="storyboard-ok"><IconCheck size={16} />Approved<button class="text-button" disabled={props.busy} onClick={() => props.onApprove(false)}>Undo</button></div>
        </Show>
      </Show>
    </div>
    <Show when={props.board} fallback={<div class="storyboard-loading">{props.loading ? <Spinner /> : "No storyboard for this edit."}</div>}>
      <ol class="storyboard-grid"><For each={props.board!.panels}>{p => <li class="storyboard-panel">
        <div class="storyboard-frame">
          <Show when={p.frame_url} fallback={<IconFilm size={22} />}><img src={mediaUrl(p.frame_url)} alt="" loading="lazy" /></Show>
          <span class="storyboard-time">{p.index + 1} · {p.start.toFixed(1)}–{p.end.toFixed(1)} s</span>
        </div>
        <div class="storyboard-text">
          <Show when={p.chapter}><p class="storyboard-chapter">Chapter: {p.chapter}</p></Show>
          <Show when={p.words} fallback={<p class="storyboard-quiet">No words: picture only</p>}><p>“{p.words}”</p></Show>
          <ul>
            <li>{p.broll ? `B-roll: ${p.broll}` : p.clip}{p.transition !== "cut" ? ` · ${p.transition} in` : ""}{p.zoom ? " · zoom" : ""}{p.speed ? ` · ${p.speed}` : ""}</li>
            <For each={p.graphics}>{g => <li class="storyboard-gfx"><IconLayers size={12} />{g}</li>}</For>
            <For each={p.text}>{t => <li class="storyboard-gfx">Title: {t}</li>}</For>
          </ul>
          <Show when={props.onRevise}>
            <Show when={open()[p.index] || shots()[p.index]} fallback={
              <button class="text-button storyboard-note-add" onClick={() => setOpen(o => ({ ...o, [p.index]: true }))}>Change this shot</button>}>
              <textarea class="storyboard-note" rows={2} placeholder="e.g. shorter, use the close-up, slow motion here"
                value={shots()[p.index] ?? ""} onInput={e => setShot(p.index, e.currentTarget.value)} />
            </Show>
          </Show>
        </div>
      </li>}</For></ol>
      <Show when={props.board!.music}><p class="storyboard-music"><IconMusic size={14} />{props.board!.music}</p></Show>
      <Show when={props.onRevise}>
        <div class="storyboard-revise">
          <label for="sb-notes"><strong>Anything to change?</strong><span>Write it in your own words, for the whole video or on a shot above. Claude changes the edit and keeps the rest.</span></label>
          <textarea id="sb-notes" rows={3} placeholder="e.g. faster start, other music, less zooming, end with the logo"
            value={notes()} onInput={e => setNotes(e.currentTarget.value)} />
          <button class="next-button" disabled={!hasNotes() || props.revising} onClick={() => props.onRevise!({ notes: notes(), shots: Object.fromEntries(Object.entries(shots()).filter(([, v]) => v.trim())) })}>
            {props.revising ? "Sending…" : "Make these changes"}</button>
          <Show when={props.reviseError}><p class="storyboard-revise-error" role="alert">{props.reviseError}</p></Show>
        </div>
      </Show>
    </Show>
  </section>;
}
