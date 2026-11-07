import { A, useParams } from "@solidjs/router";
import { For, Show, createResource, createSignal, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { api, mediaUrl, type Brand, type BrandSheet, type Business, type FontName } from "../api";
import { Progress, Spinner } from "../ui/kit";
import { IconArrowLeft, IconCheck, IconFolder, IconRefresh, IconSpark } from "../ui/icons";

// One client's brand sheet: Reel studies every reference video (the links in their plan and the videos
// in their references folder) and Claude writes the rules. The agency edits and approves it; every edit
// for this client then follows it.

const fonts: FontName[] = ["Inter", "Montserrat", "Anton", "Poppins", "Playfair Display"];
const grades = ["none", "warm", "cool", "cinematic", "vivid", "mono", "clean"] as const;
const transitions = ["zoom", "whip", "flash", "blur", "fade"] as const;
const nice: Record<string, string> = {
  none: "None", subtle: "Subtle", strong: "Strong", normal: "Normal", plenty: "Plenty", few: "A few", many: "Many",
  one: "One word", few_words: "A few words", line: "A line", pop: "Pop", rise: "Rise", box: "Box", shadow: "Shadow",
  top: "Top", center: "Middle", bottom: "Bottom",
};

function Pills<T extends string>(props: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void; names?: Record<string, string> }) {
  return <div class="pills compact" role="group" aria-label={props.label}>
    <For each={props.options}>{o => <button aria-pressed={props.value === o} onClick={() => props.onChange(o)}>{props.names?.[o] ?? nice[o] ?? o}</button>}</For>
  </div>;
}

function Note(props: { id: string; label: string; value: string; onInput: (v: string) => void; hint?: string }) {
  return <section class="wizard-field brand-field"><h2><label for={props.id}>{props.label}</label></h2>
    <Show when={props.hint}><p class="field-hint">{props.hint}</p></Show>
    <textarea id={props.id} maxLength={2000} value={props.value} onInput={e => props.onInput(e.currentTarget.value)} />
  </section>;
}

function Rules(props: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return <section class="wizard-field brand-field"><h2>{props.label}</h2>
    <textarea aria-label={props.label} maxLength={2400} placeholder="One rule per line" value={props.value.join("\n")}
      onInput={e => props.onChange(e.currentTarget.value.split("\n").map(x => x.slice(0, 300)).filter(x => x.trim()).slice(0, 8))} />
  </section>;
}

export function BrandSheetPage() {
  const params = useParams();
  const [brand, setBrand] = createSignal<Brand | null>(null);
  const [sheet, setSheet] = createStore<BrandSheet>({} as BrandSheet);
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal("");
  const [dirty, setDirty] = createSignal(false);
  const [business] = createResource(() => params.id, async id =>
    (await api<{ businesses: Business[] }>("/api/businesses")).businesses.find(b => b.id === id));

  function take(b: Brand, keepEdits = false) {
    setBrand(b);
    if (b.sheet && !(keepEdits && dirty())) { setSheet(reconcile(structuredClone(b.sheet))); setDirty(false); }
  }
  async function load() {
    try { take((await api<{ brand: Brand }>(`/api/businesses/${params.id}/brand`)).brand, true); } catch (e) { setError((e as Error).message); }
  }
  void load();
  const timer = setInterval(() => { if (brand()?.status === "working") void load(); }, 2000);
  onCleanup(() => clearInterval(timer));

  async function act(name: string, path: string, init: RequestInit & { json?: unknown } = { method: "POST" }) {
    setBusy(name); setError("");
    try { take((await api<{ brand: Brand }>(path, init)).brand); } catch (e) { setError((e as Error).message); }
    setBusy("");
  }
  const study = () => act("study", `/api/businesses/${params.id}/brand/study`);
  const save = () => act("save", `/api/businesses/${params.id}/brand`, { method: "PUT", json: sheet });
  async function approve(approved: boolean) {
    if (dirty()) await save();
    if (!error()) await act("approve", `/api/businesses/${params.id}/brand/approve`, { method: "POST", json: { approved } });
  }
  const openFolder = (sub = "") => api(`/api/businesses/${params.id}/folder/open`, { method: "POST", json: { sub } }).catch(e => setError((e as Error).message));
  const edit = (fn: () => void) => { fn(); setDirty(true); };
  const name = () => business()?.plan.name || "This client";
  const b = () => brand();

  return <div class="folder-page brand-page">
    <A href={`/projects/client/${params.id}`} class="text-button portal-back"><IconArrowLeft size={16} />{name()}</A>
    <div class="portal-list-head">
      <div><p class="portal-eyebrow">Brand sheet</p><h1>{b()?.sheet ? sheet.name : name()}</h1></div>
      <div class="portal-actions">
        <Show when={b()?.sheet && b()?.status !== "working"}>
          <button class="back-button" disabled={!!busy()} onClick={() => void study()}><IconRefresh size={16} />Study again</button>
          <Show when={b()?.status === "approved"} fallback={
            <button class="next-button" disabled={!!busy()} onClick={() => void approve(true)}>{busy() === "approve" ? <Spinner /> : <IconCheck size={18} />}Approve</button>}>
            <button class="back-button" disabled={!!busy()} onClick={() => void approve(false)}>Undo approval</button>
          </Show>
        </Show>
      </div>
    </div>
    <Show when={error()}><p class="form-error">{error()}</p></Show>

    <Show when={b()} fallback={<div class="portal-loading"><Spinner /></div>}>
      <Show when={b()!.status === "approved"}>
        <div class="brand-banner"><IconCheck size={18} /><p>Approved. Every video for {name()} follows this sheet. Changes you save here apply to the next edit.</p></div>
      </Show>
      <Show when={b()!.status === "draft"}>
        <div class="brand-banner draft"><IconSpark size={18} /><p>Check it, change anything that isn't right, then approve it. Until then, edits for {name()} don't use it.</p></div>
      </Show>

      <Show when={b()!.status === "working"}>
        <div class="brand-working"><strong>{b()!.stage || "Studying the references"}</strong><Progress value={b()!.progress || null} />
          <p>Reel downloads each reference video, measures its cuts, colours and sound, and Claude studies how it is edited. This takes a few minutes per video.</p></div>
      </Show>

      <Show when={!b()!.sheet && b()!.status !== "working"}>
        <div class="brand-start">
          <h2>Learn {name()}'s style from their reference videos</h2>
          <p>Reel studies every reference link in the client's plan and every video in their <strong>references</strong> folder: fonts, colours and captions; cuts, zooms and pacing; motion graphics, music and sound effects. Claude then writes a brand sheet that is the client's own, not a copy.</p>
          <div class="portal-actions">
            <button class="next-button" disabled={!!busy()} onClick={() => void study()}>{busy() === "study" ? <Spinner /> : <IconSpark size={18} />}Make the brand sheet</button>
            <button class="back-button" onClick={() => void openFolder("references")}><IconFolder size={16} />Open references folder</button>
          </div>
        </div>
      </Show>
      <Show when={b()!.error && b()!.status !== "working"}><p class="form-error">{b()!.error}</p></Show>

      <Show when={b()!.sources.length}>
        <h2 class="projects-section">Studied references</h2>
        <div class="brand-sources"><For each={b()!.sources}>{s => <div class="brand-source" classList={{ failed: s.status === "error" }}>
          <Show when={s.thumb_url} fallback={<div class="brand-thumb" />}><img class="brand-thumb" src={mediaUrl(s.thumb_url)} alt="" /></Show>
          <div><strong>{s.label}</strong><span>{s.status === "error" ? s.error : s.kind === "file" ? "From the references folder" : s.note || "Link from the plan"}</span></div>
        </div>}</For></div>
      </Show>

      <Show when={b()!.sheet && sheet.colors}>
        <div class="brand-sheet">
          <section class="wizard-field brand-field"><h2><label for="b-name">Name</label></h2>
            <input id="b-name" maxLength={300} value={sheet.name} onInput={e => edit(() => setSheet("name", e.currentTarget.value))} /></section>
          <Note id="b-summary" label="The feel" value={sheet.summary} onInput={v => edit(() => setSheet("summary", v))} />
          <div class="brand-two">
            <Note id="b-inspired" label="Taken from the references" value={sheet.inspired_by} onInput={v => edit(() => setSheet("inspired_by", v))} />
            <Note id="b-twist" label="What makes it their own" value={sheet.own_twist} onInput={v => edit(() => setSheet("own_twist", v))} />
          </div>

          <h2 class="brand-group">Fonts, colours, captions</h2>
          <div class="brand-preview" style={{ background: sheet.colors.primary }}>
            <span style={{ "font-family": sheet.headline_font, color: sheet.colors.text }}>{name()}</span>
            <em style={{ "font-family": sheet.captions.font, color: sheet.colors.text, "text-transform": sheet.captions.uppercase ? "uppercase" : "none" }}>
              Fresh every <b style={{ color: sheet.colors.accent }}>morning</b></em>
          </div>
          <div class="brand-colors">
            <For each={[["primary", "Main colour"], ["accent", "Accent"], ["text", "Caption text"]] as const}>{([key, label]) =>
              <label class="brand-color"><input type="color" value={sheet.colors[key]} onInput={e => edit(() => setSheet("colors", key, e.currentTarget.value.toUpperCase()))} /><span>{label}<small>{sheet.colors[key]}</small></span></label>}</For>
          </div>
          <section class="wizard-field brand-field"><h2>Headline font</h2><Pills label="Headline font" options={fonts} value={sheet.headline_font} onChange={v => edit(() => setSheet("headline_font", v))} /></section>
          <section class="wizard-field brand-field"><h2>Caption font</h2><Pills label="Caption font" options={fonts} value={sheet.captions.font} onChange={v => edit(() => setSheet("captions", "font", v))} /></section>
          <div class="brand-two">
            <section class="wizard-field brand-field"><h2>Words per caption</h2><Pills label="Words per caption" options={["one", "few", "line"] as const} names={{ few: "A few words" }} value={sheet.captions.words} onChange={v => edit(() => setSheet("captions", "words", v))} /></section>
            <section class="wizard-field brand-field"><h2>Caption position</h2><Pills label="Caption position" options={["top", "center", "bottom"] as const} value={sheet.captions.position} onChange={v => edit(() => setSheet("captions", "position", v))} /></section>
            <section class="wizard-field brand-field"><h2>Caption animation</h2><Pills label="Caption animation" options={["none", "pop", "rise"] as const} value={sheet.captions.animation} onChange={v => edit(() => setSheet("captions", "animation", v))} /></section>
            <section class="wizard-field brand-field"><h2>Caption background</h2><Pills label="Caption background" options={["none", "box", "shadow"] as const} value={sheet.captions.background} onChange={v => edit(() => setSheet("captions", "background", v))} /></section>
          </div>
          <section class="wizard-field brand-field"><h2>Capitals</h2><Pills label="Capitals" options={["as spoken", "ALL CAPS"] as const} value={sheet.captions.uppercase ? "ALL CAPS" : "as spoken"} names={{ "as spoken": "As spoken" }} onChange={v => edit(() => setSheet("captions", "uppercase", v === "ALL CAPS"))} /></section>
          <Note id="b-captions" label="Caption notes" value={sheet.captions.notes} onInput={v => edit(() => setSheet("captions", "notes", v.slice(0, 300)))} />

          <h2 class="brand-group">Cuts, zooms, pacing</h2>
          <div class="brand-two">
            <section class="wizard-field brand-field"><h2><label for="b-pause">Longest pause kept</label></h2>
              <p class="field-hint">Every silence longer than this is cut out. {sheet.pause_seconds.toFixed(2)} s</p>
              <input id="b-pause" type="range" min="0.1" max="0.8" step="0.05" value={sheet.pause_seconds} onInput={e => edit(() => setSheet("pause_seconds", Number(e.currentTarget.value)))} /></section>
            <section class="wizard-field brand-field"><h2><label for="b-shot">Typical shot length</label></h2>
              <p class="field-hint">{sheet.shot_seconds.toFixed(1)} s</p>
              <input id="b-shot" type="range" min="0.5" max="10" step="0.5" value={sheet.shot_seconds} onInput={e => edit(() => setSheet("shot_seconds", Number(e.currentTarget.value)))} /></section>
          </div>
          <Note id="b-pacing" label="Pacing" value={sheet.pacing} onInput={v => edit(() => setSheet("pacing", v))} />
          <Note id="b-cuts" label="Cuts" value={sheet.cuts} onInput={v => edit(() => setSheet("cuts", v))} />
          <section class="wizard-field brand-field"><h2>Transitions besides cuts</h2>
            <div class="pills compact" role="group" aria-label="Transitions"><For each={transitions}>{t =>
              <button aria-pressed={sheet.transitions.includes(t)} onClick={() => edit(() => setSheet("transitions", sheet.transitions.includes(t) ? sheet.transitions.filter(x => x !== t) : [...sheet.transitions, t]))}>{t[0].toUpperCase() + t.slice(1)}</button>}</For></div></section>
          <section class="wizard-field brand-field"><h2>Zooms</h2><Pills label="Zooms" options={["none", "subtle", "strong"] as const} value={sheet.zoom_amount} onChange={v => edit(() => setSheet("zoom_amount", v))} /></section>
          <Note id="b-zooms" label="Zoom notes" value={sheet.zooms} onInput={v => edit(() => setSheet("zooms", v))} />

          <h2 class="brand-group">Motion graphics, music, sound</h2>
          <section class="wizard-field brand-field"><h2>Motion graphics</h2><Pills label="Motion graphics" options={["none", "subtle", "normal", "plenty"] as const} value={sheet.graphics_amount} onChange={v => edit(() => setSheet("graphics_amount", v))} /></section>
          <Note id="b-graphics" label="Motion graphics notes" value={sheet.motion_graphics} onInput={v => edit(() => setSheet("motion_graphics", v))} />
          <Note id="b-music" label="Music" value={sheet.music} onInput={v => edit(() => setSheet("music", v))} />
          <section class="wizard-field brand-field"><h2>Sound effects</h2><Pills label="Sound effects" options={["none", "few", "many"] as const} value={sheet.sfx_amount} onChange={v => edit(() => setSheet("sfx_amount", v))} /></section>
          <Note id="b-sfx" label="Sound effect notes" value={sheet.sound_effects} onInput={v => edit(() => setSheet("sound_effects", v))} />
          <section class="wizard-field brand-field"><h2>Colour grade</h2><Pills label="Colour grade" options={grades} value={sheet.color_grade} names={{ none: "None", warm: "Warm", cool: "Cool", cinematic: "Cinematic", vivid: "Vivid", mono: "Black & white", clean: "Clean" }} onChange={v => edit(() => setSheet("color_grade", v))} /></section>

          <h2 class="brand-group">Rules</h2>
          <div class="brand-two">
            <Rules label="Always" value={sheet.do} onChange={v => edit(() => setSheet("do", v))} />
            <Rules label="Never" value={sheet.dont} onChange={v => edit(() => setSheet("dont", v))} />
          </div>
          <div class="brand-save">
            <Show when={dirty()}><button class="back-button" disabled={!!busy()} onClick={() => void save()}>{busy() === "save" ? <Spinner /> : null}Save changes</button></Show>
            <Show when={b()!.status !== "approved"}><button class="next-button" disabled={!!busy()} onClick={() => void approve(true)}><IconCheck size={18} />Approve brand sheet</button></Show>
          </div>
        </div>
      </Show>
    </Show>
  </div>;
}
