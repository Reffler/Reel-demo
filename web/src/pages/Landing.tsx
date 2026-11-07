import * as stylex from "@stylexjs/stylex";
import { A } from "@solidjs/router";
import { For, Show, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { Brand } from "../components/Brand";
import { isLight, toggleTheme, user } from "../store";
import { sx } from "../sx";
import { color, radius } from "../tokens.stylex";
import { IconArrowRight, IconDownload, IconMoon, IconSun } from "../ui/icons";
import resolveIcon from "../assets/resolve.png";
import tourBusinessDark from "../assets/landing/tour-business-dark.jpg";
import tourBusinessLight from "../assets/landing/tour-business-light.jpg";
import tourIdeasDark from "../assets/landing/tour-ideas-dark.jpg";
import tourIdeasLight from "../assets/landing/tour-ideas-light.jpg";
import tourScheduleDark from "../assets/landing/tour-schedule-dark.jpg";
import tourScheduleLight from "../assets/landing/tour-schedule-light.jpg";
import tourCreateDark from "../assets/landing/tour-create-dark.jpg";
import tourCreateLight from "../assets/landing/tour-create-light.jpg";
import tourPersonalDark from "../assets/landing/tour-personal-dark.jpg";
import tourPersonalLight from "../assets/landing/tour-personal-light.jpg";
import ideasDark from "../assets/landing/ideas-dark.jpg";
import ideasLight from "../assets/landing/ideas-light.jpg";
import scheduleDark from "../assets/landing/schedule-dark.jpg";
import scheduleLight from "../assets/landing/schedule-light.jpg";
import personalDark from "../assets/landing/personal-dark.jpg";
import personalLight from "../assets/landing/personal-light.jpg";

const ease = "cubic-bezier(.25,.1,.25,1)";
const wide = "@media (min-width: 900px)";
const mid = "@media (min-width: 640px)";
const reduce = "@media (prefers-reduced-motion: reduce)";

const fill = stylex.keyframes({ from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } });
const drift = stylex.keyframes({ from: { transform: "scale(1)" }, to: { transform: "scale(1.035)" } });

const SLIDE_MS = 4200;

const fadeUp = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(20px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const s = stylex.create({
  page: { minHeight: "100vh", backgroundColor: color.bg, color: color.text },
  bar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    backgroundColor: color.bg,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: color.border,
  },
  barInner: {
    maxWidth: 1120,
    marginInline: "auto",
    height: 64,
    paddingInline: { default: 16, [mid]: 28 },
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  brandLink: { textDecoration: "none", marginRight: 24 },
  navLink: {
    display: { default: "none", [wide]: "inline-flex" },
    paddingInline: 12,
    height: 36,
    alignItems: "center",
    borderRadius: radius.pill,
    color: { default: color.muted, ":hover": color.text },
    textDecoration: "none",
    fontSize: 14,
    transitionProperty: "color",
    transitionDuration: "200ms",
  },
  spacer: { flexGrow: 1 },
  signIn: {
    display: { default: "none", [mid]: "inline-flex" },
    paddingInline: 12,
    height: 36,
    alignItems: "center",
    color: { default: color.muted, ":hover": color.text },
    textDecoration: "none",
    fontSize: 14,
  },

  wrap: { maxWidth: 1120, marginInline: "auto", paddingInline: { default: 16, [mid]: 28 } },

  // Buttons are links here, styled like the app's primary and secondary buttons.
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    paddingInline: 22,
    borderRadius: radius.pill,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
    transitionProperty: "background-color, transform",
    transitionDuration: "150ms",
    transitionTimingFunction: ease,
    transform: { default: null, ":active": "scale(.97)" },
    outline: { default: null, ":focus-visible": "none" },
    boxShadow: { default: null, ":focus-visible": "0 0 0 4px rgba(41,151,255,.35)" },
  },
  btnSmall: { height: 36, paddingInline: 16, fontSize: 14 },
  primary: { backgroundColor: { default: color.accentFill, ":hover": color.accentFillHover }, color: color.accentText },
  secondary: {
    backgroundColor: { default: color.surface2, ":hover": color.surface3 },
    color: color.text,
    boxShadow: { default: `inset 0 0 0 1px ${color.border}`, ":focus-visible": "0 0 0 4px rgba(41,151,255,.35)" },
  },

  hero: { paddingTop: { default: 56, [wide]: 104 }, paddingBottom: { default: 56, [wide]: 96 } },
  h1: {
    fontSize: { default: 40, [mid]: 56, [wide]: 72 },
    lineHeight: 1.02,
    letterSpacing: "-0.035em",
    fontWeight: 700,
    margin: 0,
    maxWidth: 900,
  },
  lede: {
    fontSize: { default: 17, [mid]: 20 },
    lineHeight: 1.5,
    color: color.muted,
    maxWidth: 620,
    marginTop: 24,
    marginBottom: 32,
  },
  actions: { display: "flex", flexWrap: "wrap", gap: 12 },
  enter: {
    animationName: { default: fadeUp, [reduce]: "none" },
    animationDuration: "600ms",
    animationTimingFunction: ease,
    animationFillMode: "both",
  },
  d1: { animationDelay: "80ms" },
  d2: { animationDelay: "160ms" },
  d3: { animationDelay: "260ms" },

  shot: {
    display: "block",
    width: "100%",
    height: "auto",
    borderRadius: { default: 12, [mid]: 18 },
    boxShadow: `0 0 0 1px ${color.border}`,
    backgroundColor: color.surface,
  },
  // Hero tour: the real steps playing one after another in an app window.
  tour: { marginTop: { default: 40, [wide]: 64 } },
  stage: {
    borderRadius: { default: 16, [mid]: 22 },
    backgroundColor: color.surface,
    boxShadow: `0 0 0 1px ${color.border}`,
    padding: { default: 8, [mid]: 12 },
  },
  tabs: {
    display: { default: "none", [mid]: "flex" },
    gap: 2,
    padding: 3,
    marginBottom: 12,
    borderRadius: radius.pill,
    backgroundColor: color.surface2,
    width: "fit-content",
    maxWidth: "100%",
  },
  tab: {
    appearance: "none",
    borderWidth: 0,
    height: 32,
    paddingInline: { default: 10, [wide]: 14 },
    borderRadius: radius.pill,
    backgroundColor: "transparent",
    color: { default: color.muted, ":hover": color.text },
    font: "inherit",
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transitionProperty: "background-color, color",
    transitionDuration: "200ms",
    outline: { default: null, ":focus-visible": "none" },
    boxShadow: { default: null, ":focus-visible": "0 0 0 3px rgba(41,151,255,.45)" },
  },
  tabOn: { backgroundColor: color.surface3, color: color.text },
  screen: {
    position: "relative",
    aspectRatio: "944 / 590",
    borderRadius: { default: 10, [mid]: 14 },
    overflow: "hidden",
    backgroundColor: color.bg,
    boxShadow: `0 0 0 1px ${color.border}`,
  },
  slide: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    transform: { default: "translateY(14px) scale(.985)", [reduce]: "none" },
    transitionProperty: "opacity, transform",
    transitionDuration: { default: "320ms", [reduce]: "0ms" },
    transitionTimingFunction: ease,
    pointerEvents: "none",
  },
  // The next screen comes in just after the last one has mostly gone, so the two never blur together.
  slideOn: {
    opacity: 1,
    transform: "none",
    transitionDuration: { default: "650ms", [reduce]: "0ms" },
    transitionDelay: { default: "220ms", [reduce]: "0ms" },
  },
  slideImg: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "top left",
    transformOrigin: "30% 0%",
  },
  slideImgOn: {
    animationName: { default: drift, [reduce]: "none" },
    animationDuration: `${SLIDE_MS + 700}ms`,
    animationTimingFunction: "linear",
    animationFillMode: "both",
  },
  finishSlide: { display: "flex", alignItems: "center", justifyContent: "center", gap: 40, height: "100%", padding: { default: 12, [mid]: 40 } },
  finishInner: { width: "100%", maxWidth: 500, transform: { default: "scale(.78)", [mid]: "none" } },
  // A frame of the finished vertical video, with subtitles in the "Bold pop" style.
  phone: {
    display: { default: "none", [wide]: "flex" },
    flexDirection: "column",
    justifyContent: "flex-end",
    height: "86%",
    aspectRatio: "9 / 16",
    flexShrink: 0,
    borderRadius: 26,
    padding: 18,
    backgroundColor: "#0c0c0d",
    boxShadow: "0 0 0 1px rgba(255,255,255,.12)",
    color: "#fff",
  },
  phoneCaption: {
    fontSize: 26,
    lineHeight: 1.05,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 56,
    textShadow: "0 2px 0 rgba(0,0,0,.6)",
  },
  phoneHot: { color: "#ffd60a" },
  phoneBar: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,.22)", overflow: "hidden" },
  phoneBarFill: { width: "30%", height: "100%", backgroundColor: "#fff" },
  phoneTime: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 6, fontVariantNumeric: "tabular-nums" },
  below: {
    display: "flex",
    flexDirection: { default: "column", [mid]: "row" },
    alignItems: { default: "flex-start", [mid]: "center" },
    gap: { default: 10, [mid]: 16 },
    marginTop: 14,
    paddingInline: 4,
  },
  segments: { display: "flex", gap: 4, flexShrink: 0 },
  seg: {
    appearance: "none",
    borderWidth: 0,
    padding: 0,
    width: { default: 18, [mid]: 28 },
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: color.surface3,
    cursor: "pointer",
    position: "relative",
  },
  segFill: { position: "absolute", inset: 0, backgroundColor: color.accentFill, transformOrigin: "left" },
  segRun: {
    animationName: fill,
    animationDuration: `${SLIDE_MS}ms`,
    animationTimingFunction: "linear",
    animationFillMode: "both",
  },
  caption: { fontSize: 15, color: color.muted, margin: 0, minWidth: 0 },
  captionTitle: { color: color.text, fontWeight: 600 },

  section: { paddingBlock: { default: 72, [wide]: 128 } },
  tint: { backgroundColor: color.surface },
  h2: {
    fontSize: { default: 30, [mid]: 40, [wide]: 48 },
    lineHeight: 1.06,
    letterSpacing: "-0.03em",
    fontWeight: 700,
    margin: 0,
    maxWidth: 980,
  },
  sectionLede: { fontSize: { default: 17, [mid]: 19 }, lineHeight: 1.5, color: color.muted, maxWidth: 620, marginTop: 16, marginBottom: 0 },

  rows: { display: "flex", flexDirection: "column", gap: { default: 72, [wide]: 120 }, marginTop: { default: 56, [wide]: 88 } },
  row: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [wide]: "5fr 7fr" },
    gap: { default: 28, [wide]: 64 },
    alignItems: "center",
  },
  rowFlip: { gridTemplateColumns: { default: "1fr", [wide]: "7fr 5fr" } },
  first: { order: { default: 0, [wide]: -1 } },
  h3: { fontSize: { default: 24, [mid]: 28 }, lineHeight: 1.15, letterSpacing: "-0.02em", fontWeight: 700, margin: 0 },
  body: { fontSize: 17, lineHeight: 1.55, color: color.muted, marginTop: 14, marginBottom: 0, maxWidth: 520 },
  stepList: { fontSize: 14, color: color.faint, marginTop: 20, marginBottom: 0 },
  stepItem: { whiteSpace: "nowrap" },
  stepName: { color: color.text, fontWeight: 500 },
  note: { fontSize: 14, color: color.faint, marginTop: 18, marginBottom: 0 },

  // The hand-off fragment: what the finished edit offers.
  finish: {
    borderRadius: { default: 12, [mid]: 18 },
    boxShadow: `0 0 0 1px ${color.border}`,
    backgroundColor: color.surface,
    padding: { default: 20, [mid]: 32 },
  },
  finishHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  finishTitle: { fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 },
  finishMeta: { fontSize: 14, color: color.muted, marginTop: 4, marginBottom: 0 },
  editors: { listStyle: "none", padding: 0, marginTop: 24, marginBottom: 0, borderRadius: 14, backgroundColor: color.surface2, overflow: "hidden" },
  editor: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minHeight: 60,
    paddingInline: 16,
    borderTopWidth: { default: 1, ":first-child": 0 },
    borderTopStyle: "solid",
    borderTopColor: color.border,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
  },
  markFc: { backgroundColor: "#1c1c1e", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.18)" },
  markPr: { backgroundColor: "#00005b", color: "#9999ff" },
  markImg: { width: 32, height: 32, borderRadius: 8, flexShrink: 0 },
  editorText: { display: "flex", flexDirection: "column", minWidth: 0, flexGrow: 1 },
  editorName: { fontSize: 15, fontWeight: 600 },
  editorHow: { fontSize: 13, color: color.muted },
  open: { fontSize: 14, fontWeight: 600, color: color.accent, whiteSpace: "nowrap" },
  fakeBtn: { pointerEvents: "none" },

  values: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [mid]: "1fr 1fr", [wide]: "1fr 1fr 1fr" },
    columnGap: 48,
    rowGap: { default: 32, [wide]: 48 },
    marginTop: { default: 48, [wide]: 72 },
  },
  valueTitle: { fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 },
  valueBody: { fontSize: 16, lineHeight: 1.55, color: color.muted, marginTop: 8, marginBottom: 0 },

  paths: { display: "grid", gridTemplateColumns: { default: "1fr", [wide]: "1fr 1fr" }, gap: 16, marginTop: { default: 40, [wide]: 56 } },
  path: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: { default: 24, [mid]: 36 },
    borderRadius: 20,
    backgroundColor: color.surface,
    boxShadow: `0 0 0 1px ${color.border}`,
  },
  pathTitle: { fontSize: { default: 24, [mid]: 28 }, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  pathBody: { fontSize: 17, lineHeight: 1.55, color: color.muted, marginTop: 12, marginBottom: 24, flexGrow: 1 },
  pathSteps: { fontSize: 14, color: color.faint, marginTop: 0, marginBottom: 24 },

  closing: { paddingBlock: { default: 80, [wide]: 144 } },
  closingInner: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 28 },

  footer: { borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: color.border, paddingBlock: 28 },
  footerInner: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 },
  footerText: { fontSize: 13, color: color.faint, margin: 0 },

  reveal: {
    opacity: { default: 0, [reduce]: 1 },
    transform: { default: "translateY(24px)", [reduce]: "none" },
    transitionProperty: "opacity, transform",
    transitionDuration: "700ms",
    transitionTimingFunction: ease,
  },
});

/** The screenshot that matches the current theme. */
function Shot(props: { dark: string; light: string; alt: string; style?: stylex.StyleXStyles; eager?: boolean }) {
  return (
    <img
      src={isLight() ? props.light : props.dark}
      alt={props.alt}
      width={1368}
      loading={props.eager ? "eager" : "lazy"}
      decoding="async"
      {...sx(s.shot, props.style)}
    />
  );
}

function Steps(props: { items: string[] }) {
  return (
    <p {...sx(s.stepList)}>
      Steps:{" "}
      <For each={props.items}>
        {(item, i) => (
          <span {...sx(s.stepItem)}>
            <span {...sx(s.stepName)}>{item}</span>
            {i() < props.items.length - 1 ? " · " : ""}
          </span>
        )}
      </For>
    </p>
  );
}

function Row(props: { title: string; flip?: boolean; children: JSX.Element; visual: JSX.Element }) {
  return (
    <div {...sx(s.row, props.flip && s.rowFlip)} data-reveal>
      <div>
        <h3 {...sx(s.h3)}>{props.title}</h3>
        {props.children}
      </div>
      <div {...sx(props.flip && s.first)}>{props.visual}</div>
    </div>
  );
}

function Finish() {
  const editors = [
    { name: "DaVinci Resolve", how: "Opens as a new timeline", mark: <img src={resolveIcon} alt="" {...sx(s.markImg)} /> },
    { name: "Final Cut Pro", how: "Opens as a new project", mark: <span {...sx(s.mark, s.markFc)}>FC</span> },
    { name: "Premiere Pro", how: "Arrives as a sequence you import", mark: <span {...sx(s.mark, s.markPr)}>Pr</span> },
  ];
  return (
    <div {...sx(s.finish)} role="img" aria-label="A finished edit, ready to export as MP4 or open in DaVinci Resolve, Final Cut Pro or Premiere Pro">
      <div {...sx(s.finishHead)}>
        <div>
          <p {...sx(s.finishTitle)}>4am to opening in 30 seconds</p>
          <p {...sx(s.finishMeta)}>0:30 · 9:16 · Subtitles, music and B-roll</p>
        </div>
        <span {...sx(s.btn, s.btnSmall, s.primary, s.fakeBtn)} aria-hidden="true">
          <IconDownload size={16} /> Export MP4
        </span>
      </div>
      <ul {...sx(s.editors)} aria-hidden="true">
        <For each={editors}>
          {(ed) => (
            <li {...sx(s.editor)}>
              {ed.mark}
              <span {...sx(s.editorText)}>
                <span {...sx(s.editorName)}>{ed.name}</span>
                <span {...sx(s.editorHow)}>{ed.how}</span>
              </span>
              <span {...sx(s.open)}>Open</span>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

type Slide = { label: string; caption: string; dark?: string; light?: string; alt: string };

const slides: Slide[] = [
  { label: "Your business", caption: "Tell Reel about your business once. Every video builds on it.", dark: tourBusinessDark, light: tourBusinessLight, alt: "The Business step, filled in for a bakery." },
  { label: "Ideas", caption: "Claude suggests video ideas and rates each one for fit, hook and effort.", dark: tourIdeasDark, light: tourIdeasLight, alt: "Content ideas, each rated by Claude." },
  { label: "Schedule", caption: "Your posts land in a calendar, on the days you post.", dark: tourScheduleDark, light: tourScheduleLight, alt: "A posting calendar with videos planned through the month." },
  { label: "What to create", caption: "Choose a full edit, or keep your own cut and add only what you pick.", dark: tourCreateDark, light: tourCreateLight, alt: "Choosing between a full edit and an assist edit." },
  { label: "Make it personal", caption: "Pick subtitles, music and style. Anything you leave open, Claude decides.", dark: tourPersonalDark, light: tourPersonalLight, alt: "Subtitle styles to choose from in Make it personal." },
  { label: "Finished video", caption: "Export an MP4, or open the edit in Resolve, Final Cut or Premiere.", alt: "A finished video with export and editing software options." },
];

/** The real steps of Reel, playing one after another. Pauses on hover, focus or when off screen. */
function Tour() {
  const [active, setActiveRaw] = createSignal(0);
  // The slide fading out keeps drifting, so nothing snaps while it fades.
  const [prev, setPrev] = createSignal(-1);
  const setActive = (n: number | ((i: number) => number)) => {
    const cur = active();
    const to = typeof n === "function" ? n(cur) : n;
    if (to === cur) return;
    setPrev(cur);
    setActiveRaw(to);
  };
  const [hover, setHover] = createSignal(false);
  const [inView, setInView] = createSignal(true);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const playing = () => !reduced && !hover() && inView();
  const next = () => setActive((i) => (i + 1) % slides.length);

  let el!: HTMLDivElement;
  onMount(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting && !document.hidden), { threshold: 0.3 });
    io.observe(el);
    const vis = () => setInView(!document.hidden);
    document.addEventListener("visibilitychange", vis);
    onCleanup(() => { io.disconnect(); document.removeEventListener("visibilitychange", vis); });
  });

  return (
    <div
      ref={el}
      {...sx(s.tour, s.enter, s.d3)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusIn={() => setHover(true)}
      onFocusOut={() => setHover(false)}
    >
      <div {...sx(s.stage)}>
        <div {...sx(s.tabs)} role="tablist" aria-label="Steps in Reel">
          <For each={slides}>
            {(sl, i) => (
              <button role="tab" aria-selected={active() === i()} onClick={() => setActive(i())} {...sx(s.tab, active() === i() && s.tabOn)}>
                {sl.label}
              </button>
            )}
          </For>
        </div>
        <div {...sx(s.screen)}>
          <For each={slides}>
            {(sl, i) => (
              <div {...sx(s.slide, active() === i() && s.slideOn)} aria-hidden={active() !== i()}>
                <Show
                  when={sl.dark}
                  fallback={
                    <div {...sx(s.finishSlide)}>
                      <div {...sx(s.phone)} aria-hidden="true">
                        <div {...sx(s.phoneCaption)}>The city is <span {...sx(s.phoneHot)}>asleep.</span></div>
                        <div {...sx(s.phoneBar)}><div {...sx(s.phoneBarFill)} /></div>
                        <div {...sx(s.phoneTime)}><span>0:09</span><span>0:30</span></div>
                      </div>
                      <div {...sx(s.finishInner)}><Finish /></div>
                    </div>
                  }
                >
                  <img
                    src={isLight() ? sl.light : sl.dark}
                    alt={active() === i() ? sl.alt : ""}
                    loading={i() === 0 ? "eager" : "lazy"}
                    {...sx(s.slideImg, (active() === i() || prev() === i()) && s.slideImgOn)}
                    style={{ "animation-play-state": playing() || prev() === i() ? "running" : "paused" }}
                  />
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>
      <div {...sx(s.below)}>
        <div {...sx(s.segments)}>
          <For each={slides}>
            {(sl, i) => (
              <button {...sx(s.seg)} aria-label={`Show ${sl.label}`} onClick={() => setActive(i())}>
                <Show when={i() < active() || (reduced && i() === active())}>
                  <span {...sx(s.segFill)} />
                </Show>
                <Show when={!reduced && i() === active()}>
                  <span
                    {...sx(s.segFill, s.segRun)}
                    style={{ "animation-play-state": playing() ? "running" : "paused" }}
                    onAnimationEnd={next}
                  />
                </Show>
              </button>
            )}
          </For>
        </div>
        <p {...sx(s.caption)} aria-live="polite">
          <span {...sx(s.captionTitle)}>{slides[active()].label}.</span> {slides[active()].caption}
        </p>
      </div>
    </div>
  );
}

export function Landing() {
  const start = () => (user() ? "/projects" : "/login");
  const startLabel = () => (user() ? "Open your projects" : "Get started");

  // Sections rise in once as they scroll into view.
  let root!: HTMLDivElement;
  onMount(() => {
    const items = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) return;
    const hidden = stylex.props(s.reveal).className ?? "";
    items.forEach((el) => el.classList.add(...hidden.split(" ").filter(Boolean)));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.opacity = "1";
          el.style.transform = "none";
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    items.forEach((el) => io.observe(el));
    onCleanup(() => io.disconnect());
  });

  return (
    <div {...sx(s.page)} ref={root}>
      <header {...sx(s.bar)}>
        <div {...sx(s.barInner)}>
          <A href="/" {...sx(s.brandLink)} aria-label="Reel">
            <Brand />
          </A>
          <a href="#how" {...sx(s.navLink)}>How it works</a>
          <a href="#why" {...sx(s.navLink)}>Why Reel</a>
          <a href="#start" {...sx(s.navLink)}>Get going</a>
          <div {...sx(s.spacer)} />
          <button class="theme-toggle" onClick={toggleTheme} aria-label={isLight() ? "Switch to dark mode" : "Switch to light mode"} title={isLight() ? "Dark mode" : "Light mode"}>
            <Show when={isLight()} fallback={<IconSun size={18} />}><IconMoon size={18} /></Show>
          </button>
          <Show when={!user()}>
            <A href="/login" {...sx(s.signIn)}>Sign in</A>
          </Show>
          <A href={start()} {...sx(s.btn, s.btnSmall, s.primary)}>{startLabel()}</A>
        </div>
      </header>

      <main>
        <section {...sx(s.wrap, s.hero)}>
          <h1 {...sx(s.h1, s.enter)}>Your social media, planned and edited for you.</h1>
          <p {...sx(s.lede, s.enter, s.d1)}>
            Reel works like a small social media agency. It learns your business, plans what to post and when, and
            turns your footage into finished videos. You decide as much or as little as you like.
          </p>
          <div {...sx(s.actions, s.enter, s.d2)}>
            <A href={start()} {...sx(s.btn, s.primary)}>
              {startLabel()} <IconArrowRight size={16} />
            </A>
            <a href="#how" {...sx(s.btn, s.secondary)}>See how it works</a>
          </div>
          <Tour />
        </section>

        <section id="how" {...sx(s.section, s.tint)}>
          <div {...sx(s.wrap)}>
            <h2 {...sx(s.h2)} data-reveal>From an idea to a finished post, in one place.</h2>
            <p {...sx(s.sectionLede)} data-reveal>
              Each step asks one clear question. Claude does the heavy lifting in between, and everything you answer
              carries into the next step.
            </p>

            <div {...sx(s.rows)}>
              <Row
                title="Plan what to post"
                visual={<Shot dark={ideasDark} light={ideasLight} alt="Content ideas for a bakery, each rated for how well it fits the goals, how strong the hook is and how easy it is to make." />}
              >
                <p {...sx(s.body)}>
                  Tell Reel about your business once. Claude drafts a content strategy and suggests video ideas, then
                  rates each one for how well it fits your goals, how strong its hook is and how easy it is to make.
                </p>
                <Steps items={["Business", "Goals", "Strategy", "Ideas"]} />
              </Row>

              <Row
                flip
                title="Know when it goes out, and who films it"
                visual={<Shot dark={scheduleDark} light={scheduleLight} alt="A posting calendar with videos planned on Tuesdays, Thursdays and Saturdays." />}
              >
                <p {...sx(s.body)}>
                  Your ideas land in a posting calendar on the days you post. For each video, film it with us, film it
                  yourself with a shot list made for that idea, or use footage you already have.
                </p>
                <Steps items={["Schedule", "Filming"]} />
              </Row>

              <Row
                title="Say how it should look"
                visual={<Shot dark={personalDark} light={personalLight} alt="The Make it personal step, with subtitle styles to pick from and sections for story, cutting, music and colour." />}
              >
                <p {...sx(s.body)}>
                  Pick a full edit or just the parts you want, add your footage, and make it yours: subtitles, music,
                  pacing, colour, or a reference video whose style you love. Anything you leave open, Claude decides.
                </p>
                <Steps items={["What to create", "Your video", "Footage", "Make it personal", "Review"]} />
              </Row>

              <Row flip title="Get a finished video" visual={<Finish />}>
                <p {...sx(s.body)}>
                  Claude watches your footage, reads what is said and makes the editing calls: cuts, pacing, hook,
                  captions, B-roll and music. Watch the preview and export an MP4, or open the edit in your own editing
                  software to finish it there.
                </p>
                <p {...sx(s.note)}>Works with DaVinci Resolve (also the free version), Final Cut Pro and Premiere Pro.</p>
              </Row>
            </div>
          </div>
        </section>

        <section id="why" {...sx(s.section)}>
          <div {...sx(s.wrap)}>
            <h2 {...sx(s.h2)} data-reveal>What an agency gives you, without the wait.</h2>
            <div {...sx(s.values)}>
              <For each={values}>
                {(v) => (
                  <div data-reveal>
                    <h3 {...sx(s.valueTitle)}>{v.title}</h3>
                    <p {...sx(s.valueBody)}>{v.body}</p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>

        <section id="start" {...sx(s.section, s.tint)}>
          <div {...sx(s.wrap)}>
            <h2 {...sx(s.h2)} data-reveal>Start with a plan, or go straight to editing.</h2>
            <div {...sx(s.paths)}>
              <div {...sx(s.path)} data-reveal>
                <h3 {...sx(s.pathTitle)}>Plan it first</h3>
                <p {...sx(s.pathBody)}>
                  For a steady stream of posts. Six short steps give you a strategy, rated ideas and a calendar. When
                  you start editing, the brief is already half filled in.
                </p>
                <p {...sx(s.pathSteps)}>Business, goals, strategy, ideas, schedule, filming</p>
                <A href={start()} {...sx(s.btn, s.primary)}>{user() ? "Open your projects" : "Plan my content"}</A>
              </div>
              <div {...sx(s.path)} data-reveal>
                <h3 {...sx(s.pathTitle)}>Go straight to editing</h3>
                <p {...sx(s.pathBody)}>
                  Already filmed? Choose what to create, point Reel at your footage, say how it should look and get
                  your video.
                </p>
                <p {...sx(s.pathSteps)}>What to create, your video, footage, make it personal, review</p>
                <A href={start()} {...sx(s.btn, s.secondary)}>{user() ? "Open your projects" : "Edit a video"}</A>
              </div>
            </div>
          </div>
        </section>

        <section {...sx(s.wrap, s.closing)}>
          <div {...sx(s.closingInner)} data-reveal>
            <h2 {...sx(s.h2)}>Make your next video with Reel.</h2>
            <A href={start()} {...sx(s.btn, s.primary)}>
              {startLabel()} <IconArrowRight size={16} />
            </A>
          </div>
        </section>
      </main>

      <footer {...sx(s.footer)}>
        <div {...sx(s.wrap, s.footerInner)}>
          <Brand />
          <p {...sx(s.footerText)}>Reel runs on your computer and plans every edit with Claude.</p>
        </div>
      </footer>
    </div>
  );
}

const values = [
  { title: "One plan behind every video", body: "Your business, goals and voice are filled in once and carry into every brief and every edit." },
  { title: "Minutes, not days", body: "No back and forth with an editor. Change an answer and create the video again." },
  { title: "Your footage stays with you", body: "Point Reel at a folder on your computer and it reads the clips where they are. Upload only if you want to." },
  { title: "No extra bill", body: "Edits run on your own Claude subscription. No API key, no extra charges." },
  { title: "You keep the last word", body: "Every answer can be changed, and every edit opens in your own editing software." },
  { title: "Help where you need it", body: "Rather not film? Choose “Film with us” and a filmmaker comes to you, or you come to the studio." },
];
