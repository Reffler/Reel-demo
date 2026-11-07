import "../portal.css";
import { For, Index, Match, Show, Switch, createEffect, createMemo, createResource, createSignal, on, onCleanup, onMount, type JSX } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { A } from "@solidjs/router";
import { api, type BusinessPlan, type CalendarSlot, type ContentIdea, type Day, type ShotPlan } from "../api";
import { fmtAgo } from "../format";
import {
  niceDate, stageIndex, stages, uid, uploadPortalVideo, isoDay,
  type ActionBody, type ClientBrief, type Delivery, type FilmSlot, type Portal, type PortalApi, type PortalEvent, type Role, type Stage,
} from "../portal";
import { Spinner } from "../ui/kit";
import { IconArrowRight, IconCheck, IconChat, IconDownload, IconFilm, IconPlus, IconStory, IconTrash, IconUpload, IconVideo, IconWand, IconX } from "../ui/icons";

// One page, two sides. The client sees what they need to do and what we sent them; the agency
// sees the same page with the tools to answer. At the top: the four stages and whose turn it is.
// Every part of the plan and every video has its own comment thread; everything that happens
// is also on the activity list next to it.

const industries = ["Food & drinks", "Retail & e-commerce", "Beauty & wellness", "Fitness & sports", "Tech & software", "Local services", "Health", "Real estate", "Hospitality & travel", "Education & coaching", "Creative & media", "Something else"];
const businessStages = ["Just starting", "Recently launched", "Growing", "Established"];
const goalOptions = [
  { id: "Get known", hint: "More people in your area or niche know you" },
  { id: "Grow followers", hint: "A bigger audience that sees every post" },
  { id: "Get leads", hint: "Inquiries, bookings and sign-ups" },
  { id: "Sell more", hint: "Sales online or in your shop" },
  { id: "Launch something", hint: "A new product, location or event" },
  { id: "Build trust", hint: "Show your expertise, reviews and how you work" },
  { id: "Find staff", hint: "Show what it’s like to work with you" },
  { id: "Build a community", hint: "Fans who comment, share and come back" },
];
const formatOptions = ["Short videos", "Talking head", "Behind the scenes", "Tutorials & tips", "Interviews", "Product videos", "Customer stories", "Carousels & photos", "Stories", "Longer YouTube videos"];
const platformOptions = ["Instagram", "TikTok", "YouTube", "YouTube Shorts", "LinkedIn", "Facebook", "X", "Pinterest", "Snapchat"];
const days: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pillarOptions = ["Behind the scenes", "Tips & how-tos", "Customer stories", "Product showcase", "Founder story", "FAQs", "Trends & humor", "Team & culture", "Before & after", "News & offers"];
const voiceOptions = ["Friendly", "Professional", "Entertaining", "Educational", "Inspiring", "Bold", "Premium", "Minimal"];
const ideaFormats = ["Short video", "Talking head", "Tutorial", "Vlog", "Interview", "Carousel"];
const filmingTips = [
  "Think about what we should see: your place, your team, your product in use.",
  "Tidy up the spots we'll film in, and keep a change of clothes nearby.",
  "Have two or three sentences ready about what makes you different. We'll help with the rest.",
];

const briefFields = (p: Portal["plan"]): ClientBrief => ({
  name: p.name, industry: p.industry, offer: p.offer, audience: p.audience, location: p.location, links: p.links,
  stage: p.stage, goals: [...p.goals], goal_notes: p.goal_notes, formats: [...(p.formats ?? [])], platforms: [...p.platforms], inspiration: p.inspiration,
  reference_videos: (p.reference_videos ?? []).map(r => ({ ...r })),
});

// Which channel a reference link is from, to label it.
const channelOf = (url: string) => {
  const host = (() => { try { return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const known: [string, string][] = [["instagram.com", "Instagram"], ["tiktok.com", "TikTok"], ["youtube.com", "YouTube"], ["youtu.be", "YouTube"], ["linkedin.com", "LinkedIn"], ["facebook.com", "Facebook"], ["fb.watch", "Facebook"], ["x.com", "X"], ["twitter.com", "X"], ["pinterest.", "Pinterest"], ["vimeo.com", "Vimeo"], ["snapchat.com", "Snapchat"]];
  return known.find(([k]) => host.includes(k))?.[1] ?? host;
};
const hrefOf = (url: string) => url.includes("://") ? url : `https://${url}`;

/** The client's reference videos: paste a link, say what they like about it. */
function ReferenceVideos(props: { value: ClientBrief["reference_videos"]; onChange: (v: ClientBrief["reference_videos"]) => void }) {
  const [url, setUrl] = createSignal("");
  const [note, setNote] = createSignal("");
  const add = (e: Event) => {
    e.preventDefault();
    const u = url().trim();
    if (!u) return;
    props.onChange([...props.value, { url: u, note: note().trim() }]);
    setUrl(""); setNote("");
  };
  return <>
    <Show when={props.value.length}>
      <ul class="portal-refs"><Index each={props.value}>{(r, i) => <li class="portal-card">
        <div class="portal-ref-head">
          <span class="portal-chip">{channelOf(r().url) || "Link"}</span>
          <a href={hrefOf(r().url)} target="_blank" rel="noopener">{r().url}</a>
          <button type="button" class="text-button" aria-label="Remove video" onClick={() => props.onChange(props.value.filter((_, k) => k !== i))}><IconTrash size={16} /></button>
        </div>
        <input aria-label="What you like about it" maxLength={2000} placeholder="What do you like about it? E.g. The fast cuts and the captions" value={r().note}
          onInput={e => props.onChange(props.value.map((x, k) => k === i ? { ...x, note: e.currentTarget.value } : x))} />
      </li>}</Index></ul>
    </Show>
    <form class="portal-ref-add" onSubmit={add}>
      <input aria-label="Video link" maxLength={2000} inputMode="url" placeholder="Paste a link, e.g. instagram.com/reel/…" value={url()} onInput={e => setUrl(e.currentTarget.value)} />
      <input aria-label="What you like about it" maxLength={2000} placeholder="What you like about it (optional)" value={note()} onInput={e => setNote(e.currentTarget.value)} />
      <button class="back-button" type="submit" disabled={!url().trim()}><IconPlus size={16} />Add video</button>
    </form>
  </>;
}

function Pills(props: { label: string; options: readonly string[]; value: string[]; onChange?: (v: string[]) => void; single?: boolean }) {
  const toggle = (o: string) => props.onChange?.(props.single
    ? (props.value.includes(o) ? [] : [o])
    : props.value.includes(o) ? props.value.filter(x => x !== o) : [...props.value, o]);
  return <div class="pills" role="group" aria-label={props.label}><For each={props.options}>{o =>
    <button type="button" aria-pressed={props.value.includes(o)} onClick={() => toggle(o)}>{o}</button>
  }</For></div>;
}

export function PortalView(props: { api: PortalApi; header?: (p: Portal) => JSX.Element }) {
  const role = props.api.role;
  const [portal, setPortal] = createSignal<Portal | null>(null);
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal("");
  const [view, setView] = createSignal<Stage | null>(null);

  async function load(peek = false) {
    try {
      setPortal(await props.api.load(peek));
      setError("");
    } catch (e) { if (!portal()) setError((e as Error).message); }
  }
  onMount(() => void load());
  // New comments and hand-offs show up without a reload.
  const timer = window.setInterval(() => { if (document.visibilityState === "visible" && !busy()) void load(); }, 15_000);
  onCleanup(() => window.clearInterval(timer));

  async function act(body: ActionBody, key = body.action): Promise<boolean> {
    setBusy(key);
    setError("");
    try {
      setPortal(await props.api.act(body));
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally { setBusy(""); }
  }

  const p = () => portal()!;
  const st = () => p().state;
  const shown = () => view() ?? st().stage;
  const mine = () => p().turn.who === role;
  const clientName = () => st().client_name || p().plan.name || "The client";
  const who = (actor: Role) => actor === role ? "You" : actor === "client" ? clientName() : "Your team";
  const eventsFor = (target: string) => p().events.filter(e => e.target === target && e.text);
  const lastRequest = (kind: string, target?: string) => [...p().events].reverse().find(e => e.kind === kind && (target === undefined || e.target === target));
  createEffect(on(() => portal()?.state.stage, () => setView(null), { defer: true }));

  return <Show when={portal()} fallback={<div class="portal-loading">{error() ? <p class="form-error">{error()}</p> : <Spinner />}</div>}>
    <div class="portal wizard">
      <div class="portal-head">
        <div>
          <p class="portal-eyebrow">{role === "agency" ? (st().client_name ? `Client · ${st().client_name}` : "Client") : "Your content plan"}</p>
          <h1>{p().plan.name || "Your business"}</h1>
        </div>
        {props.header?.(p())}
      </div>

      <ol class="portal-stages" aria-label="Stages">
        <For each={stages}>{(s, i) => {
          const at = () => stageIndex(st().stage);
          const state = () => i() < at() ? "done" : i() === at() ? "current" : "next";
          return <li classList={{ [state()]: true, viewing: shown() === s.id }}>
            <button disabled={state() === "next"} aria-current={state() === "current" ? "step" : undefined} onClick={() => setView(s.id === st().stage ? null : s.id)}>
              <span class="portal-stage-dot">{state() === "done" ? <IconCheck size={14} /> : i() + 1}</span>
              <span class="portal-stage-text"><strong>{s.label}</strong><span>{role === "agency" ? s.agency : s.client}</span></span>
            </button>
          </li>;
        }}</For>
      </ol>

      <div classList={{ "portal-turn": true, mine: mine() }} role="status">
        <span class="portal-turn-badge">{mine() ? "Your turn" : role === "agency" ? `Waiting on ${clientName()}` : "With your team"}</span>
        <p>{mine() ? p().turn.what : role === "agency" ? `${clientName()} needs to: ${p().turn.what.charAt(0).toLowerCase()}${p().turn.what.slice(1)}` : p().turn.waiting || p().turn.what}</p>
        <Show when={role === "agency" && !mine()}><CopyNudge portal={p()} /></Show>
      </div>
      <Show when={error()}><p class="form-error portal-error">{error()}</p></Show>

      <div class="portal-grid">
        <section class="portal-main" aria-label={stages[stageIndex(shown())].label}>
          <Switch>
            <Match when={shown() === "brief"}>
              <BriefStage portal={p()} api={props.api} act={act} busy={busy()} lastRequest={lastRequest("request_brief_changes")} onPlan={plan => setPortal({ ...p(), plan: { ...p().plan, ...plan } })} />
            </Match>
            <Match when={shown() === "strategy"}>
              <StrategyStage portal={p()} role={role} planHref={props.api.planHref} act={act} busy={busy()} eventsFor={eventsFor} who={who} lastRequest={lastRequest("request_strategy_changes")} onPlan={plan => setPortal({ ...p(), plan })} />
            </Match>
            <Match when={shown() === "filming"}>
              <FilmingStage portal={p()} role={role} act={act} busy={busy()} eventsFor={eventsFor} who={who} lastRequest={lastRequest("request_other_dates")} />
            </Match>
            <Match when={shown() === "delivery"}>
              <DeliveryStage portal={p()} role={role} act={act} busy={busy()} eventsFor={eventsFor} who={who} lastRequest={lastRequest} />
            </Match>
          </Switch>
        </section>
        <Activity portal={p()} role={role} who={who} act={act} busy={busy()} />
      </div>
    </div>
  </Show>;
}

/** When it's the client's move and no email goes out, a message ready to paste into WhatsApp or mail. */
function CopyNudge(props: { portal: Portal }) {
  const [copied, setCopied] = createSignal(false);
  const text = () => {
    const name = props.portal.state.client_name;
    const what = props.portal.turn.what;
    return `${name ? `Hi ${name}` : "Hi"}, next step for ${props.portal.plan.name || "your content"}: ${what.charAt(0).toLowerCase()}${what.slice(1)}. Here's your page: ${props.portal.link}`;
  };
  return <button class="text-button portal-nudge" onClick={async () => { await navigator.clipboard.writeText(text()); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
    {copied() ? <><IconCheck size={16} />Copied</> : <><IconChat size={16} />{props.portal.mail_ready && props.portal.state.client_email ? "Copy a reminder" : "Copy a message for them"}</>}
  </button>;
}

type StageProps = {
  portal: Portal;
  role: Role;
  act: (b: ActionBody, key?: string) => Promise<boolean>;
  busy: string;
  eventsFor: (target: string) => PortalEvent[];
  who: (a: Role) => string;
};

function Request(props: { event?: PortalEvent; who: string; title: string }) {
  return <Show when={props.event?.text}>
    <div class="portal-request"><strong>{props.title}</strong><p>“{props.event!.text}”</p><span>{props.who} · {fmtAgo(props.event!.at)}</span></div>
  </Show>;
}

/** Ask-for-changes, with the reason written right there. */
function ChangesButton(props: { label: string; placeholder: string; busy: boolean; onSend: (text: string) => Promise<boolean> }) {
  const [open, setOpen] = createSignal(false);
  const [text, setText] = createSignal("");
  return <Show when={open()} fallback={<button class="back-button" onClick={() => setOpen(true)}>{props.label}</button>}>
    <form class="portal-changes" onSubmit={async e => { e.preventDefault(); if (await props.onSend(text())) { setOpen(false); setText(""); } }}>
      <textarea autofocus maxLength={2000} placeholder={props.placeholder} value={text()} onInput={e => setText(e.currentTarget.value)} />
      <div class="portal-actions">
        <button class="next-button" type="submit" disabled={!text().trim() || props.busy}>{props.busy ? <Spinner /> : null}Send</button>
        <button class="text-button" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  </Show>;
}

/** The comments on one part (the strategy, an idea, a date, a video), and a box to add one. */
function Thread(props: StageProps & { target: string; label?: string }) {
  const [open, setOpen] = createSignal(false);
  const [text, setText] = createSignal("");
  const list = () => props.eventsFor(props.target);
  const key = () => `comment:${props.target}`;
  return <div class="portal-thread">
    <For each={list()}>{e => <div classList={{ "portal-comment": true, own: e.actor === props.role }}>
      <span class="portal-comment-who">{props.who(e.actor)}<time>{fmtAgo(e.at)}</time></span>
      <Show when={e.kind !== "comment"}><span class="portal-comment-kind">{e.kind.startsWith("request") ? "Asked for changes" : ""}</span></Show>
      <p>{e.text}</p>
    </div>}</For>
    <Show when={open()} fallback={<button class="portal-comment-open" onClick={() => setOpen(true)}><IconChat size={15} />{list().length ? "Reply" : props.label ?? "Comment"}</button>}>
      <form class="portal-comment-form" onSubmit={async e => { e.preventDefault(); if (await props.act({ action: "comment", target: props.target, text: text() }, key())) { setText(""); setOpen(false); } }}>
        <textarea autofocus maxLength={2000} placeholder="Write a comment…" value={text()} onInput={e => setText(e.currentTarget.value)} />
        <div class="portal-actions">
          <button class="next-button" type="submit" disabled={!text().trim() || props.busy === key()}>Send</button>
          <button class="text-button" type="button" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </form>
    </Show>
  </div>;
}

// ───────── Brief ─────────

function BriefStage(props: { portal: Portal; api: PortalApi; act: StageProps["act"]; busy: string; lastRequest?: PortalEvent; onPlan: (p: ClientBrief) => void }) {
  const st = () => props.portal.state;
  const client = props.api.role === "client";
  const editable = () => client && st().stage === "brief" && st().brief !== "approved";
  const [brief, setBrief] = createStore<ClientBrief>(briefFields(props.portal.plan));
  const [saved, setSaved] = createSignal(true);
  const [ownFormat, setOwnFormat] = createSignal("");
  let timer: number | undefined;
  async function save() {
    window.clearTimeout(timer);
    if (saved()) return;
    await props.api.saveBrief?.(structuredClone(unwrap(brief)));
    setSaved(true);
    props.onPlan(structuredClone(unwrap(brief)));
  }
  const edit = (patch: Partial<ClientBrief>) => { setBrief(patch); setSaved(false); window.clearTimeout(timer); timer = window.setTimeout(() => void save(), 800); };
  onCleanup(() => void save());
  // The agency sees what the client typed as it comes in.
  createEffect(on(() => props.portal.plan, plan => { if (!editable()) setBrief(reconcile(briefFields(plan))); }, { defer: true }));

  const ready = () => !!brief.name.trim() && !!brief.offer.trim();
  return <>
    <h2 class="portal-title">{client ? "Tell us about your business" : "The brief"}</h2>
    <Show when={client && editable()} fallback={<BriefSummary brief={brief} />}>
      <Request event={st().brief === "changes" ? props.lastRequest : undefined} who="Your team" title="What we'd like to know more about" />
      <section class="wizard-field"><h2><label for="b-name">Business name</label></h2>
        <input id="b-name" maxLength={300} placeholder="E.g. Lina’s Bakery" value={brief.name} onInput={e => edit({ name: e.currentTarget.value })} />
      </section>
      <section class="wizard-field"><h2>Industry</h2>
        <Pills label="Industry" single options={industries} value={brief.industry ? [brief.industry] : []} onChange={v => edit({ industry: v[0] ?? "" })} />
      </section>
      <section class="wizard-field"><h2><label for="b-offer">What do you offer?</label></h2>
        <textarea id="b-offer" maxLength={2000} placeholder="E.g. Sourdough bread and pastries, baked fresh every morning. We also cater office breakfasts." value={brief.offer} onInput={e => edit({ offer: e.currentTarget.value })} />
      </section>
      <section class="wizard-field"><h2><label for="b-audience">Who are your customers?</label></h2>
        <textarea id="b-audience" maxLength={2000} placeholder="E.g. Young families and office workers nearby, 25 to 45, who care about good ingredients." value={brief.audience} onInput={e => edit({ audience: e.currentTarget.value })} />
      </section>
      <section class="wizard-field"><h2>Where is your business at?</h2>
        <Pills label="Stage" single options={businessStages} value={brief.stage ? [brief.stage] : []} onChange={v => edit({ stage: v[0] ?? "" })} />
      </section>
      <div class="agency-row">
        <section class="wizard-field"><h2><label for="b-location">Location <span class="optional">Optional</span></label></h2>
          <input id="b-location" maxLength={300} placeholder="E.g. Munich, or online only" value={brief.location} onInput={e => edit({ location: e.currentTarget.value })} />
        </section>
        <section class="wizard-field"><h2><label for="b-links">Website and accounts <span class="optional">Optional</span></label></h2>
          <input id="b-links" maxLength={2000} placeholder="E.g. linasbakery.de, @linasbakery" value={brief.links} onInput={e => edit({ links: e.currentTarget.value })} />
        </section>
      </div>
      <section class="wizard-field"><h2><label for="b-achieve">What should your content achieve?</label></h2>
        <textarea id="b-achieve" maxLength={2000} placeholder="E.g. More catering bookings from offices nearby, and people knowing we bake everything ourselves." value={brief.goal_notes} onInput={e => edit({ goal_notes: e.currentTarget.value })} />
      </section>
      <section class="wizard-field"><h2>Your goals</h2>
        <p class="field-hint">Pick everything that matters. The first one is your main goal.</p>
        <div class="choice-grid styles q-two"><For each={goalOptions}>{g => {
          const at = () => brief.goals.indexOf(g.id);
          return <button type="button" class="choice" aria-pressed={at() >= 0} onClick={() => edit({ goals: at() >= 0 ? brief.goals.filter(x => x !== g.id) : [...brief.goals, g.id] })}>
            <strong>{g.id}<Show when={at() === 0}><span class="agency-badge">Main goal</span></Show></strong><span>{g.hint}</span>
          </button>;
        }}</For></div>
      </section>
      <section class="wizard-field"><h2>What kind of content would you like?</h2>
        <Pills label="Formats" options={[...formatOptions, ...brief.formats.filter(f => !formatOptions.includes(f))]} value={brief.formats} onChange={v => edit({ formats: v })} />
        <form class="q-add-section portal-own" onSubmit={e => { e.preventDefault(); const v = ownFormat().trim(); if (v && !brief.formats.includes(v)) edit({ formats: [...brief.formats, v] }); setOwnFormat(""); }}>
          <input maxLength={300} aria-label="Your own content type" placeholder="Something else? E.g. Recipe videos, Q&A with customers, Day in my life" value={ownFormat()} onInput={e => setOwnFormat(e.currentTarget.value)} />
          <button class="back-button" type="submit" disabled={!ownFormat().trim()}><IconPlus size={16} />Add</button>
        </form>
      </section>
      <section class="wizard-field"><h2>Videos you like <span class="optional">Optional</span></h2>
        <ReferenceVideos value={brief.reference_videos} onChange={v => edit({ reference_videos: v })} />
      </section>
      <section class="wizard-field"><h2>Where would you like to post?</h2>
        <Pills label="Platforms" options={platformOptions} value={brief.platforms} onChange={v => edit({ platforms: v })} />
      </section>
      <section class="wizard-field"><h2><label for="b-insp">Accounts you like or compete with <span class="optional">Optional</span></label></h2>
        <textarea id="b-insp" maxLength={2000} placeholder="E.g. @thebakehouse for their behind the scenes videos." value={brief.inspiration} onInput={e => edit({ inspiration: e.currentTarget.value })} />
      </section>
      <div class="wizard-footer">
        <span />
        <div class="footer-next">
          <button class="next-button" disabled={!ready() || props.busy === "submit_brief"} onClick={async () => { await save(); await props.act({ action: "submit_brief" }); }}>
            {props.busy === "submit_brief" ? <Spinner /> : null}{st().brief === "submitted" ? "Send the update" : "Send to your team"}<IconArrowRight size={18} />
          </button>
        </div>
      </div>
    </Show>

    <Show when={!client && st().stage === "brief"}>
      <Request event={st().brief === "changes" ? props.lastRequest : undefined} who="You" title="You asked for" />
      <div class="portal-actions portal-decide">
        <button class="next-button" disabled={props.busy === "approve_brief"} onClick={() => props.act({ action: "approve_brief" })}>
          {props.busy === "approve_brief" ? <Spinner /> : <IconCheck size={18} />}{st().brief === "submitted" ? "Brief is good, start the plan" : "Start the plan anyway"}
        </button>
        <ChangesButton label="Ask for more info" placeholder="What should they add? E.g. Who are your best customers, and what do they buy most?" busy={props.busy === "request_brief_changes"}
          onSend={text => props.act({ action: "request_brief_changes", text })} />
      </div>
    </Show>
  </>;
}

function BriefSummary(props: { brief: ClientBrief }) {
  const rows = () => [
    ["Business", [props.brief.name, props.brief.industry, props.brief.stage, props.brief.location].filter(Boolean).join(" · ")],
    ["What they offer", props.brief.offer],
    ["Customers", props.brief.audience],
    ["Content should achieve", props.brief.goal_notes],
    ["Goals", props.brief.goals.map((g, i) => i === 0 ? `${g} (main)` : g).join(" · ")],
    ["Content they'd like", props.brief.formats.join(" · ")],
    ["Where to post", props.brief.platforms.join(" · ")],
    ["Website and accounts", props.brief.links],
    ["Accounts they like", props.brief.inspiration],
  ].filter(([, v]) => v) as [string, string][];
  return <Show when={rows().length > 1 || props.brief.offer} fallback={<p class="portal-empty">Nothing filled in yet.</p>}>
    <dl class="portal-summary"><For each={rows()}>{([k, v]) => <><dt>{k}</dt><dd>{v}</dd></>}</For>
      <Show when={props.brief.reference_videos.length}>
        <dt>Videos they like</dt>
        <dd><ul class="portal-ref-list"><For each={props.brief.reference_videos}>{r => <li>
          <span class="portal-chip">{channelOf(r.url) || "Link"}</span>
          <a href={hrefOf(r.url)} target="_blank" rel="noopener">{r.note || r.url}</a>
        </li>}</For></ul></dd>
      </Show>
    </dl>
  </Show>;
}

// ───────── Strategy ─────────

function StrategyStage(props: StageProps & { planHref: string; lastRequest?: PortalEvent; onPlan: (p: Portal["plan"]) => void }) {
  const st = () => props.portal.state;
  const agency = props.role === "agency";
  const editing = () => agency && st().stage === "strategy" && st().strategy !== "approved";
  return <>
    <h2 class="portal-title">{agency ? "The content plan" : "Your content plan"}</h2>
    <Show when={editing()}>
      <Request event={st().strategy === "changes" ? props.lastRequest : undefined} who={props.who("client")} title="Changes they asked for" />
      <StrategyEditor {...props} />
    </Show>
    <Show when={!editing()}>
      <Show when={!agency && st().stage === "strategy" && st().strategy !== "sent"} fallback={<StrategyPlanView {...props} />}>
        <div class="portal-wait"><IconWand size={22} /><div><strong>{st().strategy === "changes" ? "We're working in your changes" : "We're working on your plan"}</strong>
          <p>Where to post, how often, what about, and the first post ideas. You'll get a message when it's ready for you.</p></div></div>
      </Show>
    </Show>
    <Show when={!agency && st().stage === "strategy" && st().strategy === "sent"}>
      <div class="portal-actions portal-decide">
        <button class="next-button" disabled={props.busy === "approve_strategy"} onClick={() => props.act({ action: "approve_strategy" })}>
          {props.busy === "approve_strategy" ? <Spinner /> : <IconCheck size={18} />}Approve the plan
        </button>
        <ChangesButton label="Ask for changes" placeholder="What should be different? You can also comment on a single idea above." busy={props.busy === "request_strategy_changes"}
          onSend={text => props.act({ action: "request_strategy_changes", text })} />
      </div>
    </Show>
  </>;
}

const shownIdeas = (plan: BusinessPlan) => plan.ideas.some(i => i.shortlisted) ? plan.ideas.filter(i => i.shortlisted) : plan.ideas;
const slotFor = (plan: BusinessPlan, ideaId: string) => plan.calendar.find(s => s.idea_id === ideaId);

/** The way into the full plan: overview, every idea, and the shot lists, ready to print or save as PDF. */
function PlanLink(props: { portal: Portal; href: string }) {
  const n = () => shownIdeas(props.portal.plan).length;
  const shots = () => shownIdeas(props.portal.plan).filter(i => i.shots?.shots.length).length;
  return <A class="portal-plan-link" href={props.href}>
    <span class="portal-plan-icon"><IconStory size={22} /></span>
    <span><strong>The full content plan</strong>
      <span>{[`${n()} ${n() === 1 ? "video" : "videos"}`, shots() ? `${shots()} with shot list` : "", "Download as PDF"].filter(Boolean).join(" · ")}</span></span>
    <IconArrowRight size={18} />
  </A>;
}

function StrategyPlanView(props: StageProps & { planHref: string }) {
  const plan = () => props.portal.plan;
  const facts = () => [
    ["Where", plan().platforms.join(", ")],
    ["How often", `${plan().posts_per_week} ${plan().posts_per_week === 1 ? "post" : "posts"} a week${plan().posting_days.length ? `, on ${plan().posting_days.join(", ")}` : ""}`],
    ["What about", plan().pillars.join(" · ")],
    ["How you sound", plan().voice.join(" · ")],
  ].filter(([, v]) => v);
  return <>
    <PlanLink portal={props.portal} href={props.planHref} />
    <div class="portal-card">
      <Show when={plan().strategy_summary}><p class="portal-lead">{plan().strategy_summary}</p></Show>
      <dl class="portal-facts"><For each={facts()}>{([k, v]) => <div><dt>{k}</dt><dd>{v}</dd></div>}</For></dl>
      <Thread {...props} target="strategy" label="Comment on the plan" />
    </div>
    <Show when={shownIdeas(plan()).length}>
      <h3 class="portal-subtitle">Post ideas</h3>
      <div class="portal-ideas"><For each={shownIdeas(plan())}>{idea => {
        const slot = () => slotFor(plan(), idea.id);
        return <article class="portal-card portal-idea">
          <div class="portal-idea-head"><strong>{idea.title}</strong>
            <Show when={slot()}><span class="portal-chip">{niceDate(slot()!.date)}</span></Show></div>
          <Show when={idea.hook}><p class="portal-hook">“{idea.hook}”</p></Show>
          <Show when={idea.description}><p>{idea.description}</p></Show>
          <div class="idea-tags"><For each={[idea.format, idea.platform, idea.pillar].filter(Boolean)}>{t => <span>{t}</span>}</For></div>
          <Show when={idea.shots?.shots.length}><A class="portal-shots-link" href={`${props.planHref}#idea-${idea.id}`}><IconFilm size={15} />Shot list · {idea.shots!.shots.length} shots</A></Show>
          <Thread {...props} target={`idea:${idea.id}`} />
        </article>;
      }}</For></div>
    </Show>
  </>;
}

/** One video's shot list: what to film, in order, with talking points and tips. Claude drafts it; everything stays editable. */
function ShotListEditor(props: { shots: ShotPlan | null; drafting: boolean; busy: boolean; onDraft: () => void; onChange: (s: ShotPlan | null) => void }) {
  const lines = (v: string) => v.split("\n").map(x => x.trim()).filter(Boolean);
  const set = (patch: Partial<ShotPlan>) => props.onChange({ shots: [], talking_points: [], tips: [], ...props.shots, ...patch });
  return <Show when={props.shots} fallback={
    <div class="portal-shots-empty">
      <button class="back-button" disabled={props.busy} onClick={props.onDraft}>{props.drafting ? <><Spinner />Writing the shot list…</> : <><IconWand size={16} />Shot list with Claude</>}</button>
      <button class="text-button" onClick={() => props.onChange({ shots: [{ shot: "", detail: "", seconds: 0 }], talking_points: [], tips: [] })}><IconPlus size={16} />Write it yourself</button>
    </div>}>
    <details class="portal-shots" open>
      <summary>Shot list · {props.shots!.shots.length} {props.shots!.shots.length === 1 ? "shot" : "shots"}</summary>
      <ol class="portal-shot-rows"><Index each={props.shots!.shots}>{(shot, i) => <li>
        <span class="portal-shot-n">{i + 1}</span>
        <input aria-label="Shot" maxLength={300} placeholder="What to film" value={shot().shot} onInput={e => set({ shots: props.shots!.shots.map((x, k) => k === i ? { ...x, shot: e.currentTarget.value } : x) })} />
        <input aria-label="How" maxLength={2000} placeholder="Framing, movement, what to say" value={shot().detail} onInput={e => set({ shots: props.shots!.shots.map((x, k) => k === i ? { ...x, detail: e.currentTarget.value } : x) })} />
        <label class="portal-shot-sec"><input type="number" min="0" max="600" aria-label="Seconds" value={shot().seconds || ""} onInput={e => set({ shots: props.shots!.shots.map((x, k) => k === i ? { ...x, seconds: Math.max(0, Math.min(600, +e.currentTarget.value || 0)) } : x) })} />s</label>
        <button class="text-button" aria-label="Remove shot" onClick={() => set({ shots: props.shots!.shots.filter((_, k) => k !== i) })}><IconX size={14} /></button>
      </li>}</Index></ol>
      <div class="portal-actions">
        <button class="text-button" disabled={props.shots!.shots.length >= 30} onClick={() => set({ shots: [...props.shots!.shots, { shot: "", detail: "", seconds: 0 }] })}><IconPlus size={16} />Add a shot</button>
        <button class="text-button" disabled={props.busy} onClick={props.onDraft}>{props.drafting ? <><Spinner />Writing…</> : <><IconWand size={16} />Write again with Claude</>}</button>
        <button class="text-button danger" onClick={() => props.onChange(null)}>Remove shot list</button>
      </div>
      <label class="portal-label">Talking points <span class="optional">One per line</span></label>
      <textarea maxLength={4000} value={props.shots!.talking_points.join("\n")} onChange={e => set({ talking_points: lines(e.currentTarget.value).slice(0, 15) })} />
      <label class="portal-label">Tips for the shoot <span class="optional">One per line</span></label>
      <textarea maxLength={4000} value={props.shots!.tips.join("\n")} onChange={e => set({ tips: lines(e.currentTarget.value).slice(0, 10) })} />
    </details>
  </Show>;
}

function StrategyEditor(props: StageProps & { planHref: string; onPlan: (p: Portal["plan"]) => void }) {
  const [plan, setPlan] = createStore<Portal["plan"]>(structuredClone(props.portal.plan));
  const [thinking, setThinking] = createSignal("");
  const [err, setErr] = createSignal("");
  const [newPillar, setNewPillar] = createSignal("");
  const [newIdea, setNewIdea] = createSignal("");
  let timer: number | undefined;
  let dirty = false;
  async function save() {
    window.clearTimeout(timer);
    if (!dirty) return;
    dirty = false;
    try {
      const { business } = await api<{ business: { plan: Portal["plan"] } }>(`/api/businesses/${props.portal.business_id}`, { method: "PUT", json: unwrap(plan) });
      props.onPlan(business.plan);
    } catch (e) { setErr((e as Error).message); }
  }
  const edit = (patch: Partial<BusinessPlan>) => { setPlan(patch); dirty = true; window.clearTimeout(timer); timer = window.setTimeout(() => void save(), 800); };
  onCleanup(() => void save());

  async function suggest(kind: "strategy" | "ideas") {
    setThinking(kind); setErr("");
    try {
      const res = await api<{ strategy?: Partial<BusinessPlan> & { summary: string }; ideas?: ContentIdea[] }>(`/api/businesses/${props.portal.business_id}/suggest`, { method: "POST", json: { kind, plan: unwrap(plan) } });
      if (res.strategy) {
        const { summary, ...rest } = res.strategy;
        edit({ ...rest, strategy_summary: summary });
      }
      if (res.ideas) edit({ ideas: [...plan.ideas, ...res.ideas.map(i => ({ ...i, shortlisted: true }))] });
    } catch (e) { setErr((e as Error).message); } finally { setThinking(""); }
  }
  // Edits one idea in place, so its inputs keep their focus while typing.
  const setIdea = (id: string, patch: Partial<ContentIdea>) => {
    setPlan("ideas", i => i.id === id, patch);
    dirty = true; window.clearTimeout(timer); timer = window.setTimeout(() => void save(), 800);
  };
  async function draftShots(idea: ContentIdea) {
    setThinking(`shots:${idea.id}`); setErr("");
    try {
      const { shot_plan } = await api<{ shot_plan: ShotPlan }>(`/api/businesses/${props.portal.business_id}/shot-list`, { method: "POST", json: { plan: unwrap(plan), idea_id: idea.id } });
      setIdea(idea.id, { shots: shot_plan });
    } catch (e) { setErr((e as Error).message); } finally { setThinking(""); }
  }
  const setDate = (idea: ContentIdea, date: string) => {
    const others = plan.calendar.filter(s => s.idea_id !== idea.id);
    const old = slotFor(plan, idea.id);
    edit({ calendar: date ? [...others, { id: old?.id ?? uid("slot"), idea_id: idea.id, date, platform: idea.platform || plan.platforms[0] || "", project_id: old?.project_id ?? "" } as CalendarSlot] : others });
  };
  const sent = () => props.portal.state.strategy === "sent";

  return <>
    <PlanLink portal={{ ...props.portal, plan }} href={props.planHref} />
    <div class="agency-claude">
      <div><strong>Draft it with Claude</strong><p>From the client's brief: platforms, how often, pillars and voice. It replaces the choices below; change anything after.</p></div>
      <button class="next-button" disabled={!!thinking()} onClick={() => suggest("strategy")}>{thinking() === "strategy" ? <><Spinner />Thinking…</> : <><IconWand size={18} />Draft it</>}</button>
    </div>
    <Show when={err()}><p class="form-error">{err()}</p></Show>
    <section class="wizard-field q-gap"><h2><label for="s-summary">The plan in a few sentences</label></h2>
      <textarea id="s-summary" maxLength={2000} placeholder="E.g. We'll show your bakery's mornings on Instagram and TikTok, three times a week…" value={plan.strategy_summary} onInput={e => edit({ strategy_summary: e.currentTarget.value })} />
    </section>
    <section class="wizard-field"><h2>Where to post</h2>
      <Pills label="Platforms" options={platformOptions} value={plan.platforms} onChange={v => edit({ platforms: v })} />
    </section>
    <section class="wizard-field"><div class="field-heading"><h2><label for="s-ppw">How often</label></h2><output for="s-ppw">{plan.posts_per_week} {plan.posts_per_week === 1 ? "post" : "posts"} a week</output></div>
      <input id="s-ppw" class="duration-slider" type="range" min="1" max="14" step="1" value={plan.posts_per_week} onInput={e => edit({ posts_per_week: +e.currentTarget.value })} />
      <p class="field-hint q-gap-small">On which days?</p>
      <Pills label="Posting days" options={days} value={plan.posting_days} onChange={v => edit({ posting_days: days.filter(d => v.includes(d)) })} />
    </section>
    <section class="wizard-field"><h2>Content pillars</h2>
      <Pills label="Content pillars" options={[...pillarOptions, ...plan.pillars.filter(p => !pillarOptions.includes(p))]} value={plan.pillars} onChange={v => edit({ pillars: v })} />
      <form class="q-add-section" onSubmit={e => { e.preventDefault(); const v = newPillar().trim(); if (v && !plan.pillars.includes(v)) edit({ pillars: [...plan.pillars, v] }); setNewPillar(""); }}>
        <input maxLength={300} placeholder="Add your own" value={newPillar()} onInput={e => setNewPillar(e.currentTarget.value)} />
        <button class="back-button" type="submit" disabled={!newPillar().trim()}><IconPlus size={16} />Add</button>
      </form>
    </section>
    <section class="wizard-field"><h2>Brand voice</h2>
      <Pills label="Brand voice" options={voiceOptions} value={plan.voice} onChange={v => edit({ voice: v })} />
    </section>

    <section class="wizard-field"><div class="field-heading"><h2>Post ideas</h2>
      <button class="back-button" disabled={!!thinking()} onClick={() => suggest("ideas")}>{thinking() === "ideas" ? <><Spinner />Finding ideas…</> : <><IconWand size={16} />Ideas from Claude</>}</button></div>
      <div class="portal-ideas"><For each={plan.ideas}>{idea => <article classList={{ "portal-card": true, "portal-idea": true, off: !idea.shortlisted && plan.ideas.some(i => i.shortlisted) }}>
        <input class="portal-idea-title" aria-label="Idea title" maxLength={300} value={idea.title} onInput={e => setIdea(idea.id, { title: e.currentTarget.value })} />
        <textarea aria-label="What it shows" maxLength={2000} placeholder="What it shows" value={idea.description} onInput={e => setIdea(idea.id, { description: e.currentTarget.value })} />
        <div class="portal-idea-row">
          <select aria-label="Format" value={idea.format} onChange={e => setIdea(idea.id, { format: e.currentTarget.value })}>
            <option value="">Format</option><For each={[...new Set([...ideaFormats, idea.format].filter(Boolean))]}>{f => <option>{f}</option>}</For>
          </select>
          <input type="date" aria-label="Post on" value={slotFor(plan, idea.id)?.date ?? ""} min={isoDay(new Date())} onChange={e => setDate(idea, e.currentTarget.value)} />
          <label class="portal-check"><input type="checkbox" checked={idea.shortlisted} onChange={e => setIdea(idea.id, { shortlisted: e.currentTarget.checked })} />Show to client</label>
          <button class="text-button" aria-label="Remove idea" onClick={() => edit({ ideas: plan.ideas.filter(i => i.id !== idea.id), calendar: plan.calendar.filter(s => s.idea_id !== idea.id) })}><IconTrash size={16} /></button>
        </div>
        <ShotListEditor shots={idea.shots ?? null} drafting={thinking() === `shots:${idea.id}`} busy={!!thinking()} onDraft={() => void draftShots(idea)} onChange={v => setIdea(idea.id, { shots: v })} />
        <Thread {...props} target={`idea:${idea.id}`} />
      </article>}</For></div>
      <form class="q-add-section" onSubmit={e => { e.preventDefault(); const t = newIdea().trim(); if (t) edit({ ideas: [...plan.ideas, { id: uid("idea"), title: t, hook: "", description: "", pillar: "", platform: "", format: "", fit: 0, hook_score: 0, effort: 0, verdict: "", source: "you", shortlisted: true }] }); setNewIdea(""); }}>
        <input maxLength={300} placeholder="Add an idea, e.g. A day in the bakery, 4am to opening" value={newIdea()} onInput={e => setNewIdea(e.currentTarget.value)} />
        <button class="back-button" type="submit" disabled={!newIdea().trim()}><IconPlus size={16} />Add</button>
      </form>
    </section>
    <div class="portal-card"><Thread {...props} target="strategy" label="Comment on the plan" /></div>
    <div class="wizard-footer">
      <span />
      <button class="next-button" disabled={props.busy === "send_strategy" || !plan.strategy_summary.trim()} onClick={async () => { await save(); await props.act({ action: "send_strategy" }); }}>
        {props.busy === "send_strategy" ? <Spinner /> : null}{sent() ? "Send again" : props.portal.state.strategy === "changes" ? "Send the updated plan" : "Send to the client"}<IconArrowRight size={18} />
      </button>
    </div>
  </>;
}

// ───────── Filming ─────────

function FilmingStage(props: StageProps & { lastRequest?: PortalEvent }) {
  const st = () => props.portal.state;
  const agency = props.role === "agency";
  const booked = () => {
    const ids = st().film_choices?.length ? st().film_choices : st().film_choice ? [st().film_choice] : [];
    return st().film_slots.filter(s => ids.includes(s.id)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  };
  const [picked, setPicked] = createSignal<string[]>([]);
  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const planning = () => agency && st().stage === "filming" && ["draft", "changes", "proposed"].includes(st().filming);
  return <>
    <h2 class="portal-title">Filming</h2>
    <Show when={booked().length && ["booked", "filmed"].includes(st().filming)}>
      <div class="portal-card portal-booked">
        <span class="portal-chip done"><IconCheck size={14} />{st().filming === "filmed" ? "Filmed" : booked().length === 1 ? "Booked" : `${booked().length} days booked`}</span>
        <ul class="portal-booked-days"><For each={booked()}>{b => <li>
          <strong>{niceDate(b.date, true)}{b.time ? `, ${b.time}` : ""}</strong>
          <Show when={b.location}><p>{b.location}</p></Show>
          <Show when={b.note}><p class="portal-muted">{b.note}</p></Show>
        </li>}</For></ul>
        <Show when={!agency && st().filming === "booked"}>
          <h3 class="portal-subtitle">Before we come</h3>
          <ul class="portal-tips"><For each={filmingTips}>{t => <li>{t}</li>}</For></ul>
        </Show>
        <Thread {...props} target="filming" />
      </div>
      <Show when={agency && st().filming === "booked"}>
        <div class="portal-actions portal-decide">
          <button class="next-button" disabled={props.busy === "mark_filmed"} onClick={() => props.act({ action: "mark_filmed" })}>{props.busy === "mark_filmed" ? <Spinner /> : <IconCheck size={18} />}Filming is done, start editing</button>
          <button class="text-button" onClick={() => props.act({ action: "propose_dates", slots: st().film_slots })}>Change the dates</button>
        </div>
      </Show>
    </Show>

    <Show when={planning()}>
      <Request event={st().filming === "changes" ? props.lastRequest : undefined} who={props.who("client")} title="They wrote" />
      <SlotEditor {...props} />
    </Show>

    <Show when={!agency && st().stage === "filming" && st().filming === "proposed"}>
      <div class="portal-slots" role="group" aria-label="Filming dates"><For each={st().film_slots}>{s => <button type="button" class="portal-card portal-slot" aria-pressed={picked().includes(s.id)} onClick={() => toggle(s.id)}>
        <span class="portal-slot-check">{picked().includes(s.id) ? <IconCheck size={14} /> : null}</span>
        <strong>{niceDate(s.date, true)}{s.time ? `, ${s.time}` : ""}</strong>
        <Show when={s.location}><p>{s.location}</p></Show>
        <Show when={s.note}><p class="portal-muted">{s.note}</p></Show>
      </button>}</For></div>
      <div class="portal-actions portal-decide">
        <button class="next-button" disabled={!picked().length || props.busy === "pick_slot"} onClick={() => props.act({ action: "pick_slot", choices: picked() })}>
          {props.busy === "pick_slot" ? <Spinner /> : <IconCheck size={18} />}{picked().length > 1 ? `Book these ${picked().length} dates` : "Book this date"}
        </button>
        <ChangesButton label="None of these work" placeholder="When would suit you? E.g. Mornings next week, not Friday." busy={props.busy === "request_other_dates"} onSend={text => props.act({ action: "request_other_dates", text })} />
      </div>
    </Show>
    <Show when={!agency && st().stage === "filming" && ["draft", "changes"].includes(st().filming)}>
      <div class="portal-wait"><IconVideo size={22} /><div><strong>{st().filming === "changes" ? "We're finding other dates" : "We're finding filming dates"}</strong><p>You'll get a few dates to pick from.</p></div></div>
    </Show>
  </>;
}

function SlotEditor(props: StageProps) {
  const start = () => props.portal.state.film_slots.length ? structuredClone(props.portal.state.film_slots) : [{ id: uid("slot"), date: "", time: "10:00", location: "", note: "" }];
  const [slots, setSlots] = createStore<FilmSlot[]>(start());
  const set = (i: number, patch: Partial<FilmSlot>) => setSlots(i, patch);
  const ok = () => slots.length > 0 && slots.every(s => s.date);
  const proposed = () => props.portal.state.filming === "proposed";
  return <>
    <div class="portal-slot-rows"><For each={slots}>{(s, i) => <div class="portal-card portal-slot-row">
      <input type="date" aria-label="Date" min={isoDay(new Date())} value={s.date} onInput={e => set(i(), { date: e.currentTarget.value })} />
      <input type="time" aria-label="Time" value={s.time} onInput={e => set(i(), { time: e.currentTarget.value })} />
      <input aria-label="Where" maxLength={300} placeholder="Where, e.g. At your shop" value={s.location} onInput={e => set(i(), { location: e.currentTarget.value })} />
      <button class="text-button" aria-label="Remove date" disabled={slots.length === 1} onClick={() => setSlots(slots.filter((_, k) => k !== i()))}><IconX size={16} /></button>
    </div>}</For></div>
    <button class="text-button" onClick={() => setSlots([...slots, { id: uid("slot"), date: "", time: slots.at(-1)?.time ?? "10:00", location: slots.at(-1)?.location ?? "", note: "" }])}><IconPlus size={16} />Another date</button>
    <div class="wizard-footer">
      <span />
      <button class="next-button" disabled={!ok() || props.busy === "propose_dates"} onClick={() => props.act({ action: "propose_dates", slots: unwrap(slots) })}>
        {props.busy === "propose_dates" ? <Spinner /> : null}{proposed() ? "Send new dates" : "Send the dates"}<IconArrowRight size={18} />
      </button>
    </div>
    <div class="portal-skip"><button class="text-button" onClick={() => props.act({ action: "set_stage", target: "delivery", text: "" })}>No filming needed, go to the videos</button></div>
  </>;
}

// ───────── Delivery ─────────

function DeliveryStage(props: StageProps & { lastRequest: (kind: string, target?: string) => PortalEvent | undefined }) {
  const st = () => props.portal.state;
  const agency = props.role === "agency";
  const [editing, setEditing] = createSignal<Partial<Delivery> | null>(null);
  const list = () => [...st().deliveries].sort((a, b) => (a.post_date || "9999").localeCompare(b.post_date || "9999"));
  const calendar = () => list().filter(d => d.status === "approved");
  const ideaTitle = (id: string) => props.portal.plan.ideas.find(i => i.id === id)?.title;
  return <>
    <h2 class="portal-title">{agency ? "Videos" : "Your videos"}</h2>
    <Show when={agency}>
      <Show when={editing()} fallback={<button class="next-button portal-send" onClick={() => setEditing({})}><IconPlus size={18} />Send a video</button>}>
        <DeliveryForm {...props} start={editing()!} onDone={() => setEditing(null)} />
      </Show>
    </Show>
    <Show when={!list().length && !editing()}>
      <div class="portal-wait"><IconVideo size={22} /><div><strong>{agency ? "No videos sent yet" : "We're editing your videos"}</strong><p>{agency ? "Send an export from Reel, a file from your editing app, or a link." : "Each one shows up here for you to watch and approve."}</p></div></div>
    </Show>
    <div class="portal-videos"><For each={list()}>{d => <article class="portal-card portal-video">
      <Show when={d.video_url} fallback={<Show when={d.url}><a class="portal-link-video" href={d.url} target="_blank" rel="noopener"><IconVideo size={22} />Watch the video</a></Show>}>
        <video src={d.video_url!} controls preload="metadata" playsinline />
      </Show>
      <div class="portal-video-body">
        <div class="portal-idea-head"><strong>{d.title}</strong>
          <span classList={{ "portal-chip": true, done: d.status === "approved", warn: d.status === "changes" }}>{d.status === "approved" ? "Approved" : d.status === "changes" ? "Changes asked" : agency ? "Waiting on client" : "New"}</span></div>
        <p class="portal-muted">{[d.post_date && `Post on ${niceDate(d.post_date)}`, d.platform, d.version > 1 && `Version ${d.version}`, ideaTitle(d.idea_id)].filter(Boolean).join(" · ")}</p>
        <Show when={d.caption}><CaptionBox text={d.caption} /></Show>
        <Show when={d.status === "changes"}><Request event={props.lastRequest("request_video_changes", `video:${d.id}`)} who={props.who("client")} title="Changes asked for" /></Show>
        <div class="portal-actions">
          <Show when={!agency && d.status === "sent"}>
            <button class="next-button" disabled={props.busy === `ok:${d.id}`} onClick={() => props.act({ action: "approve_video", target: `video:${d.id}` }, `ok:${d.id}`)}>{props.busy === `ok:${d.id}` ? <Spinner /> : <IconCheck size={18} />}Approve</button>
            <ChangesButton label="Ask for changes" placeholder="What should change? E.g. Cut the first 3 seconds, and use the other song." busy={props.busy === "request_video_changes"} onSend={text => props.act({ action: "request_video_changes", target: `video:${d.id}`, text })} />
          </Show>
          <Show when={agency}><button class="back-button" onClick={() => setEditing({ ...d })}><IconUpload size={16} />{d.status === "changes" ? "Send new version" : "Replace"}</button></Show>
          <Show when={d.download_url}><a class="text-button" href={d.download_url!}><IconDownload size={16} />Download</a></Show>
        </div>
        <Thread {...props} target={`video:${d.id}`} />
      </div>
    </article>}</For></div>
    <Show when={calendar().length}>
      <h3 class="portal-subtitle">Posting calendar</h3>
      <ol class="portal-calendar"><For each={calendar()}>{d => <li>
        <time>{d.post_date ? niceDate(d.post_date) : "Any day"}</time><strong>{d.title}</strong><span>{d.platform}</span>
        <Show when={d.download_url}><a class="text-button" href={d.download_url!} aria-label={`Download ${d.title}`}><IconDownload size={16} /></a></Show>
      </li>}</For></ol>
    </Show>
  </>;
}

function CaptionBox(props: { text: string }) {
  const [copied, setCopied] = createSignal(false);
  return <div class="portal-caption"><p>{props.text}</p>
    <button class="text-button" onClick={async () => { await navigator.clipboard.writeText(props.text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied() ? "Copied" : "Copy caption"}</button>
  </div>;
}

type Export = { render_id: string; name: string; idea_id: string; ours: boolean; created_at: number };

function DeliveryForm(props: StageProps & { start: Partial<Delivery>; onDone: () => void }) {
  const [d, setD] = createStore<Partial<Delivery>>({ title: "", render_id: "", file: "", url: "", post_date: "", platform: "", caption: "", idea_id: "", ...props.start });
  const [source, setSource] = createSignal<"reel" | "file" | "link">(props.start.url ? "link" : props.start.file ? "file" : "reel");
  const [exports] = createResource(async () => (await api<{ exports: Export[] }>(`/api/portals/${props.portal.id}/exports`)).exports);
  const [upload, setUpload] = createSignal<{ name: string; progress: number } | null>(null);
  const [err, setErr] = createSignal("");
  const ideas = createMemo(() => shownIdeas(props.portal.plan));
  const chosen = () => source() === "reel" ? !!d.render_id : source() === "file" ? !!d.file : !!d.url?.trim();
  const ok = () => !!d.title?.trim() && chosen() && !upload();

  async function pickFile(f: File | undefined) {
    if (!f) return;
    setErr("");
    setUpload({ name: f.name, progress: 0 });
    try {
      const res = await uploadPortalVideo(props.portal.id, f, p => setUpload({ name: f.name, progress: p }));
      setD({ file: res.file });
      if (!d.title) setD({ title: f.name.replace(/\.[^.]+$/, "") });
    } catch (e) { setErr((e as Error).message); } finally { setUpload(null); }
  }
  function pickIdea(id: string) {
    const idea = props.portal.plan.ideas.find(i => i.id === id);
    const slot = slotFor(props.portal.plan, id);
    setD({ idea_id: id, ...(idea && !d.title ? { title: idea.title } : {}), ...(slot && !d.post_date ? { post_date: slot.date, platform: d.platform || slot.platform } : {}) });
  }
  async function send() {
    const body: Partial<Delivery> = { ...unwrap(d), id: d.id ?? "" };
    if (source() !== "reel") body.render_id = "";
    if (source() !== "file") body.file = "";
    if (source() !== "link") body.url = "";
    if (await props.act({ action: "deliver", delivery: body })) props.onDone();
  }

  return <div class="portal-card portal-form">
    <h3 class="portal-subtitle">{d.id ? `New version of “${props.start.title}”` : "Send a video"}</h3>
    <Show when={ideas().length}>
      <label class="portal-label" for="d-idea">For which idea? <span class="optional">Optional</span></label>
      <select id="d-idea" value={d.idea_id} onChange={e => pickIdea(e.currentTarget.value)}><option value="">No idea from the plan</option><For each={ideas()}>{i => <option value={i.id}>{i.title}</option>}</For></select>
    </Show>
    <label class="portal-label" for="d-title">Title</label>
    <input id="d-title" maxLength={300} placeholder="E.g. Morning bake, 4am to opening" value={d.title} onInput={e => setD({ title: e.currentTarget.value })} />
    <div class="sub-tabs portal-tabs" role="tablist">
      <For each={[["reel", "Export from Reel"], ["file", "Upload a file"], ["link", "Paste a link"]] as const}>{([id, label]) =>
        <button role="tab" aria-selected={source() === id} onClick={() => setSource(id)}>{label}</button>}</For>
    </div>
    <Switch>
      <Match when={source() === "reel"}>
        <Show when={!exports.loading} fallback={<Spinner />}>
          <Show when={exports()?.length} fallback={<p class="portal-muted">No finished exports yet. Export a video in Reel first, or upload the file from your editing app.</p>}>
            <select aria-label="Export" value={d.render_id} onChange={e => { const x = exports()!.find(r => r.render_id === e.currentTarget.value); setD({ render_id: e.currentTarget.value }); if (x && !d.title) setD({ title: x.name }); if (x?.idea_id && !d.idea_id) pickIdea(x.idea_id); }}>
              <option value="">Choose an export</option>
              <For each={exports()}>{x => <option value={x.render_id}>{x.name}{x.ours ? "" : " (other business)"} · {new Date(x.created_at * 1000).toLocaleDateString()}</option>}</For>
            </select>
          </Show>
        </Show>
      </Match>
      <Match when={source() === "file"}>
        <label class="folder-drop portal-drop">
          <input type="file" accept="video/*" hidden onChange={e => void pickFile(e.currentTarget.files?.[0])} />
          <IconUpload size={20} />
          <span>{upload() ? `Uploading ${upload()!.name} · ${Math.round(upload()!.progress * 100)}%` : d.file ? "Uploaded. Choose another file to replace it." : "Choose the exported video, e.g. from DaVinci Resolve"}</span>
        </label>
      </Match>
      <Match when={source() === "link"}>
        <input aria-label="Link" maxLength={2000} placeholder="https://drive.google.com/…" value={d.url} onInput={e => setD({ url: e.currentTarget.value })} />
      </Match>
    </Switch>
    <div class="agency-row">
      <div><label class="portal-label" for="d-date">Post on <span class="optional">Optional</span></label>
        <input id="d-date" type="date" value={d.post_date} onInput={e => setD({ post_date: e.currentTarget.value })} /></div>
      <div><label class="portal-label" for="d-platform">Where</label>
        <select id="d-platform" value={d.platform} onChange={e => setD({ platform: e.currentTarget.value })}><option value="">Any</option><For each={platformOptions}>{p => <option>{p}</option>}</For></select></div>
    </div>
    <label class="portal-label" for="d-caption">Caption to post with it <span class="optional">Optional</span></label>
    <textarea id="d-caption" maxLength={2000} placeholder="The text for the post, ready to copy" value={d.caption} onInput={e => setD({ caption: e.currentTarget.value })} />
    <Show when={err()}><p class="form-error">{err()}</p></Show>
    <div class="portal-actions">
      <button class="next-button" disabled={!ok() || props.busy === "deliver"} onClick={() => void send()}>{props.busy === "deliver" ? <Spinner /> : null}Send to the client<IconArrowRight size={18} /></button>
      <button class="text-button" onClick={props.onDone}>Cancel</button>
    </div>
  </div>;
}

// ───────── Activity ─────────

const kindWords: Record<string, string> = {
  submit_brief: "sent the brief", approve_brief: "approved the brief", request_brief_changes: "asked for more in the brief",
  send_strategy: "sent the content plan", approve_strategy: "approved the content plan", request_strategy_changes: "asked for changes to the plan",
  propose_dates: "suggested filming dates", pick_slot: "booked filming dates", request_other_dates: "asked for other dates",
  mark_filmed: "finished filming", deliver: "sent a video", approve_video: "approved a video", request_video_changes: "asked for changes to a video",
  comment: "commented", set_stage: "moved on to the next stage",
};

function Activity(props: { portal: Portal; role: Role; who: (a: Role) => string; act: StageProps["act"]; busy: string }) {
  const [text, setText] = createSignal("");
  const label = (target: string) => {
    if (!target) return "";
    const [kind, id] = target.split(":");
    if (kind === "idea") return props.portal.plan.ideas.find(i => i.id === id)?.title ?? "";
    if (kind === "video") return props.portal.state.deliveries.find(d => d.id === id)?.title ?? "";
    if (kind === "slot") { const s = props.portal.state.film_slots.find(x => x.id === id); return s ? niceDate(s.date) : ""; }
    return target === "strategy" ? "Content plan" : target === "filming" ? "Filming" : "";
  };
  const events = () => [...props.portal.events].reverse();
  return <aside class="portal-activity" aria-label="Messages and activity">
    <h3>Messages</h3>
    <form class="portal-comment-form" onSubmit={async e => { e.preventDefault(); if (await props.act({ action: "comment", text: text() }, "comment:")) setText(""); }}>
      <textarea maxLength={2000} placeholder={props.role === "agency" ? "Write to the client…" : "Write to your team…"} value={text()} onInput={e => setText(e.currentTarget.value)} />
      <button class="next-button" type="submit" disabled={!text().trim() || props.busy === "comment:"}>Send</button>
    </form>
    <ol class="portal-events"><For each={events()} fallback={<li class="portal-muted">Nothing yet.</li>}>{e => <li classList={{ unread: e.actor !== props.role && e.at > props.portal.seen, own: e.actor === props.role }}>
      <span class="portal-event-line"><strong>{props.who(e.actor)}</strong> {kindWords[e.kind] ?? "made an update"}<Show when={label(e.target)}><em> · {label(e.target)}</em></Show></span>
      <Show when={e.text}><p>{e.text}</p></Show>
      <time>{fmtAgo(e.at)}</time>
    </li>}</For></ol>
  </aside>;
}
