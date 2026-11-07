import * as stylex from "@stylexjs/stylex";
import { A, useNavigate } from "@solidjs/router";
import { Match, Show, Switch, createResource, createSignal, onCleanup } from "solid-js";
import { api, type AuthOptions, type User } from "../api";
import { Brand } from "../components/Brand";
import { signedIn } from "../store";
import { sx } from "../sx";
import { color, radius } from "../tokens.stylex";
import { IconInfo } from "../ui/icons";
import { Button, Card, Spinner } from "../ui/kit";

const fadeUp = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const s = stylex.create({
  page: {
    position: "relative",
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: { default: "1fr", "@media (min-width: 980px)": "1.1fr 1fr" },
    alignItems: "center",
    gap: 48,
    maxWidth: 1120,
    marginInline: "auto",
    paddingInline: 24,
    paddingBlock: 48,
  },
  home: { textDecoration: "none" },
  hero: { animationName: fadeUp, animationDuration: "400ms" },
  h1: {
    fontSize: { default: 40, "@media (min-width: 720px)": 56 },
    lineHeight: 1.04,
    letterSpacing: "-0.022em",
    fontWeight: 700,
    marginBlock: "28px 16px",
  },
  grad: { color: color.text },
  lede: { fontSize: 18, color: color.muted, maxWidth: 480, marginBottom: 28 },
  steps: { margin: 0, fontSize: 14, color: color.faint },
  card: { padding: { default: 24, "@media (min-width: 720px)": 32 }, animationName: fadeUp, animationDuration: "500ms" },
  cardTitle: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  cardSub: { color: color.muted, marginTop: 6, marginBottom: 24, fontSize: 14.5 },
  body: { display: "flex", flexDirection: "column", gap: 14 },
  help: { fontSize: 13.5, color: color.muted, lineHeight: 1.5 },
  link: { color: color.accent, textDecoration: "none", fontWeight: 600 },
  error: {
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: color.dangerSoft,
    color: color.danger,
    fontSize: 14,
  },
  account: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    color: "#fff",
    fontWeight: 700,
    backgroundColor: color.accentFill,
  },
  accountText: { minWidth: 0, display: "flex", flexDirection: "column" },
  email: { fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  planLine: { fontSize: 13, color: color.muted },
  steps2: { margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: color.muted },
  code: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBlock: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: 14,
    color: color.text,
  },
  checking: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: color.faint },
  note: {
    display: "flex",
    gap: 10,
    marginTop: 22,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    color: color.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  noteTitle: { color: color.text, fontWeight: 600, marginBottom: 2 },
  icon: { flexShrink: 0, marginTop: 2 },
});

export function Login() {
  const navigate = useNavigate();
  const [options, { refetch }] = createResource(() => api<AuthOptions>("/api/auth/options").catch(() => null));
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [copied, setCopied] = createSignal(false);

  const cc = () => options()?.claude_code;
  const ready = () => !!cc() && !cc()!.problem;

  // While the user signs in through Claude Code in a terminal, keep checking.
  const timer = window.setInterval(() => !ready() && !options.loading && refetch(), 3000);
  onCleanup(() => window.clearInterval(timer));

  async function connect() {
    setError("");
    setBusy(true);
    try {
      const res = await api<{ token: string; user: User }>("/api/auth/login", { method: "POST" });
      signedIn(res.token, res.user);
      navigate("/projects", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard?.writeText(options()?.signin_command ?? "claude auth login").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div {...sx(s.page)}>
      <div {...sx(s.hero)}>
        <A href="/" {...sx(s.home)} aria-label="Reel home">
          <Brand big />
        </A>
        <h1 {...sx(s.h1)}>
          Drop in footage.
          <br />
          <span {...sx(s.grad)}>Get a finished edit.</span>
        </h1>
        <p {...sx(s.lede)}>
          Claude watches your media, reads the transcript and makes the editorial calls — cuts, pacing, hook,
          captions, B-roll and music. You pick the vibe; no timeline required.
        </p>
        <p {...sx(s.steps)}>Upload → Choose a style → Generate → Export MP4</p>
      </div>

      <Card style={s.card}>
        <h2 {...sx(s.cardTitle)}>Continue with Claude</h2>
        <p {...sx(s.cardSub)}>Edits run on your Claude subscription — no API key, no extra billing.</p>
        <div {...sx(s.body)}>
          <Switch>
            <Match when={options.loading && !options()}>
              <div {...sx(s.checking)}>
                <Spinner /> Checking Claude Code on this computer…
              </div>
            </Match>
            <Match when={!options()}>
              <div {...sx(s.error)}>Can't reach the Reel server. Is it running?</div>
            </Match>
            <Match when={ready()}>
              <div {...sx(s.account)}>
                <div {...sx(s.avatar)}>{(cc()!.email ?? "C")[0].toUpperCase()}</div>
                <div {...sx(s.accountText)}>
                  <span {...sx(s.email)}>{cc()!.email ?? "Claude account"}</span>
                  <span {...sx(s.planLine)}>Claude {cc()!.plan ? cc()!.plan![0].toUpperCase() + cc()!.plan!.slice(1) : ""} · signed in to Claude Code</span>
                </div>
              </div>
              <Show when={error()}>
                <div {...sx(s.error)} role="alert">
                  {error()}
                </div>
              </Show>
              <Button variant="primary" size="lg" full loading={busy()} onClick={connect}>
                Continue
              </Button>
              <div {...sx(s.help)}>Different account? Run <code>claude auth login</code> in a terminal and come back.</div>
            </Match>
            <Match when={!cc()!.local || !cc()!.installed}>
              <div {...sx(s.error)}>{cc()!.problem}</div>
              <Show when={!cc()!.installed}>
                <div {...sx(s.help)}>
                  Get it at{" "}
                  <a {...sx(s.link)} href="https://claude.com/claude-code" target="_blank" rel="noreferrer">
                    claude.com/claude-code
                  </a>
                  , sign in with your Claude account, then come back — this page updates on its own.
                </div>
              </Show>
            </Match>
            <Match when={true}>
              <div {...sx(s.help)}>{cc()!.problem}</div>
              <ol {...sx(s.steps2)}>
                <li>Open a terminal on this computer and run:</li>
              </ol>
              <div {...sx(s.code)}>
                <span>{options()!.signin_command}</span>
                <Button size="sm" variant="ghost" onClick={copy}>
                  {copied() ? "Copied" : "Copy"}
                </Button>
              </div>
              <ol {...sx(s.steps2)} start={2}>
                <li>Sign in with your Claude account (Pro or Max) in the browser window it opens.</li>
              </ol>
              <div {...sx(s.checking)}>
                <Spinner /> Waiting for Claude Code…
              </div>
            </Match>
          </Switch>
        </div>
        <div {...sx(s.note)}>
          <span {...sx(s.icon)}>
            <IconInfo size={16} />
          </span>
          <div>
            <div {...sx(s.noteTitle)}>How this works</div>
            Reel asks Claude Code on this computer to plan each edit, so it uses your plan's usage limits. You sign
            in through Claude's own login — Reel never sees your password or tokens.
          </div>
        </div>
      </Card>
    </div>
  );
}
