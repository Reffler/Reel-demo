import { For, Index, Match, Show, Switch, createSignal, type JSX } from "solid-js";
import { type SubtitleBrief } from "../api";
import { Toggle } from "../ui/kit";
import { IconUndo } from "../ui/icons";

type Preset = { id: string; label: string; style: Partial<SubtitleBrief> };

const base: SubtitleBrief = {
  preset: "classic", font: "Inter", size: "M", case: "as_spoken", words: "few", color: "#FFFFFF", highlight: "#8FC4FF",
  outline: "outline", background: false, background_color: "#000000", animation: "fade", position: "bottom", emojis: false,
};

// The caption looks people ask for most, as starting points.
export const subtitlePresets: Preset[] = [
  { id: "classic", label: "Classic", style: {} },
  { id: "bold", label: "Bold pop", style: { font: "Anton", size: "XL", case: "upper", words: "one", color: "#FFFFFF", highlight: "#FFE14D", animation: "pop", position: "center" } },
  { id: "highlight", label: "Highlight", style: { font: "Montserrat", size: "L", case: "upper", words: "few", highlight: "#3DDC97", animation: "karaoke", position: "center" } },
  { id: "boxed", label: "Boxed", style: { font: "Inter", outline: "none", background: true, background_color: "#000000", words: "line", animation: "fade" } },
  { id: "karaoke", label: "Karaoke", style: { font: "Poppins", size: "L", words: "line", highlight: "#FFE14D", animation: "karaoke" } },
  { id: "cinema", label: "Cinema", style: { font: "Inter", size: "S", outline: "shadow", words: "line", color: "#F2F2F2", animation: "fade" } },
  { id: "minimal", label: "Minimal", style: { size: "S", case: "lower", outline: "shadow", words: "few", animation: "fade" } },
  { id: "neon", label: "Neon", style: { font: "Montserrat", size: "L", case: "upper", color: "#8FC4FF", highlight: "#FF6BB5", outline: "shadow", animation: "bounce", words: "few" } },
  { id: "typewriter", label: "Typewriter", style: { font: "Poppins", outline: "shadow", words: "line", animation: "typewriter" } },
];

export const presetStyle = (id: string): SubtitleBrief => ({ ...base, ...(subtitlePresets.find((p) => p.id === id)?.style ?? {}), preset: id });
export const defaultSubtitles = () => presetStyle("classic");

const fonts = ["Inter", "Montserrat", "Anton", "Poppins", "Playfair Display"] as const;
const sample = ["This", "is", "how", "your", "words", "will", "look", "on", "screen"];
const sizes = { S: 15, M: 19, L: 24, XL: 30 };
const tabs = [{ id: "text", label: "Text" }, { id: "layout", label: "Layout" }, { id: "motion", label: "Animation" }, { id: "colors", label: "Colors" }] as const;

function Choice<T extends string>(props: { label: string; options: readonly { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return <div class="pills compact" role="group" aria-label={props.label}><For each={props.options}>{(o) =>
    <button aria-pressed={props.value === o.id} onClick={() => props.onChange(o.id)}>{o.label}</button>
  }</For></div>;
}

/** Live caption preview for a subtitle style. */
export function SubtitleSample(props: { style: SubtitleBrief; small?: boolean }): JSX.Element {
  const s = () => props.style;
  const words = () => s().words === "one" ? sample.slice(4, 5) : s().words === "few" ? sample.slice(3, 6) : sample.slice(0, 7);
  const active = () => Math.min(1, words().length - 1);
  const text = (w: string) => s().case === "upper" ? w.toUpperCase() : s().case === "lower" ? w.toLowerCase() : w;
  const css = (): JSX.CSSProperties => ({
    "font-family": `'${s().font}', system-ui, sans-serif`,
    "font-size": `${props.small ? Math.round(sizes[s().size] * 0.62) : sizes[s().size]}px`,
    "font-weight": s().font === "Anton" || s().font === "Playfair Display" ? 700 : 800,
    color: s().color,
    "background-color": s().background ? s().background_color : "transparent",
    "-webkit-text-stroke": s().outline === "outline" ? `${props.small ? 0.6 : 1}px #000` : undefined,
    "text-shadow": s().outline === "shadow" ? "0 2px 6px rgba(0,0,0,.85)" : s().outline === "outline" ? "0 0 2px #000" : undefined,
  });
  return (
    <span class={`sub-sample anim-${s().animation}`} classList={{ boxed: s().background }} style={css()}>
      <Index each={words()}>{(w, i) => <span class="sub-word" classList={{ active: i === active() }}
        style={i === active() && s().animation !== "typewriter" ? { color: s().highlight } : undefined}>{text(w())}{" "}</span>}</Index>
      <Show when={s().emojis}><span class="sub-word"> 🔥</span></Show>
    </span>
  );
}

export function SubtitleDesigner(props: { value: SubtitleBrief | null; format: string; onChange: (s: SubtitleBrief | null) => void }) {
  const s = () => props.value ?? defaultSubtitles();
  const set = (patch: Partial<SubtitleBrief>) => props.onChange({ ...s(), ...patch });
  const off = () => props.value?.preset === "none";
  const [tab, setTab] = createSignal<"text" | "layout" | "motion" | "colors">("text");
  return (
    <div class="subtitle-designer">
      <div class="choice-grid sub-presets">
        <For each={subtitlePresets}>{(p) =>
          <button class="choice" aria-pressed={props.value?.preset === p.id} onClick={() => props.onChange(presetStyle(p.id))}>
            <span class="sub-preview-mini"><SubtitleSample style={presetStyle(p.id)} small /></span>
            <strong>{p.label}</strong>
          </button>
        }</For>
        <button class="choice" aria-pressed={off()} onClick={() => props.onChange({ ...defaultSubtitles(), preset: "none" })}>
          <span class="sub-preview-mini none">—</span><strong>No subtitles</strong>
        </button>
      </div>
      <Show when={props.value && !off()}>
        <div class="sub-editor">
          <div class="sub-stage" data-format={/^\d+:\d+$/.test(props.format) ? props.format : "9:16"}>
            <div class={`sub-anchor at-${s().position}`}><SubtitleSample style={s()} /></div>
          </div>
          <div class="sub-controls">
            <div class="sub-controls-head">
              <span>Customize <strong>{subtitlePresets.find((p) => p.id === s().preset)?.label ?? "your style"}</strong></span>
              <button class="text-button" onClick={() => props.onChange(presetStyle(s().preset))}><IconUndo size={16} />Reset to preset</button>
            </div>
            <div class="sub-tabs" role="tablist" aria-label="Subtitle settings"><For each={tabs}>{(t) =>
              <button role="tab" aria-selected={tab() === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
            }</For></div>
            <div class="sub-panel" role="tabpanel">
              <Switch>
                <Match when={tab() === "text"}>
                  <div><h3>Font</h3><div class="pills compact" role="group" aria-label="Font"><For each={fonts}>{(f) =>
                    <button aria-pressed={s().font === f} style={{ "font-family": `'${f}', sans-serif` }} onClick={() => set({ font: f })}>{f}</button>
                  }</For></div></div>
                  <div class="sub-row">
                    <div><h3>Size</h3><Choice label="Size" value={s().size} onChange={(size) => set({ size })} options={[{ id: "S", label: "S" }, { id: "M", label: "M" }, { id: "L", label: "L" }, { id: "XL", label: "XL" }]} /></div>
                    <div><h3>Letters</h3><Choice label="Letter case" value={s().case} onChange={(c) => set({ case: c })} options={[{ id: "as_spoken", label: "Aa" }, { id: "upper", label: "AA" }, { id: "lower", label: "aa" }]} /></div>
                  </div>
                </Match>
                <Match when={tab() === "layout"}>
                  <div><h3>Position</h3><Choice label="Position" value={s().position} onChange={(position) => set({ position })} options={[{ id: "top", label: "Top" }, { id: "center", label: "Center" }, { id: "bottom", label: "Bottom" }]} /></div>
                  <div><h3>Words on screen</h3><Choice label="Words on screen" value={s().words} onChange={(words) => set({ words })} options={[{ id: "one", label: "One word" }, { id: "few", label: "A few words" }, { id: "line", label: "Full line" }]} /></div>
                </Match>
                <Match when={tab() === "motion"}>
                  <div><h3>Animation</h3><Choice label="Animation" value={s().animation} onChange={(animation) => set({ animation })} options={[{ id: "none", label: "None" }, { id: "pop", label: "Pop" }, { id: "fade", label: "Fade" }, { id: "bounce", label: "Bounce" }, { id: "karaoke", label: "Karaoke" }, { id: "typewriter", label: "Typewriter" }]} /></div>
                  <div class="toggle-row"><div><span>Emojis on key words</span><p class="field-hint">A fitting emoji next to important words.</p></div><Toggle label="Emojis" checked={s().emojis} onChange={(emojis) => set({ emojis })} /></div>
                </Match>
                <Match when={tab() === "colors"}>
                  <div class="sub-colors">
                    <label class="color-control"><input type="color" value={s().color} onInput={(e) => set({ color: e.currentTarget.value })} /><span>Text</span></label>
                    <label class="color-control"><input type="color" value={s().highlight} onInput={(e) => set({ highlight: e.currentTarget.value })} /><span>Spoken word</span></label>
                  </div>
                  <div><h3>Edge</h3><Choice label="Text edge" value={s().outline} onChange={(outline) => set({ outline })} options={[{ id: "none", label: "None" }, { id: "outline", label: "Outline" }, { id: "shadow", label: "Shadow" }]} /></div>
                  <div class="toggle-row"><span>Background box</span>
                    <div class="sub-inline"><Show when={s().background}><label class="color-control"><input type="color" aria-label="Box color" value={s().background_color} onInput={(e) => set({ background_color: e.currentTarget.value })} /></label></Show>
                      <Toggle label="Background box" checked={s().background} onChange={(background) => set({ background })} /></div>
                  </div>
                </Match>
              </Switch>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
