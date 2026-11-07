import * as stylex from "@stylexjs/stylex";
import { For, Match, Show, Switch, createEffect, createSignal, on } from "solid-js";
import { api, mediaUrl, type Generation, type Render, type Settings, type Storyboard } from "../api";
import { fmtDuration } from "../format";
import { sx } from "../sx";
import { color, radius } from "../tokens.stylex";
import { IconCheck, IconDownload, IconRefresh, IconSliders, IconSpark } from "../ui/icons";
import { Badge, Button, Progress, Spinner } from "../ui/kit";
import { OpenInEditor } from "./EditorConnect";
import { StoryboardView, type RevisionRequest } from "./StoryboardView";
import { ResolutionPicker } from "./ResolutionPicker";
import { resolution } from "../resolution";

const STAGES = [
  { id: "analyzing", label: "Analyzing media", hint: "Reading footage, finding the speaker" },
  { id: "transcribing", label: "Transcribing", hint: "Word-level timestamps for every line" },
  { id: "planning", label: "Planning the edit", hint: "Claude picks the hook, cuts and pacing" },
  { id: "preview", label: "Building preview", hint: "Rendering a quick draft of your video" },
] as const;

const pulse = stylex.keyframes({
  "0%, 100%": { opacity: 0.55, transform: "scale(0.96)" },
  "50%": { opacity: 1, transform: "scale(1)" },
});

const fadeUp = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const s = stylex.create({
  progressCard: {
    maxWidth: 620,
    marginInline: "auto",
    padding: { default: 22, "@media (min-width: 720px)": 32 },
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    boxShadow: color.shadow,
    animationName: fadeUp,
    animationDuration: "300ms",
  },
  orb: {
    width: 56,
    height: 56,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    backgroundColor: color.accentFill,
    animationName: pulse,
    animationDuration: "1.8s",
    animationIterationCount: "infinite",
    marginBottom: 18,
  },
  h2: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  sub: { color: color.muted, marginTop: 4, marginBottom: 24, minHeight: 22 },
  stages: { display: "flex", flexDirection: "column", gap: 4, margin: 0, padding: 0, listStyle: "none" },
  stage: { display: "flex", gap: 14, alignItems: "flex-start", padding: 12, borderRadius: radius.md },
  stageActive: { backgroundColor: color.surface2 },
  mark: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: color.borderStrong,
    color: color.faint,
  },
  markDone: { backgroundColor: color.accentFill, borderColor: color.accentFill, color: "#fff" },
  markActive: { borderColor: color.accent, color: color.accent },
  stageText: { flexGrow: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  stageLabel: { fontWeight: 600, fontSize: 14.5 },
  stageLabelPending: { color: color.faint },
  stageHint: { fontSize: 12.5, color: color.muted },

  result: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 960px)": "minmax(0, 1.2fr) minmax(0, 1fr)" },
    gap: 24,
    alignItems: "start",
    animationName: fadeUp,
    animationDuration: "350ms",
  },
  playerWrap: {
    display: "grid",
    placeItems: "center",
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  video: { borderRadius: radius.lg, backgroundColor: "#000", maxHeight: "72vh", width: "auto", maxWidth: "100%" },
  side: { display: "flex", flexDirection: "column", gap: 18 },
  title: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.022em", margin: 0, lineHeight: 1.1 },
  summary: { color: color.muted, fontSize: 15, lineHeight: 1.6, margin: 0 },
  label: {
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: color.faint,
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  stat: { padding: 12, borderRadius: radius.md, backgroundColor: color.surface2 },
  statValue: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" },
  statLabel: { fontSize: 12, color: color.muted },
  actions: { display: "flex", flexWrap: "wrap", gap: 10 },
  changed: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: color.accentSoft,
    color: color.text,
    fontSize: 13.5,
  },
  errorCard: { textAlign: "center" },
  errorText: {
    marginBlock: "12px 22px",
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: color.dangerSoft,
    color: color.danger,
    fontSize: 14,
  },
  center: { display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  warn: { fontSize: 12.5, color: color.faint },
});

function stageIndex(g: Generation) {
  return g.status === "done" ? STAGES.length : STAGES.findIndex((x) => x.id === g.stage);
}

function Stat(props: { value: string | number; label: string }) {
  return (
    <div {...sx(s.stat)}>
      <div {...sx(s.statValue)}>{props.value}</div>
      <div {...sx(s.statLabel)}>{props.label}</div>
    </div>
  );
}

export function PreviewStep(props: {
  projectId: string;
  generation: Generation;
  settings: Settings;
  exportRender: Render | null;
  refresh: () => Promise<void>;
  onConfigure: () => void;
  onExport: () => void;
}) {
  const [busy, setBusy] = createSignal<"regen" | "export" | "board" | "revise" | null>(null);
  const [error, setError] = createSignal("");
  const g = () => props.generation;
  const settingsChanged = () => JSON.stringify(g().settings) !== JSON.stringify(props.settings);

  async function regenerate() {
    setBusy("regen");
    setError("");
    try {
      await api(`/api/projects/${props.projectId}/generations`, { method: "POST", json: { settings: props.settings } });
      await props.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // shown under the change box, where the user is looking (the main error line sits far above it)
  const [reviseError, setReviseError] = createSignal("");
  async function revise(r: RevisionRequest) {
    const planId = g().plan?.id;
    if (!planId) return;
    setBusy("revise");
    setReviseError("");
    try {
      await api(`/api/projects/${props.projectId}/generations`, { method: "POST", json: { settings: props.settings, revision: { plan_id: planId, ...r } } });
      await props.refresh();
    } catch (e) {
      setReviseError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const [board, setBoard] = createSignal<Storyboard | null>(null);
  const [boardLoading, setBoardLoading] = createSignal(false);
  createEffect(on(() => (g().status === "done" ? g().plan?.id : undefined), async planId => {
    setBoard(null);
    if (!planId) return;
    setBoardLoading(true);
    try { setBoard((await api<{ storyboard: Storyboard }>(`/api/plans/${planId}/storyboard`)).storyboard); } catch { /* the preview works without it */ }
    setBoardLoading(false);
  }));
  async function approveBoard(approved: boolean) {
    setBusy("board");
    setError("");
    try {
      setBoard((await api<{ storyboard: Storyboard }>(`/api/plans/${g().plan!.id}/storyboard/approve`, { method: "POST", json: { approved } })).storyboard);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const needsApproval = () => !!board() && !board()!.approved_at;

  async function exportVideo() {
    setBusy("export");
    setError("");
    try {
      await api(`/api/projects/${props.projectId}/exports`, { method: "POST", json: { plan_id: g().plan!.id, resolution: resolution() } });
      await props.refresh();
      props.onExport();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const exportedThisPlan = () => props.exportRender && props.exportRender.plan_id === g().plan?.id && props.exportRender.status !== "error"
    && (props.exportRender.resolution ?? "1080p") === resolution();

  return (
    <Switch>
      <Match when={g().status === "error"}>
        <div {...sx(s.progressCard, s.errorCard)}>
          <h2 {...sx(s.h2)}>That edit didn't work out</h2>
          <div {...sx(s.errorText)} role="alert">
            {g().error}
          </div>
          <div {...sx(s.center)}>
            <Button variant="primary" loading={busy() === "regen"} onClick={regenerate}>
              <IconRefresh size={16} /> Try again
            </Button>
            <Button onClick={props.onConfigure}>
              <IconSliders size={16} /> Adjust settings
            </Button>
          </div>
        </div>
      </Match>

      <Match when={g().status !== "done"}>
        <div {...sx(s.progressCard)}>
          <div {...sx(s.orb)}>
            <IconSpark size={26} />
          </div>
          <h2 {...sx(s.h2)}>Creating your edit</h2>
          <div {...sx(s.sub)}>{g().message ?? "Starting…"}</div>
          <ol {...sx(s.stages)}>
            <For each={STAGES}>
              {(st, i) => {
                const state = () => (i() < stageIndex(g()) ? "done" : i() === stageIndex(g()) ? "active" : "pending");
                return (
                  <li {...sx(s.stage, state() === "active" && s.stageActive)}>
                    <span {...sx(s.mark, state() === "done" && s.markDone, state() === "active" && s.markActive)}>
                      <Switch fallback={<span>{i() + 1}</span>}>
                        <Match when={state() === "done"}>
                          <IconCheck size={14} />
                        </Match>
                        <Match when={state() === "active"}>
                          <Spinner />
                        </Match>
                      </Switch>
                    </span>
                    <div {...sx(s.stageText)}>
                      <span {...sx(s.stageLabel, state() === "pending" && s.stageLabelPending)}>{st.label}</span>
                      <Show when={state() !== "pending"}>
                        <span {...sx(s.stageHint)}>{st.hint}</span>
                      </Show>
                      <Show when={state() === "active"}>
                        <Progress value={st.id === "planning" ? null : g().progress} />
                      </Show>
                    </div>
                  </li>
                );
              }}
            </For>
          </ol>
        </div>
      </Match>

      <Match when={g().status === "done" && g().plan && g().preview}>
        <div {...sx(s.result)}>
          <div {...sx(s.playerWrap)}>
            <video
              {...sx(s.video)}
              src={mediaUrl(g().preview!.video_url)}
              controls
              playsinline
              preload="auto"
              style={{ "aspect-ratio": `${g().plan!.width} / ${g().plan!.height}` }}
            />
          </div>
          <div {...sx(s.side)}>
            <div>
              <div {...sx(s.label)}>
                <IconSpark size={13} /> Claude's edit
              </div>
              <h2 {...sx(s.title)}>{g().plan!.title || "Your edit"}</h2>
            </div>
            <p {...sx(s.summary)}>{g().plan!.summary}</p>
            <Show when={g().plan!.used_assets?.length}>
              <details class="used-files"><summary>Files used in this edit · {g().plan!.used_assets!.length}</summary>
                <ul><For each={g().plan!.used_assets}>{asset => <li>{asset.filename}<span>{{ main: "Main footage", broll: "B-roll", image: "Image", logo: "Logo", music: "Music", sfx: "Sound effect" }[asset.kind]}</span></li>}</For></ul>
              </details>
            </Show>
            <div>
              <div {...sx(s.label)}>What changed</div>
              <div {...sx(s.stats)}>
                <Stat value={fmtDuration(g().plan!.duration_seconds)} label="final length" />
                <Stat value={g().plan!.stats.cuts} label="cuts" />
                <Stat value={g().plan!.stats.fillers_removed} label="fillers & stumbles cut" />
                <Stat value={g().plan!.stats.pauses_removed} label="pauses removed" />
                <Stat value={g().plan!.stats.broll} label="B-roll shots" />
                <Stat value={g().plan!.stats.punch_ins} label="punch-ins" />
                <Show when={g().plan!.stats.graphics}><Stat value={g().plan!.stats.graphics!} label="motion graphics" /></Show>
                <Show when={g().plan!.stats.slow_motion}><Stat value={g().plan!.stats.slow_motion!} label="slow-motion moments" /></Show>
              </div>
            </div>
            <Show when={settingsChanged()}>
              <div {...sx(s.changed)}>
                <span>You changed settings since this edit.</span>
                <Button size="sm" variant="primary" loading={busy() === "regen"} onClick={regenerate}>
                  Regenerate
                </Button>
              </div>
            </Show>
            <Show when={error()}>
              <div {...sx(s.errorText)}>{error()}</div>
            </Show>
            <ResolutionPicker width={g().plan!.width} height={g().plan!.height} />
            <div {...sx(s.actions)}>
              <Show
                when={exportedThisPlan()}
                fallback={
                  <Button variant="primary" size="lg" loading={busy() === "export"} disabled={needsApproval()} onClick={exportVideo}>
                    <IconDownload size={18} /> Export MP4
                  </Button>
                }
              >
                <Button variant="primary" size="lg" onClick={props.onExport}>
                  <IconDownload size={18} /> View export
                </Button>
              </Show>
              <OpenInEditor planId={g().plan!.id} />
              <Button size="lg" loading={busy() === "regen"} onClick={regenerate}>
                <IconRefresh size={17} /> Regenerate
              </Button>
              <Button size="lg" variant="ghost" onClick={props.onConfigure}>
                <IconSliders size={17} /> Adjust
              </Button>
            </div>
            <Show when={needsApproval()}>
              <div {...sx(s.warn)}>Check the storyboard below and approve it to export.</div>
            </Show>
            <div {...sx(s.warn)}>
              Preview is a fast low-resolution draft. <Badge>Export renders full quality</Badge>
            </div>
          </div>
        </div>
        <StoryboardView board={board()} loading={boardLoading()} busy={busy() === "board"} onApprove={approveBoard} revising={busy() === "revise"} onRevise={revise} reviseError={reviseError()} />
      </Match>
    </Switch>
  );
}
