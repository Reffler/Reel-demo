import * as stylex from "@stylexjs/stylex";
import { For, Show, createSignal, type Component } from "solid-js";
import { api, mediaUrl, uploadFile, type Asset, type AssetKind } from "../api";
import { fmtBytes, fmtDuration } from "../format";
import { sx } from "../sx";
import { color, radius } from "../tokens.stylex";
import { IconArrowRight, IconBadge, IconFilm, IconImage, IconMusic, IconRefresh, IconSpark, IconTrash, IconUpload, IconVideo } from "../ui/icons";
import { Badge, Button, Progress } from "../ui/kit";

export type Uploading = { key: string; kind: AssetKind; name: string; size: number; progress: number; error?: string; abort: () => void };

type Category = {
  kind: AssetKind;
  title: string;
  hint: string;
  accept: string;
  icon: Component<{ size?: number }>;
  multiple: boolean;
  wide?: boolean;
};

const CATEGORIES: Category[] = [
  { kind: "main", title: "Main footage", hint: "Talking head, podcast, vlog — the spine of your edit", accept: "video/*,.mkv,.mov", icon: IconVideo, multiple: true, wide: true },
  { kind: "broll", title: "B-roll", hint: "Cutaways that illustrate what's being said", accept: "video/*,.mkv,.mov", icon: IconFilm, multiple: true },
  { kind: "image", title: "Images", hint: "Photos, screenshots and graphics", accept: "image/*", icon: IconImage, multiple: true },
  { kind: "logo", title: "Logo", hint: "A PNG with transparency works best", accept: "image/*", icon: IconBadge, multiple: false },
  { kind: "music", title: "Music", hint: "Background track, ducked under speech", accept: "audio/*", icon: IconMusic, multiple: true },
  { kind: "sfx", title: "Sound effects", hint: "Whooshes, pops, risers, hits", accept: "audio/*", icon: IconSpark, multiple: true },
];

const fadeUp = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const s = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 820px)": "1fr 1fr" },
    gap: 16,
  },
  wide: { gridColumn: { default: "auto", "@media (min-width: 820px)": "1 / -1" } },
  cat: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: color.border,
    boxShadow: "none",
    animationName: fadeUp,
    animationDuration: "300ms",
    animationFillMode: "both",
  },
  catHead: { display: "flex", alignItems: "center", gap: 12 },
  catIcon: {
    visibility: "hidden",
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    backgroundColor: color.accentSoft,
    color: color.accent,
    flexShrink: 0,
  },
  catTitle: { fontWeight: 700, fontSize: 15.5 },
  catHint: { fontSize: 13, color: color.muted },
  drop: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 96,
    paddingInline: 16,
    textAlign: "center",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: { default: color.borderStrong, ":hover": color.accent },
    backgroundColor: { default: "transparent", ":hover": color.accentSoft },
    color: color.muted,
    fontSize: 13.5,
    cursor: "pointer",
    transitionProperty: "border-color, background-color",
    transitionDuration: "150ms",
    outline: { default: "none", ":focus-visible": `2px solid ${color.accent}` },
  },
  dropBig: { minHeight: 150 },
  dropActive: { borderColor: color.accent, backgroundColor: color.accentSoft, color: color.text },
  dropStrong: { color: color.text, fontWeight: 600 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    animationName: fadeUp,
    animationDuration: "200ms",
  },
  thumb: {
    width: 64,
    height: 40,
    borderRadius: 8,
    objectFit: "cover",
    backgroundColor: color.surface3,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    color: color.faint,
    overflow: "hidden",
  },
  info: { minWidth: 0, flexGrow: 1, display: "flex", flexDirection: "column", gap: 4 },
  fname: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { fontSize: 12.5, color: color.muted, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  transcript: {
    fontSize: 12.5,
    color: color.faint,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontStyle: "italic",
  },
  err: { fontSize: 12.5, color: color.danger },
  footer: {
    position: "sticky",
    bottom: 16,
    marginTop: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    paddingLeft: 18,
    borderRadius: radius.lg,
    backgroundColor: `color-mix(in srgb, ${color.surface} 88%, transparent)`,
    backdropFilter: "blur(12px)",
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: color.border,
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
  },
  footText: { fontSize: 14, color: color.muted },
  hidden: { display: "none" },
});

function statusBadge(a: Asset) {
  if (a.status === "error") return <Badge tone="danger">Couldn't process</Badge>;
  if (a.status === "ready") {
    if (a.kind === "main" && a.transcript) return <Badge tone="success">Ready · {a.transcript.words} words</Badge>;
    if (a.kind === "main" && a.has_audio === false) return <Badge tone="success">Ready · no audio</Badge>;
    return <Badge tone="success">Ready</Badge>;
  }
  const pct = a.progress > 0 && a.progress < 1 ? ` ${Math.round(a.progress * 100)}%` : "";
  return <Badge tone="accent">{(a.stage ?? "Waiting") + pct}</Badge>;
}

function AssetRow(props: { asset: Asset; onDelete: () => void; onRetry: () => void; icon: Component<{ size?: number }> }) {
  const a = () => props.asset;
  return (
    <div {...sx(s.item)}>
      <Show
        when={a().thumb_url}
        fallback={
          <div {...sx(s.thumb)}>
            <props.icon size={18} />
          </div>
        }
      >
        <img src={mediaUrl(a().thumb_url)} alt="" {...sx(s.thumb)} />
      </Show>
      <div {...sx(s.info)}>
        <div {...sx(s.fname)} title={a().filename}>
          {a().filename}
        </div>
        <div {...sx(s.meta)}>
          {statusBadge(a())}
          <Show when={a().duration && a().kind !== "image" && a().kind !== "logo"}>
            <span>{fmtDuration(a().duration)}</span>
          </Show>
          <Show when={a().width}>
            <span>
              {a().width}×{a().height}
            </span>
          </Show>
          <span>{fmtBytes(a().size)}</span>
        </div>
        <Show when={a().status === "processing" && a().progress > 0}>
          <Progress value={a().progress} />
        </Show>
        <Show when={a().transcript?.preview}>
          <div {...sx(s.transcript)}>“{a().transcript!.preview}…”</div>
        </Show>
        <Show when={a().error}>
          <div {...sx(s.err)}>{a().error}</div>
        </Show>
      </div>
      <Show when={a().status === "error"}>
        <Button variant="ghost" size="sm" iconOnly aria-label="Retry" onClick={props.onRetry}>
          <IconRefresh size={15} />
        </Button>
      </Show>
      <Button variant="ghost" size="sm" iconOnly aria-label={`Remove ${a().filename}`} onClick={props.onDelete}>
        <IconTrash size={15} />
      </Button>
    </div>
  );
}

export function UploadStep(props: {
  projectId: string;
  assets: Asset[];
  uploads: Uploading[];
  setUploads: (fn: (u: Uploading[]) => Uploading[]) => void;
  refresh: () => Promise<void>;
  onContinue: () => void;
  kinds?: AssetKind[];
  compact?: boolean;
}) {
  const [dragging, setDragging] = createSignal<AssetKind | null>(null);

  function start(kind: AssetKind, files: FileList | File[]) {
    const list = Array.from(files);
    const cat = CATEGORIES.find((c) => c.kind === kind)!;
    for (const file of cat.multiple ? list : list.slice(0, 1)) {
      const key = `${kind}-${file.name}-${Date.now()}-${Math.random()}`;
      const job = uploadFile(props.projectId, kind, file, (p) =>
        props.setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))),
      );
      props.setUploads((u) => [...u, { key, kind, name: file.name, size: file.size, progress: 0, abort: job.abort }]);
      job.promise
        .then(async () => {
          await props.refresh();
          props.setUploads((u) => u.filter((x) => x.key !== key));
        })
        .catch((e: Error) => props.setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: e.message } : x))));
    }
    // A logo slot holds one file — replace the previous one.
    if (!cat.multiple) {
      for (const old of props.assets.filter((a) => a.kind === kind)) void remove(old);
    }
  }

  async function remove(a: Asset) {
    await api(`/api/assets/${a.id}`, { method: "DELETE" }).catch(() => {});
    await props.refresh();
  }

  async function retry(a: Asset) {
    await api(`/api/assets/${a.id}/reanalyze`, { method: "POST" }).catch(() => {});
    await props.refresh();
  }

  const videos = () => props.assets.filter((a) => (a.kind === "main" || a.kind === "broll") && a.status !== "error");
  const processing = () => props.assets.filter((a) => a.status === "queued" || a.status === "processing").length;

  return (
    <>
      <div {...sx(s.grid)}>
        <For each={CATEGORIES.filter((c) => !props.kinds || props.kinds.includes(c.kind))}>
          {(cat, i) => {
            let input!: HTMLInputElement;
            const items = () => props.assets.filter((a) => a.kind === cat.kind);
            const pending = () => props.uploads.filter((u) => u.kind === cat.kind);
            return (
              <section {...sx(s.cat, cat.wide && s.wide)} style={{ "animation-delay": `${i() * 40}ms` }}>
                <div {...sx(s.catHead)}>
                  <div {...sx(s.catIcon)}>
                    <cat.icon size={20} />
                  </div>
                  <div>
                    <div {...sx(s.catTitle)}>{cat.title}</div>
                    <div {...sx(s.catHint)}>{cat.hint}</div>
                  </div>
                </div>

                <div
                  role="button"
                  tabindex="0"
                  {...sx(s.drop, cat.wide && s.dropBig, dragging() === cat.kind && s.dropActive)}
                  onClick={() => input.click()}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(cat.kind);
                  }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(null);
                    if (e.dataTransfer?.files.length) start(cat.kind, e.dataTransfer.files);
                  }}
                >
                  <IconUpload size={20} />
                  <span>
                    <span {...sx(s.dropStrong)}>Drop {cat.multiple ? "files" : "a file"}</span> or click to browse
                  </span>
                </div>
                <input
                  ref={input}
                  type="file"
                  accept={cat.accept}
                  multiple={cat.multiple}
                  {...sx(s.hidden)}
                  onChange={(e) => {
                    if (e.currentTarget.files?.length) start(cat.kind, e.currentTarget.files);
                    e.currentTarget.value = "";
                  }}
                />

                <Show when={items().length || pending().length}>
                  <div {...sx(s.list)}>
                    <For each={items()}>
                      {(a) => <AssetRow asset={a} icon={cat.icon} onDelete={() => remove(a)} onRetry={() => retry(a)} />}
                    </For>
                    <For each={pending()}>
                      {(u) => (
                        <div {...sx(s.item)}>
                          <div {...sx(s.thumb)}>
                            <IconUpload size={18} />
                          </div>
                          <div {...sx(s.info)}>
                            <div {...sx(s.fname)}>{u.name}</div>
                            <Show
                              when={!u.error}
                              fallback={<div {...sx(s.err)}>{u.error}</div>}
                            >
                              <div {...sx(s.meta)}>
                                <Badge tone="accent">Uploading {Math.round(u.progress * 100)}%</Badge>
                                <span>{fmtBytes(u.size)}</span>
                              </div>
                              <Progress value={u.progress} />
                            </Show>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label="Cancel upload"
                            onClick={() => {
                              u.abort();
                              props.setUploads((list) => list.filter((x) => x.key !== u.key));
                            }}
                          >
                            <IconTrash size={15} />
                          </Button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </section>
            );
          }}
        </For>
      </div>

      <Show when={!props.compact}><div {...sx(s.footer)}>
        <span {...sx(s.footText)}>
          <Show when={videos().length} fallback="Add at least one video to start.">
            {videos().length} {videos().length === 1 ? "video" : "videos"} added
            <Show when={processing()}> · analyzing {processing()} in the background</Show>
          </Show>
        </span>
        <Button variant="primary" disabled={!videos().length} onClick={props.onContinue}>
          Configure edit <IconArrowRight size={16} />
        </Button>
      </div></Show>
    </>
  );
}
