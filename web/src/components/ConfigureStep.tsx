import * as stylex from "@stylexjs/stylex";
import { For, Show, createResource, createSignal, type JSX, type ParentProps } from "solid-js";
import { api, type Aspect, type Asset, type Generation, type Presets, type Settings } from "../api";
import { fmtDuration, fmtTarget } from "../format";
import { sx } from "../sx";
import { color, radius } from "../tokens.stylex";
import { IconInfo, IconWand } from "../ui/icons";
import { Button, Segmented, Slider, Toggle } from "../ui/kit";

const ASPECTS: { id: Aspect; label: string; hint: string; w: number; h: number }[] = [
  { id: "9:16", label: "Vertical", hint: "Reels · TikTok · Shorts", w: 18, h: 32 },
  { id: "16:9", label: "Landscape", hint: "YouTube · web", w: 32, h: 18 },
  { id: "1:1", label: "Square", hint: "Feed posts", w: 26, h: 26 },
  { id: "4:5", label: "Portrait", hint: "Instagram feed", w: 24, h: 30 },
];

const fadeUp = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const s = stylex.create({
  layout: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 1000px)": "minmax(0, 1fr) 340px" },
    gap: 20,
    alignItems: "start",
  },
  col: { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },
  section: {
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    boxShadow: color.shadow,
    animationName: fadeUp,
    animationDuration: "300ms",
    animationFillMode: "both",
  },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontWeight: 700, fontSize: 15.5, letterSpacing: "-0.01em" },
  sectionHint: { fontSize: 13, color: color.muted, marginTop: 2 },
  sectionBody: { display: "flex", flexDirection: "column", gap: 16, marginTop: 16 },
  bodyOff: { opacity: 0.4, pointerEvents: "none" },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: color.muted },
  inline: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  inlineText: { display: "flex", flexDirection: "column" },
  inlineTitle: { fontSize: 14, fontWeight: 600 },
  inlineHint: { fontSize: 12.5, color: color.muted },

  durationRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  bigNumber: { fontSize: 40, fontWeight: 700, letterSpacing: "-0.022em", lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  chips: { display: "flex", flexWrap: "wrap", gap: 6 },
  chip: {
    height: 32,
    paddingInline: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: color.border, ":hover": color.borderStrong },
    backgroundColor: "transparent",
    color: color.muted,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transitionProperty: "all",
    transitionDuration: "140ms",
  },
  chipOn: { backgroundColor: color.accentSoft, borderColor: color.accent, color: color.accent },
  note: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: color.muted },

  aspects: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  styles: { display: "grid", gridTemplateColumns: { default: "1fr 1fr", "@media (min-width: 720px)": "repeat(4, 1fr)" }, gap: 10 },
  tile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    padding: 14,
    textAlign: "left",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: { default: color.border, ":hover": color.borderStrong },
    backgroundColor: color.surface2,
    color: color.text,
    cursor: "pointer",
    transitionProperty: "border-color, background-color, transform",
    transitionDuration: "150ms",
    outline: { default: "none", ":focus-visible": `2px solid ${color.accent}` },
  },
  tileCenter: { alignItems: "center", textAlign: "center" },
  tileOn: { borderColor: { default: color.accent, ":hover": color.accent }, backgroundColor: color.accentSoft },
  tileTitle: { fontSize: 13.5, fontWeight: 700 },
  tileHint: { fontSize: 12, color: color.muted, lineHeight: 1.35 },
  frameWrap: { height: 36, display: "grid", placeItems: "center" },
  frame: { borderRadius: 4, borderWidth: 2, borderStyle: "solid", borderColor: "currentColor" },
  swatch: { width: 26, height: 26, borderRadius: 8, marginBottom: 2 },

  summary: {
    position: { default: "static", "@media (min-width: 1000px)": "sticky" },
    top: 84,
    padding: 22,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    boxShadow: color.shadow,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  stage: {
    alignSelf: "center",
    display: "grid",
    placeItems: "center",
    width: 200,
    height: 170,
    borderRadius: radius.lg,
    backgroundColor: color.surface2,
  },
  stageFrame: {
    borderRadius: 10,
    backgroundColor: color.accentFill,
    transitionProperty: "width, height",
    transitionDuration: "250ms",
    transitionTimingFunction: "cubic-bezier(.3,.7,.4,1)",
    display: "grid",
    placeItems: "end center",
    paddingBottom: 10,
  },
  stageCaption: { height: 5, width: "60%", borderRadius: 3, backgroundColor: "rgba(255,255,255,0.85)" },
  sumTitle: { fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" },
  sumList: { display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, margin: 0, padding: 0, listStyle: "none" },
  sumRow: { display: "flex", justifyContent: "space-between", gap: 12 },
  sumKey: { color: color.muted },
  sumVal: { fontWeight: 600, textAlign: "right" },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: color.dangerSoft, color: color.danger, fontSize: 13.5 },
  muted: { fontSize: 12.5, color: color.faint, textAlign: "center" },
  swatches: { display: "flex", gap: 10, flexWrap: "wrap" },
  swatch2: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: color.borderStrong,
    cursor: "pointer",
    padding: 0,
    transitionProperty: "transform, box-shadow",
    transitionDuration: "140ms",
    transform: { default: "none", ":hover": "scale(1.08)" },
    outline: { default: "none", ":focus-visible": `2px solid ${color.accent}` },
    outlineOffset: 2,
  },
  swatchOn: { borderColor: color.bg, boxShadow: `0 0 0 2px ${color.accent}` },
});

const frameSize = stylex.create({ size: (w: number, h: number) => ({ width: w, height: h }) });
const swatch = stylex.create({
  bg: (c: string) => ({ backgroundImage: `linear-gradient(135deg, ${c}, ${c}88)` }),
  fill: (c: string) => ({ backgroundColor: c }),
});

function Section(
  props: ParentProps<{ title: string; hint?: string; enabled?: boolean; onToggle?: (v: boolean) => void; delay?: number }>,
) {
  return (
    <section {...sx(s.section)} style={{ "animation-delay": `${props.delay ?? 0}ms` }}>
      <div {...sx(s.sectionHead)}>
        <div>
          <div {...sx(s.sectionTitle)}>{props.title}</div>
          <Show when={props.hint}>
            <div {...sx(s.sectionHint)}>{props.hint}</div>
          </Show>
        </div>
        <Show when={props.onToggle}>
          <Toggle checked={!!props.enabled} onChange={(v) => props.onToggle!(v)} label={props.title} />
        </Show>
      </div>
      <Show when={props.children}>
        <div {...sx(s.sectionBody, props.onToggle && !props.enabled && s.bodyOff)}>{props.children}</div>
      </Show>
    </section>
  );
}

const Field = (props: ParentProps<{ label: string }>) => (
  <div {...sx(s.field)}>
    <div {...sx(s.fieldLabel)}>{props.label}</div>
    {props.children}
  </div>
);

const Inline = (props: { title: string; hint?: string; children: JSX.Element }) => (
  <div {...sx(s.inline)}>
    <div {...sx(s.inlineText)}>
      <span {...sx(s.inlineTitle)}>{props.title}</span>
      <Show when={props.hint}>
        <span {...sx(s.inlineHint)}>{props.hint}</span>
      </Show>
    </div>
    {props.children}
  </div>
);

export function ConfigureStep(props: {
  projectId: string;
  assets: Asset[];
  settings: Settings;
  onChange: (s: Settings) => void;
  generation: Generation | null;
  refresh: () => Promise<void>;
  onGenerated: () => void;
}) {
  const [presets] = createResource(() => api<Presets>("/api/presets"));
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const st = () => props.settings;
  const set = (patch: Partial<Settings>) => props.onChange({ ...st(), ...patch });
  const setIn = <K extends keyof Settings>(key: K, patch: Partial<Settings[K]>) =>
    props.onChange({ ...st(), [key]: { ...(st()[key] as object), ...patch } });

  const live = () => props.assets.filter((a) => a.status !== "error");
  const has = (k: Asset["kind"]) => live().some((a) => a.kind === k);
  const mains = () => live().filter((a) => a.kind === "main");
  const speech = () => mains().some((a) => a.status !== "ready" || (a.transcript?.words ?? 0) > 0);
  const timelineSource = () => (mains().length ? mains() : live().filter((a) => a.kind === "broll"));
  const footage = () => timelineSource().reduce((t, a) => t + (a.duration ?? 0), 0);
  const pending = () => live().filter((a) => a.status !== "ready").length;
  const brollAvailable = () => mains().length > 0 && (has("broll") || has("image"));
  const activeStyle = () => presets()?.styles.find((x) => x.id === st().style);

  function chooseStyle(id: string) {
    const preset = presets()?.styles.find((x) => x.id === id);
    if (!preset) return;
    // A style sets the look and creative defaults; keep the user's format and placement choices.
    const c = st().captions;
    props.onChange({
      ...preset.defaults,
      duration: st().duration,
      aspect: st().aspect,
      logo: st().logo,
      captions: { ...preset.defaults.captions, enabled: c.enabled, key_moments_only: c.key_moments_only, position: c.position },
    });
  }

  async function generate() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/projects/${props.projectId}/generations`, { method: "POST", json: { settings: st() } });
      await props.refresh();
      props.onGenerated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const aspect = () => ASPECTS.find((a) => a.id === st().aspect)!;
  const enabledList = () => {
    const out: string[] = [];
    if (speech() && st().captions.enabled) out.push(st().captions.key_moments_only ? "Key-moment subtitles" : "Subtitles");
    if (mains().length && st().zooms) out.push("Zoom-ins");
    if (brollAvailable() && st().broll) out.push("B-roll");
    if (has("music") && st().music) out.push("Music");
    if (has("sfx") && st().sfx) out.push("Sound FX");
    if (has("logo") && st().logo.enabled) out.push("Logo");
    if (st().progress_bar) out.push("Progress bar");
    return out.join(", ") || "Clean cut";
  };
  const running = () => props.generation && (props.generation.status === "queued" || props.generation.status === "running");

  return (
    <Show when={st().captions}>
      <div {...sx(s.layout)}>
        <div {...sx(s.col)}>
          <Section title="Target duration" hint="How long the finished video should be.">
            <div {...sx(s.durationRow)}>
              <span {...sx(s.bigNumber)}>{fmtTarget(st().duration)}</span>
              <Show when={footage() > 0}>
                <span {...sx(s.note)}>Your footage: {fmtDuration(footage())}</span>
              </Show>
            </div>
            <Slider
              label="Target duration in seconds"
              min={5}
              max={3600}
              step={st().duration >= 600 ? 60 : 5}
              value={st().duration}
              onInput={(v) => set({ duration: v })}
            />
            <div {...sx(s.chips)}>
              <For each={presets()?.durations ?? [15, 30, 45, 60, 90, 180, 300]}>
                {(d) => (
                  <button type="button" {...sx(s.chip, st().duration === d && s.chipOn)} onClick={() => set({ duration: d })}>
                    {fmtTarget(d)}
                  </button>
                )}
              </For>
            </div>
            <Show when={footage() > 0 && st().duration > footage()}>
              <div {...sx(s.note)}>
                <IconInfo size={15} /> Longer than your footage — the edit will use the best of what's there.
              </div>
            </Show>
          </Section>

          <Section title="Aspect ratio" delay={30}>
            <div {...sx(s.aspects)} role="radiogroup" aria-label="Aspect ratio">
              <For each={ASPECTS}>
                {(a) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={st().aspect === a.id}
                    {...sx(s.tile, s.tileCenter, st().aspect === a.id && s.tileOn)}
                    onClick={() => set({ aspect: a.id })}
                  >
                    <span {...sx(s.frameWrap)}>
                      <span {...sx(s.frame, frameSize.size(a.w, a.h))} />
                    </span>
                    <span {...sx(s.tileTitle)}>{a.id}</span>
                    <span {...sx(s.tileHint)}>{a.hint}</span>
                  </button>
                )}
              </For>
            </div>
          </Section>

          <Section title="Editing style" hint="Claude edits in this style: pacing, cuts, transitions and the look." delay={60}>
            <div {...sx(s.styles)} role="radiogroup" aria-label="Editing style">
              <For each={presets()?.styles ?? []}>
                {(p) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={st().style === p.id}
                    {...sx(s.tile, st().style === p.id && s.tileOn)}
                    onClick={() => chooseStyle(p.id)}
                  >
                    <span {...sx(s.swatch, swatch.bg(p.accent))} />
                    <span {...sx(s.tileTitle)}>{p.label}</span>
                    <span {...sx(s.tileHint)}>{p.tagline}</span>
                  </button>
                )}
              </For>
            </div>
          </Section>

          <Show when={speech()}>
            <Section
              title="Subtitles"
              hint="Word-timed and styled to match your edit."
              enabled={st().captions.enabled}
              onToggle={(v) => setIn("captions", { enabled: v })}
              delay={90}
            >
              <Inline title="Only key moments" hint="Claude picks the lines worth reading.">
                <Toggle
                  label="Only key moments"
                  checked={st().captions.key_moments_only}
                  onChange={(v) => setIn("captions", { key_moments_only: v })}
                />
              </Inline>
              <Field label="Color">
                <div {...sx(s.swatches)} role="radiogroup" aria-label="Subtitle color">
                  <For each={presets()?.caption_colors ?? ["#FFFFFF"]}>
                    {(c) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={st().captions.color.toUpperCase() === c}
                        aria-label={c}
                        {...sx(s.swatch2, swatch.fill(c), st().captions.color.toUpperCase() === c && s.swatchOn)}
                        onClick={() => setIn("captions", { color: c })}
                      />
                    )}
                  </For>
                </div>
              </Field>
              <Inline title="Outline" hint="A dark outline keeps them readable on any background.">
                <Toggle label="Outline" checked={st().captions.outline} onChange={(v) => setIn("captions", { outline: v })} />
              </Inline>
              <Field label="Placement">
                <Segmented
                  label="Subtitle placement"
                  value={st().captions.position}
                  options={[
                    { value: "top", label: "Top" },
                    { value: "center", label: "Middle" },
                    { value: "bottom", label: "Bottom" },
                  ]}
                  onChange={(v) => setIn("captions", { position: v })}
                />
              </Field>
            </Section>
          </Show>

          <Section title="Extras" hint="You choose what's in. Claude decides where, when and how much." delay={120}>
            <Show when={speech()}>
              <Inline title="Remove pauses & mistakes" hint="Cuts dead air, ums and stumbles.">
                <Toggle label="Remove pauses and mistakes" checked={st().tighten} onChange={(v) => set({ tighten: v })} />
              </Inline>
            </Show>
            <Inline title="Hook headline" hint="A short title over the opening seconds.">
              <Toggle label="Hook headline" checked={st().hook_title} onChange={(v) => set({ hook_title: v })} />
            </Inline>
            <Show when={mains().length}>
              <Inline title="Zoom-ins" hint="Punch-ins on the moments that matter.">
                <Toggle label="Zoom-ins" checked={st().zooms} onChange={(v) => set({ zooms: v })} />
              </Inline>
            </Show>
            <Show when={brollAvailable()}>
              <Inline title="B-roll & images" hint="Shown when what's on screen is mentioned.">
                <Toggle label="B-roll and images" checked={st().broll} onChange={(v) => set({ broll: v })} />
              </Inline>
            </Show>
            <Show when={has("music")}>
              <Inline title="Music" hint="Mixed automatically and lowered under speech.">
                <Toggle label="Music" checked={st().music} onChange={(v) => set({ music: v })} />
              </Inline>
            </Show>
            <Show when={has("sfx")}>
              <Inline title="Sound effects" hint="Subtle accents on visual changes.">
                <Toggle label="Sound effects" checked={st().sfx} onChange={(v) => set({ sfx: v })} />
              </Inline>
            </Show>
            <Inline title="Progress bar" hint="A thin bar along the top shows how far in you are.">
              <Toggle label="Progress bar" checked={st().progress_bar} onChange={(v) => set({ progress_bar: v })} />
            </Inline>
            <Show when={has("logo")}>
              <Inline title="Logo" hint="Your logo in a corner throughout.">
                <Toggle label="Logo" checked={st().logo.enabled} onChange={(v) => setIn("logo", { enabled: v })} />
              </Inline>
              <Show when={st().logo.enabled}>
                <Segmented
                  label="Logo corner"
                  value={st().logo.position}
                  options={[
                    { value: "top-left", label: "Top left" },
                    { value: "top-right", label: "Top right" },
                    { value: "bottom-left", label: "Bottom left" },
                    { value: "bottom-right", label: "Bottom right" },
                  ]}
                  onChange={(v) => setIn("logo", { position: v })}
                />
              </Show>
            </Show>
          </Section>
        </div>

        <aside {...sx(s.summary)}>
          <div {...sx(s.stage)}>
            <div {...sx(s.stageFrame, frameSize.size(aspect().w * 3.6, aspect().h * 3.6))}>
              <Show when={speech() && st().captions.enabled}>
                <span {...sx(s.stageCaption)} />
              </Show>
            </div>
          </div>
          <div {...sx(s.sumTitle)}>{activeStyle()?.label ?? "Your edit"}</div>
          <ul {...sx(s.sumList)}>
            <li {...sx(s.sumRow)}>
              <span {...sx(s.sumKey)}>Length</span>
              <span {...sx(s.sumVal)}>{fmtTarget(st().duration)}</span>
            </li>
            <li {...sx(s.sumRow)}>
              <span {...sx(s.sumKey)}>Format</span>
              <span {...sx(s.sumVal)}>
                {aspect().label} {st().aspect}
              </span>
            </li>
            <li {...sx(s.sumRow)}>
              <span {...sx(s.sumKey)}>Extras</span>
              <span {...sx(s.sumVal)}>{enabledList()}</span>
            </li>
          </ul>
          <Show when={error()}>
            <div {...sx(s.error)} role="alert">
              {error()}
            </div>
          </Show>
          <Button variant="primary" size="lg" full loading={busy()} disabled={!!running()} onClick={generate}>
            <IconWand size={18} /> {props.generation ? "Generate new edit" : "Generate edit"}
          </Button>
          <div {...sx(s.muted)}>
            <Show when={running()} fallback={pending() ? `Still analyzing ${pending()} file${pending() === 1 ? "" : "s"} — generation will wait for them.` : "Claude plans the edit, then a preview renders."}>
              An edit is already being generated.
            </Show>
          </div>
        </aside>
      </div>
    </Show>
  );
}
