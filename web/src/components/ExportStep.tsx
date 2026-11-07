import * as stylex from "@stylexjs/stylex";
import { Match, Show, Switch, createSignal } from "solid-js";
import { api, mediaUrl, type Generation, type Render } from "../api";
import { fmtBytes, fmtDuration } from "../format";
import { sx } from "../sx";
import { color, radius } from "../tokens.stylex";
import { IconArrowLeft, IconCheck, IconDownload, IconRefresh } from "../ui/icons";
import { Button, Progress } from "../ui/kit";
import { OpenInEditor } from "./EditorConnect";
import { ResolutionPicker } from "./ResolutionPicker";
import { outputSize, resolution, resolutionLabel, type Resolution } from "../resolution";

const fadeUp = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const s = stylex.create({
  card: {
    maxWidth: 760,
    marginInline: "auto",
    padding: { default: 22, "@media (min-width: 720px)": 32 },
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    boxShadow: color.shadow,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 16,
    animationName: fadeUp,
    animationDuration: "300ms",
  },
  h2: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  sub: { color: color.muted, margin: 0 },
  bar: { width: "100%", maxWidth: 420 },
  pct: { fontSize: 44, fontWeight: 700, letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums", lineHeight: 1 },
  done: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    backgroundColor: color.success,
    color: "#fff",
  },
  video: { borderRadius: radius.lg, maxHeight: "60vh", width: "auto", maxWidth: "100%", backgroundColor: "#000" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  link: { textDecoration: "none" },
  error: { padding: 14, borderRadius: radius.md, backgroundColor: color.dangerSoft, color: color.danger, fontSize: 14 },
});

export function ExportStep(props: {
  projectId: string;
  projectName: string;
  generation: Generation | null;
  exportRender: Render | null;
  refresh: () => Promise<void>;
  onPreview: () => void;
}) {
  const [busy, setBusy] = createSignal(false);
  const r = () => props.exportRender;
  const plan = () => props.generation?.plan;

  async function retry() {
    const planId = r()?.plan_id ?? plan()?.id;
    if (!planId) return;
    setBusy(true);
    try {
      await api(`/api/projects/${props.projectId}/exports`, { method: "POST", json: { plan_id: planId, resolution: resolution() } });
      await props.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div {...sx(s.card)}>
      <Switch>
        <Match when={!r()}>
          <h2 {...sx(s.h2)}>Ready to export</h2>
          <p {...sx(s.sub)}>Render the full-quality MP4 of your latest edit.</p>
          <ResolutionPicker width={plan()?.width} height={plan()?.height} />
          <Button variant="primary" size="lg" loading={busy()} onClick={retry}>
            <IconDownload size={18} /> Export MP4
          </Button>
        </Match>

        <Match when={r()!.status === "error"}>
          <h2 {...sx(s.h2)}>Export failed</h2>
          <div {...sx(s.error)}>{r()!.error}</div>
          <div {...sx(s.actions)}>
            <Button variant="primary" loading={busy()} onClick={retry}>
              <IconRefresh size={16} /> Try again
            </Button>
            <Button onClick={props.onPreview}>
              <IconArrowLeft size={16} /> Back to preview
            </Button>
          </div>
        </Match>

        <Match when={r()!.status !== "done"}>
          <h2 {...sx(s.h2)}>Rendering your video</h2>
          <p {...sx(s.sub)}>
            Full quality{plan() ? ` · ${resolutionLabel(r()!.resolution)} (${outputSize(plan()!.width, plan()!.height, (r()!.resolution ?? "1080p") as Resolution)}) · ${fmtDuration(plan()!.duration_seconds)}` : ""}. You can
            leave this page — it keeps going.
          </p>
          <div {...sx(s.pct)}>{r()!.status === "queued" ? "Queued" : `${Math.round(r()!.progress * 100)}%`}</div>
          <div {...sx(s.bar)}>
            <Progress value={r()!.status === "queued" ? null : r()!.progress} />
          </div>
        </Match>

        <Match when={r()!.status === "done"}>
          <div {...sx(s.done)}>
            <IconCheck size={28} />
          </div>
          <h2 {...sx(s.h2)}>Your video is ready</h2>
          <p {...sx(s.sub)}>
            {props.projectName} · MP4 · {resolutionLabel(r()!.resolution)}{r()!.size ? ` · ${fmtBytes(r()!.size)}` : ""}
          </p>
          <Show when={r()!.saved_to}>
            <p {...sx(s.sub)}>Saved to the client's exports folder: {r()!.saved_to}</p>
          </Show>
          <Show when={r()!.chapters}>
            <div class="export-chapters">
              <div><strong>YouTube chapters</strong><span>Paste them into the video's description.</span></div>
              <pre>{r()!.chapters}</pre>
              <button class="text-button" onClick={() => void navigator.clipboard?.writeText(r()!.chapters ?? "")}>Copy chapters</button>
            </div>
          </Show>
          <video {...sx(s.video)} src={mediaUrl(r()!.video_url)} controls playsinline preload="metadata" />
          <div {...sx(s.actions)}>
            <a href={mediaUrl(r()!.download_url)} download="" {...sx(s.link)}>
              <Button variant="primary" size="lg" tabindex="-1">
                <IconDownload size={18} /> Download MP4
              </Button>
            </a>
            <OpenInEditor planId={r()!.plan_id} />
            <Button size="lg" onClick={props.onPreview}>
              <IconArrowLeft size={17} /> Back to preview
            </Button>
          </div>
          <div class="export-again">
            <ResolutionPicker width={plan()?.width} height={plan()?.height} />
            <Show when={resolution() !== (r()!.resolution ?? "1080p")}>
              <Button loading={busy()} onClick={retry}>
                <IconDownload size={16} /> Export in {resolutionLabel(resolution())}
              </Button>
            </Show>
          </div>
          <Show when={plan() && r()!.plan_id !== plan()!.id}>
            <p {...sx(s.sub)}>This export is from an earlier edit. Export again from the preview to get the latest one.</p>
          </Show>
        </Match>
      </Switch>
    </div>
  );
}
