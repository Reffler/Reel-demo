import * as stylex from "@stylexjs/stylex";
import { For, Show, createResource, createSignal, onCleanup } from "solid-js";
import { api, type LimitWindow, type Usage, type UsageWindow } from "../api";
import { fmtTokens } from "../format";
import { sx } from "../sx";
import { color, radius } from "../tokens.stylex";
import { IconGauge, IconInfo, IconRefresh } from "../ui/icons";
import { Button, Progress, Spinner } from "../ui/kit";

const fadeUp = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const s = stylex.create({
  wrap: { position: "relative" },
  panel: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 10px)",
    width: "min(380px, calc(100vw - 24px))",
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.borderStrong,
    boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
    animationName: fadeUp,
    animationDuration: "160ms",
    zIndex: 30,
  },
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  title: { fontWeight: 700, fontSize: 15 },
  sub: { fontSize: 12.5, color: color.muted },
  section: {
    paddingBlock: 12,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: color.border,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: color.faint,
    marginBottom: 10,
  },
  row: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 13.5, marginBottom: 6 },
  rowLabel: { color: color.muted },
  value: { fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  note: {
    display: "flex",
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    fontSize: 12.5,
    lineHeight: 1.45,
    color: color.muted,
  },
  noteIcon: { flexShrink: 0, marginTop: 1 },
  limit: { marginBottom: 14 },
  resets: { fontSize: 12, color: color.faint, marginTop: 6 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  stat: { padding: 10, borderRadius: radius.md, backgroundColor: color.surface2 },
  statLabel: { fontSize: 12, color: color.muted, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" },
  statSub: { fontSize: 12, color: color.faint },
  loading: { display: "grid", placeItems: "center", paddingBlock: 30, color: color.muted },
});

function LimitRow(props: { w: LimitWindow }) {
  return (
    <div {...sx(s.limit)}>
      <div {...sx(s.row)}>
        <span {...sx(s.rowLabel)}>{props.w.label}</span>
        <span {...sx(s.value)}>{Math.round(props.w.percent)}% used</span>
      </div>
      <Progress value={props.w.percent / 100} />
      <Show when={props.w.resets}>
        <div {...sx(s.resets)}>Resets {props.w.resets}</div>
      </Show>
    </div>
  );
}

function Window(props: { label: string; w: UsageWindow }) {
  return (
    <div {...sx(s.stat)}>
      <div {...sx(s.statLabel)}>{props.label}</div>
      <div {...sx(s.statValue)}>{fmtTokens(props.w.input_tokens + props.w.output_tokens + props.w.cache_read_tokens + props.w.cache_write_tokens)}</div>
      <div {...sx(s.statSub)}>
        tokens · {props.w.calls} {props.w.calls === 1 ? "edit plan" : "edit plans"}
      </div>
    </div>
  );
}

export function QuotaMenu() {
  const [open, setOpen] = createSignal(false);
  const [usage, { refetch }] = createResource(open, (_, { refetching }): Promise<Usage> => api<Usage>(`/api/claude/usage${refetching ? "?fresh=true" : ""}`));
  let ref!: HTMLDivElement;

  const onDoc = (e: MouseEvent) => open() && !ref.contains(e.target as Node) && setOpen(false);
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
  document.addEventListener("mousedown", onDoc);
  document.addEventListener("keydown", onKey);
  onCleanup(() => {
    document.removeEventListener("mousedown", onDoc);
    document.removeEventListener("keydown", onKey);
  });

  return (
    <div ref={ref} {...sx(s.wrap)}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open())} aria-expanded={open()}>
        <IconGauge size={16} /> Claude usage
      </Button>
      <Show when={open()}>
        <div {...sx(s.panel)} role="dialog" aria-label="Claude usage">
          <div {...sx(s.head)}>
            <div>
              <div {...sx(s.title)}>Claude usage</div>
              <div {...sx(s.sub)}>{usage()?.connection.label ?? "Connected"}</div>
            </div>
            <Button variant="ghost" size="sm" iconOnly aria-label="Refresh" onClick={() => refetch()}>
              <IconRefresh size={16} />
            </Button>
          </div>
          <Show
            when={usage()}
            fallback={
              <div {...sx(s.loading)}>
                <Spinner />
              </div>
            }
          >
            {(u) => (
              <>
                <div {...sx(s.section)}>
                  <div {...sx(s.sectionTitle)}>
                    Claude {u().plan ? u().plan![0].toUpperCase() + u().plan!.slice(1) : ""} plan limits
                  </div>
                  <Show
                    when={u().subscription_limits.available}
                    fallback={<div {...sx(s.sub)}>Claude Code didn't report your limits right now. Try refreshing.</div>}
                  >
                    <For each={u().subscription_limits.windows}>{(w) => <LimitRow w={w} />}</For>
                  </Show>
                  <div {...sx(s.note)}>
                    <span {...sx(s.noteIcon)}>
                      <IconInfo size={15} />
                    </span>
                    <span>Shared with Claude Code and claude.ai — the same limits you see with /usage.</span>
                  </div>
                </div>

                <div {...sx(s.section)}>
                  <div {...sx(s.sectionTitle)}>Used by Reel</div>
                  <div {...sx(s.grid)}>
                    <Window label="Last 5 hours" w={u().app_usage.last_5_hours} />
                    <Window label="Last 7 days" w={u().app_usage.last_7_days} />
                  </div>
                </div>
              </>
            )}
          </Show>
        </div>
      </Show>
    </div>
  );
}
