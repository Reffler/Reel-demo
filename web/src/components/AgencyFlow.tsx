import { tracked } from "../saveStatus";
import { For, Match, Show, Switch, createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { StepBar, enterStep } from "./StepBar";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { Dynamic, Portal } from "solid-js/web";
import { A, useNavigate } from "@solidjs/router";
import { api, type Agency, type Business, type BusinessPlan, type CalendarSlot, type ContentIdea, type Day, type Project, type Settings, type ShotPlan } from "../api";
import { emptyBrief } from "./Questionnaire";
import { ReviewCards } from "./ReviewCards";
import { Spinner } from "../ui/kit";
import { IconArrowLeft, IconArrowRight, IconBadge, IconCheck, IconFilm, IconFrame, IconGauge, IconInfo, IconLayers, IconPlus, IconSpark, IconStory, IconTrash, IconVideo, IconWand } from "../ui/icons";

// The steps a social media agency takes with a client before anything is edited: get to know the
// business, set goals, agree a strategy, collect and rate ideas, plan the posting calendar and the
// filming. The business answers are shared by all of its videos (`/api/businesses`); what is
// specific to this video is saved as `settings.agency`. The last step hands over to the questionnaire.

type StepId = "business" | "goals" | "strategy" | "ideas" | "schedule" | "filming" | "plan";

const steps: { id: StepId; label: string; title: string; intro: string }[] = [
  { id: "business", label: "Business", title: "Tell us about your business", intro: "You fill this in once. Every video we plan with you builds on it." },
  { id: "goals", label: "Goals", title: "What should your content do for your company?", intro: "Describe it in your own words, then pick the goals that fit. The first goal you pick is your main one." },
  { id: "strategy", label: "Strategy", title: "Your content strategy", intro: "Where you post, how often, and what about. Choose it yourself or let Claude draft it from your answers." },
  { id: "ideas", label: "Ideas", title: "Content ideas", intro: "Collect ideas, see how strong each one is, and pick the one for this video." },
  { id: "schedule", label: "Schedule", title: "Posting schedule", intro: "Plan when each post goes out. Drag a post to another day to move it." },
  { id: "filming", label: "Filming", title: "Who films this video?", intro: "We can film it with you, or you film it yourself with a shot list made for this idea." },
  { id: "plan", label: "Your plan", title: "Your content plan", intro: "" },
];

const industries = ["Food & drinks", "Retail & e-commerce", "Beauty & wellness", "Fitness & sports", "Tech & software", "Local services", "Health", "Real estate", "Hospitality & travel", "Education & coaching", "Creative & media"];
const otherIndustry = "Something else";
const stages = ["Just starting", "Recently launched", "Growing", "Established"];
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
// The same names the questionnaire uses, so the chosen platforms carry over.
const platformOptions = ["Instagram", "TikTok", "YouTube", "YouTube Shorts", "LinkedIn", "Facebook", "X", "Pinterest", "Snapchat"];
const days: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pillarOptions = ["Behind the scenes", "Tips & how-tos", "Customer stories", "Product showcase", "Founder story", "FAQs", "Trends & humor", "Team & culture", "Before & after", "News & offers"];
const voiceOptions = ["Friendly", "Professional", "Entertaining", "Educational", "Inspiring", "Bold", "Premium", "Minimal"];
const formatOptions = ["Short video", "Talking head", "Tutorial", "Vlog", "Interview", "Carousel"];
// Brand voices that match a questionnaire tone.
// What a plan's platforms suggest for the edit: social video is vertical and short unless it is only for wide screens.
const vertical = ["Instagram", "TikTok", "YouTube Shorts", "Snapchat", "Pinterest", "Facebook"];
const formatFor = (where: string[]) => !where.length ? "" : where.some(p => vertical.includes(p)) ? "9:16" : where.includes("LinkedIn") ? "1:1" : "16:9";
const lengthFor = (where: string[]) => where.length && where.every(p => vertical.includes(p)) ? 30 : 60;

const voiceToTone: Record<string, string> = { Professional: "Professional", Entertaining: "Entertaining", Educational: "Educational", Minimal: "Minimal", Bold: "High energy", Premium: "Cinematic" };

const filmingOptions = [
  { id: "with_us", label: "Film with us", hint: "A filmmaker comes to you, or you come to the studio. You just show up.", icon: IconVideo },
  { id: "self", label: "Film it yourself", hint: "With your phone. Claude makes a shot list for this idea so nothing is missed.", icon: IconFrame },
  { id: "have_footage", label: "I already have footage", hint: "Skip filming and add your clips in the editor.", icon: IconFilm },
] as const;

const basicTips = [
  "Film vertically for TikTok, Reels and Shorts, horizontally for YouTube.",
  "Face a window or film outside in the shade. Soft light beats a ring light.",
  "Get close to the person speaking, or use a clip-on mic. Sound matters more than picture.",
  "Record each shot a little longer than you need, and a few extra close-ups.",
];

export const emptyPlan = (): BusinessPlan => ({
  name: "", industry: "", offer: "", audience: "", location: "", links: "", stage: "", goals: [], goal_notes: "", involvement: "",
  platforms: [], posts_per_week: 3, posting_days: [], pillars: [], voice: [], inspiration: "", strategy_summary: "", ideas: [], calendar: [],
});
const emptyAgency = (): Agency => ({
  business_id: "", idea_id: "", filming: "", filming_dates: "", filming_location: "", filming_notes: "", shot_plan: null, completed: false,
});

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayName = (d: Date) => days[(d.getDay() + 6) % 7];
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const nice = (s: string) => parse(s).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
const rated = (i: ContentIdea) => i.fit > 0;
const score = (i: ContentIdea) => rated(i) ? (i.fit + i.hook_score + i.effort) / 3 : 0;
const scoreLabel = (i: ContentIdea) => !rated(i) ? "Not rated yet" : score(i) >= 4 ? "Strong idea" : score(i) >= 3 ? "Good idea" : "Needs work";

function MultiPills(props: { label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  const toggle = (o: string) => props.single
    ? props.onChange(props.value.includes(o) ? [] : [o])
    : props.onChange(props.value.includes(o) ? props.value.filter(x => x !== o) : [...props.value, o]);
  return <div class="pills" role="group" aria-label={props.label}><For each={props.options}>{o =>
    <button aria-pressed={props.value.includes(o)} onClick={() => toggle(o)}>{o}</button>
  }</For></div>;
}

function Meter(props: { label: string; value: number }) {
  return <span class="idea-meter" aria-label={`${props.label}: ${props.value} of 5`}>
    <span>{props.label}</span>
    <span class="idea-dots"><For each={[1, 2, 3, 4, 5]}>{n => <i classList={{ on: n <= props.value }} />}</For></span>
  </span>;
}

export function AgencyFlow(props: { projectId: string; settings: Settings; onChange: (s: Settings) => void; onDone: () => void }) {
  const navigate = useNavigate();
  const [index, setIndex] = createSignal(0);
  const [plan, setPlan] = createStore<BusinessPlan>(emptyPlan());
  const [businesses, setBusinesses] = createSignal<Business[]>([]);
  const [businessId, setBusinessId] = createSignal("");
  // The industry text field only shows for "Something else", or when the saved industry isn't a preset.
  const [otherPicked, setOtherPicked] = createSignal(false);
  const customIndustry = () => otherPicked() || (!!plan.industry && !industries.includes(plan.industry));
  const [loading, setLoading] = createSignal(true);
  const [thinking, setThinking] = createSignal("");
  const [error, setError] = createSignal("");
  const [newIdea, setNewIdea] = createSignal({ title: "", description: "" });
  const [newPillar, setNewPillar] = createSignal("");
  const [weekOffset, setWeekOffset] = createSignal(0);
  const [dragged, setDragged] = createSignal("");

  const a = () => ({ ...emptyAgency(), ...(props.settings.agency ?? {}) });
  const setAgency = (patch: Partial<Agency>) => props.onChange({ ...props.settings, agency: { ...a(), ...patch } });
  const step = () => steps[index()];
  const idea = () => plan.ideas.find(i => i.id === a().idea_id);
  const ideaById = (id: string) => plan.ideas.find(i => i.id === id);
  const answered = (id: StepId) => id !== "business" || !!plan.name.trim();
  const reachable = (i: number) => !loading() && steps.slice(0, i).every(s => answered(s.id));
  const go = (i: number) => { if (!reachable(i)) return; setIndex(i); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // ── loading and saving the business ──
  let saveTimer: number | undefined;
  const snapshot = () => structuredClone(unwrap(plan));
  async function save() {
    window.clearTimeout(saveTimer);
    if (!businessId()) return;
    try {
      const { business } = await tracked(() => api<{ business: Business }>(`/api/businesses/${businessId()}`, { method: "PUT", json: snapshot() }));
      setBusinesses(list => list.map(b => b.id === business.id ? business : b));
    } catch (e) { setError((e as Error).message); }
  }
  const edit = (patch: Partial<BusinessPlan>) => {
    setPlan(patch);
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(save, 500);
  };
  onCleanup(() => { if (saveTimer) void save(); });

  function open(b: Business) {
    setBusinessId(b.id);
    setOtherPicked(false);
    setPlan(reconcile({ ...emptyPlan(), ...b.plan }));
    // The idea belongs to the business, so switching business clears it.
    if (a().business_id !== b.id) setAgency({ business_id: b.id, idea_id: "", shot_plan: null });
  }
  async function newBusiness() {
    await save();
    const { business } = await api<{ business: Business }>("/api/businesses", { method: "POST", json: emptyPlan() });
    setBusinesses(list => [business, ...list]);
    open(business);
  }
  onMount(async () => {
    try {
      const { businesses: list } = await api<{ businesses: Business[] }>("/api/businesses");
      setBusinesses(list);
      const mine = list.find(b => b.id === a().business_id) ?? list[0];
      if (mine) open(mine); else await newBusiness();
      // A business that is already set up starts at its ideas.
      if (mine?.plan.name && mine.plan.goals.length && mine.plan.platforms.length) setIndex(3);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  });

  // ── Claude ──
  async function suggest(kind: "strategy" | "ideas" | "evaluate") {
    if (thinking()) return;
    setThinking(kind); setError("");
    try {
      const res = await api<{ strategy?: { summary: string; platforms: string[]; posts_per_week: number; posting_days: Day[]; pillars: string[]; voice: string[] }; ideas?: ContentIdea[]; scores?: { id: string; fit: number; hook_score: number; effort: number; verdict: string }[] }>(
        `/api/businesses/${businessId()}/suggest`, { method: "POST", json: { kind, plan: snapshot() } });
      if (res.strategy) {
        const s = res.strategy;
        edit({ strategy_summary: s.summary, platforms: s.platforms, posts_per_week: s.posts_per_week, posting_days: s.posting_days, pillars: s.pillars, voice: s.voice });
      }
      if (res.ideas) edit({ ideas: [...res.ideas, ...snapshot().ideas] });
      if (res.scores) {
        const by = new Map(res.scores.map(x => [x.id, x]));
        edit({ ideas: snapshot().ideas.map(i => by.has(i.id) ? { ...i, ...by.get(i.id)!, id: i.id } : i) });
      }
    } catch (e) { setError((e as Error).message); }
    finally { setThinking(""); }
  }

  // ── ideas ──
  const sortedIdeas = () => [...plan.ideas].sort((x, y) =>
    Number(y.id === a().idea_id) - Number(x.id === a().idea_id) || Number(y.shortlisted) - Number(x.shortlisted) || score(y) - score(x));
  const updateIdea = (id: string, patch: Partial<ContentIdea>) => edit({ ideas: snapshot().ideas.map(i => i.id === id ? { ...i, ...patch } : i) });
  function addIdea() {
    const { title, description } = newIdea();
    if (!title.trim()) return;
    const item: ContentIdea = { id: uid("idea"), title: title.trim(), hook: "", description: description.trim(), pillar: "", platform: plan.platforms[0] ?? "", format: "Short video",
      fit: 0, hook_score: 0, effort: 0, verdict: "", source: "you", shortlisted: true };
    edit({ ideas: [item, ...snapshot().ideas] });
    setNewIdea({ title: "", description: "" });
  }
  function removeIdea(id: string) {
    edit({ ideas: snapshot().ideas.filter(i => i.id !== id), calendar: snapshot().calendar.filter(s => s.idea_id !== id || !!s.project_id) });
    if (a().idea_id === id) setAgency({ idea_id: "", shot_plan: null });
  }
  function useForVideo(id: string) {
    if (a().idea_id === id) return setAgency({ idea_id: "", shot_plan: null });
    updateIdea(id, { shortlisted: true });
    setAgency({ idea_id: id, shot_plan: null });
  }

  // ── calendar ──
  const today = () => iso(new Date());
  const weeks = () => {
    const start = addDays(monday(new Date()), weekOffset() * 7);
    return Array.from({ length: 5 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  };
  const slotsOn = (date: string) => plan.calendar.filter(s => s.date === date && ideaById(s.idea_id));
  const scheduled = () => new Set(plan.calendar.map(s => s.idea_id));
  const unscheduled = () => plan.ideas.filter(i => (i.shortlisted || i.id === a().idea_id) && !scheduled().has(i.id));
  const sortedSlots = () => [...plan.calendar].filter(s => ideaById(s.idea_id)).sort((x, y) => x.date.localeCompare(y.date));
  const postingDays = () => plan.posting_days.length ? plan.posting_days : (["Tue", "Thu", "Sat", "Mon", "Wed", "Fri", "Sun"] as Day[]).slice(0, Math.min(7, plan.posts_per_week));
  function nextFreeDays(count: number, taken: CalendarSlot[]) {
    // Posting days from tomorrow on, at most posts_per_week a week, skipping days that already have a post.
    const out: string[] = [];
    const used = new Set(taken.map(s => s.date));
    for (let d = addDays(new Date(), 1), n = 0; out.length < count && n < 180; d = addDays(d, 1), n++) {
      const key = iso(d);
      const week = iso(monday(d));
      const inWeek = [...taken.map(s => s.date), ...out].filter(x => iso(monday(parse(x))) === week).length;
      if (postingDays().includes(dayName(d)) && !used.has(key) && inWeek < plan.posts_per_week) out.push(key);
    }
    return out;
  }
  function schedule(ids: string[]) {
    const taken = snapshot().calendar;
    const dates = nextFreeDays(ids.length, taken);
    const added = ids.slice(0, dates.length).map((id, k): CalendarSlot => ({ id: uid("slot"), idea_id: id, date: dates[k], platform: ideaById(id)?.platform || plan.platforms[0] || "", project_id: "" }));
    edit({ calendar: [...taken, ...added] });
  }
  const fillCalendar = () => schedule([...unscheduled()].sort((x, y) => Number(y.id === a().idea_id) - Number(x.id === a().idea_id)).map(i => i.id));
  const updateSlot = (id: string, patch: Partial<CalendarSlot>) => edit({ calendar: snapshot().calendar.map(s => s.id === id ? { ...s, ...patch } : s) });
  const removeSlot = (id: string) => edit({ calendar: snapshot().calendar.filter(s => s.id !== id) });
  const thisVideoSlot = () => plan.calendar.find(s => s.project_id === props.projectId) ?? plan.calendar.find(s => s.idea_id === a().idea_id && !s.project_id);
  async function startVideo(slot: CalendarSlot) {
    const item = ideaById(slot.idea_id);
    if (!item) return;
    try {
      const { project } = await api<{ project: Project }>("/api/projects", { method: "POST", json: { name: item.title.slice(0, 120), business_id: businessId(), idea_id: item.id } });
      updateSlot(slot.id, { project_id: project.id });
      await save();
      navigate(`/p/${project.id}/plan`);
    } catch (e) { setError((e as Error).message); }
  }

  // ── filming ──
  async function makeShotPlan() {
    if (thinking()) return;
    setThinking("shots"); setError("");
    try {
      await save();
      await api(`/api/projects/${props.projectId}/settings`, { method: "PUT", json: props.settings });
      const { shot_plan } = await api<{ shot_plan: ShotPlan }>(`/api/projects/${props.projectId}/shot-plan`, { method: "POST" });
      setAgency({ shot_plan });
    } catch (e) { setError((e as Error).message); }
    finally { setThinking(""); }
  }

  // ── hand-off to the questionnaire ──
  async function finish() {
    await save();
    const brief = props.settings.brief;
    const next: Settings = { ...props.settings, agency: { ...a(), completed: true } };
    const i = idea();
    if (!brief?.scope) {
      // Start the questionnaire from the plan, so nothing is asked twice,
      // without overwriting anything already answered there.
      const base = { ...emptyBrief(), ...(brief ?? {}) };
      const slot = thisVideoSlot();
      const tone = plan.voice.map(v => voiceToTone[v]).find(Boolean) ?? "";
      const posted = [slot?.platform || i?.platform].filter(Boolean) as string[];
      const where = posted.length ? posted : plan.platforms;
      const about = i ? [i.title, i.hook && `Hook: ${i.hook}`, i.description].filter(Boolean).map(x => x.trim().replace(/[.!?]$/, "")).join(". ").slice(0, 2000) : "";
      next.brief = {
        ...base,
        about: base.about || about,
        platforms: base.platforms.length ? base.platforms : where,
        format: base.format || formatFor(where),
        length: base.length !== emptyBrief().length ? base.length : lengthFor(where),
        style: base.style || tone,
      };
    }
    props.onChange(next);
    props.onDone();
  }
  function skip() {
    props.onChange({ ...props.settings, agency: { ...a(), completed: true } });
    props.onDone();
  }

  const goalsLabel = () => plan.goals.length ? plan.goals.map((g, k) => k === 0 ? `${g} (main)` : g).join(" · ") : "Not chosen yet";
  const summary = () => [
    { step: 0, label: "Business", icon: IconBadge, value: [plan.name, plan.industry, plan.stage, plan.location].filter(Boolean).join(" · ") },
    { step: 1, label: "Goals", icon: IconGauge, value: [plan.goal_notes.trim(), goalsLabel()].filter(Boolean).join(" · ") },
    { step: 2, label: "Strategy", icon: IconLayers, value: plan.platforms.length ? [plan.platforms.join(", "), `${plan.posts_per_week} posts a week`, ...plan.pillars].join(" · ") : "Not set" },
    { step: 3, label: "This video", icon: IconSpark, value: idea()?.title ?? "No idea picked yet" },
    { step: 4, label: "Posting", icon: IconStory, value: thisVideoSlot() ? [nice(thisVideoSlot()!.date), thisVideoSlot()!.platform].filter(Boolean).join(" · ") : `${sortedSlots().length} posts planned` },
    { step: 5, label: "Filming", icon: IconVideo, value: filmingOptions.find(f => f.id === a().filming)?.label ?? "Not decided yet" },
  ];

  let page!: HTMLDivElement;
  let first = true;
  createEffect(on(index, () => { if (first) first = false; else enterStep(page); }));
  return <>
    <StepBar phase="Plan" label="Planning steps" steps={steps} current={index()} reachable={reachable} onGo={go} lockedHint="Fill in the steps before this one first" />
    <div ref={page} class="wizard questionnaire agency">
      <h1 tabindex="-1">{step().title}</h1>
      <Show when={step().intro}><p class="q-intro">{step().intro}</p></Show>
      <Show when={!loading()} fallback={<div class="agency-loading"><Spinner /></div>}>
        <Switch>
          <Match when={step().id === "business"}>
            <section class="wizard-field"><h2><label for="a-name">Business name</label></h2>
              <div class="agency-name">
                <input id="a-name" maxLength={300} placeholder="E.g. Lina’s Bakery" value={plan.name} onInput={e => edit({ name: e.currentTarget.value })} />
                <select aria-label="Switch business" value={businessId()} onChange={e => {
                  const id = e.currentTarget.value;
                  void save();
                  if (id === "new") { e.currentTarget.value = businessId(); void newBusiness(); return; }
                  const b = businesses().find(x => x.id === id); if (b) open(b);
                }}>
                  <For each={businesses()}>{b => <option value={b.id} selected={b.id === businessId()}>{(b.id === businessId() ? plan.name : b.plan.name) || "New business"}</option>}</For>
                  <option value="new">+ New business</option>
                </select>
              </div>
            </section>
            <section class="wizard-field"><h2>Industry</h2>
              <MultiPills label="Industry" single options={[...industries, otherIndustry]}
                value={customIndustry() ? [otherIndustry] : plan.industry ? [plan.industry] : []}
                onChange={v => {
                  const picked = v[0] ?? "";
                  setOtherPicked(picked === otherIndustry);
                  edit({ industry: picked === otherIndustry ? "" : picked });
                  if (picked === otherIndustry) queueMicrotask(() => document.getElementById("a-industry")?.focus());
                }} />
              <Show when={customIndustry()}>
                <input id="a-industry" class="agency-industry" aria-label="Your industry" maxLength={200} placeholder="Your industry, e.g. Wedding photography" value={plan.industry} onInput={e => edit({ industry: e.currentTarget.value })} />
              </Show>
            </section>
            <section class="wizard-field"><h2><label for="a-offer">What do you offer?</label></h2>
              <textarea id="a-offer" maxLength={2000} placeholder="E.g. Sourdough bread and pastries, baked fresh every morning. We also cater office breakfasts." value={plan.offer} onInput={e => edit({ offer: e.currentTarget.value })} />
            </section>
            <section class="wizard-field"><h2><label for="a-audience">Who are your customers?</label></h2>
              <textarea id="a-audience" maxLength={2000} placeholder="E.g. Young families and office workers nearby, 25 to 45, who care about good ingredients." value={plan.audience} onInput={e => edit({ audience: e.currentTarget.value })} />
            </section>
            <section class="wizard-field"><h2>Where is your business at?</h2>
              <MultiPills label="Stage" single options={stages} value={plan.stage ? [plan.stage] : []} onChange={v => edit({ stage: v[0] ?? "" })} />
            </section>
            <div class="agency-row">
              <section class="wizard-field"><h2><label for="a-location">Location <span class="optional">Optional</span></label></h2>
                <input id="a-location" maxLength={300} placeholder="E.g. Munich, or online only" value={plan.location} onInput={e => edit({ location: e.currentTarget.value })} />
              </section>
              <section class="wizard-field"><h2><label for="a-links">Website and accounts <span class="optional">Optional</span></label></h2>
                <input id="a-links" maxLength={2000} placeholder="E.g. linasbakery.de, @linasbakery" value={plan.links} onInput={e => edit({ links: e.currentTarget.value })} />
              </section>
            </div>
          </Match>

          <Match when={step().id === "goals"}>
            <section class="wizard-field"><h2><label for="a-goal-notes">In your own words</label></h2>
              <textarea id="a-goal-notes" maxLength={2000} placeholder="E.g. Fill our catering calendar with office breakfasts, and make us the bakery people in the neighbourhood think of first." value={plan.goal_notes} onInput={e => edit({ goal_notes: e.currentTarget.value })} />
            </section>
            <h2 class="agency-goals-title">Goals</h2>
            <div class="choice-grid styles q-two agency-goals"><For each={goalOptions}>{g => {
              const at = () => plan.goals.indexOf(g.id);
              return <button class="choice" aria-pressed={at() >= 0} onClick={() => edit({ goals: at() >= 0 ? plan.goals.filter(x => x !== g.id) : [...plan.goals, g.id] })}>
                <strong>{g.id}<Show when={at() === 0}><span class="agency-badge">Main goal</span></Show></strong><span>{g.hint}</span>
              </button>;
            }}</For></div>
          </Match>

          <Match when={step().id === "strategy"}>
            <div class="agency-claude">
              <div><strong>Let Claude draft your strategy</strong>
                <p>From your business and goals: the platforms, how often to post, and what to post about. It replaces the choices below, and you can change anything after.</p></div>
              <button class="next-button" disabled={!!thinking()} onClick={() => suggest("strategy")}>{thinking() === "strategy" ? <><Spinner />Thinking…</> : <><IconWand size={18} />Draft it</>}</button>
            </div>
            <Show when={plan.strategy_summary}>
              <div class="agency-summary"><IconSpark size={18} /><p>{plan.strategy_summary}</p></div>
            </Show>
            <section class="wizard-field q-gap"><h2>Where do you post?</h2>
              <MultiPills label="Platforms" options={platformOptions} value={plan.platforms} onChange={v => edit({ platforms: v })} />
            </section>
            <section class="wizard-field"><div class="field-heading"><h2><label for="a-ppw">How often?</label></h2><output for="a-ppw">{plan.posts_per_week} {plan.posts_per_week === 1 ? "post" : "posts"} a week</output></div>
              <input id="a-ppw" class="duration-slider" type="range" min="1" max="14" step="1" value={plan.posts_per_week} onInput={e => edit({ posts_per_week: +e.currentTarget.value })} />
              <div class="range-labels"><span>1 a week</span><span>2 a day</span></div>
              <p class="field-hint q-gap-small">On which days?</p>
              <MultiPills label="Posting days" options={days} value={plan.posting_days} onChange={v => edit({ posting_days: days.filter(d => v.includes(d)) })} />
            </section>
            <section class="wizard-field"><h2>What do you post about?</h2>
              <p class="field-hint">Your content pillars: three to five recurring themes keep your account recognizable.</p>
              <MultiPills label="Content pillars" options={[...pillarOptions, ...plan.pillars.filter(p => !pillarOptions.includes(p))]} value={plan.pillars} onChange={v => edit({ pillars: v })} />
              <form class="q-add-section" onSubmit={e => { e.preventDefault(); const p = newPillar().trim(); if (p && !plan.pillars.includes(p)) edit({ pillars: [...plan.pillars, p] }); setNewPillar(""); }}>
                <input maxLength={300} placeholder="Add your own, e.g. Recipe of the week" value={newPillar()} onInput={e => setNewPillar(e.currentTarget.value)} />
                <button class="back-button" type="submit" disabled={!newPillar().trim()}><IconPlus size={16} />Add</button>
              </form>
            </section>
            <section class="wizard-field"><h2>How should you sound?</h2>
              <MultiPills label="Brand voice" options={voiceOptions} value={plan.voice} onChange={v => edit({ voice: v })} />
            </section>
            <section class="wizard-field"><h2><label for="a-inspiration">Accounts you like or compete with <span class="optional">Optional</span></label></h2>
              <textarea id="a-inspiration" maxLength={2000} placeholder="E.g. @thebakehouse for their behind the scenes videos." value={plan.inspiration} onInput={e => edit({ inspiration: e.currentTarget.value })} />
            </section>
          </Match>

          <Match when={step().id === "ideas"}>
            <div class="agency-toolbar">
              <button class="next-button" disabled={!!thinking()} onClick={() => suggest("ideas")}>{thinking() === "ideas" ? <><Spinner />Finding ideas…</> : <><IconWand size={18} />Get ideas from Claude</>}</button>
              <Show when={plan.ideas.some(i => !rated(i))}>
                <button class="back-button" disabled={!!thinking()} onClick={() => suggest("evaluate")}>{thinking() === "evaluate" ? <><Spinner />Rating…</> : <><IconGauge size={18} />Rate my ideas</>}</button>
              </Show>
            </div>
            <form class="agency-new-idea" onSubmit={e => { e.preventDefault(); addIdea(); }}>
              <input maxLength={300} aria-label="Your idea" placeholder="Add your own idea, e.g. A day in our bakery, 4am to opening" value={newIdea().title} onInput={e => setNewIdea({ ...newIdea(), title: e.currentTarget.value })} />
              <button class="back-button" type="submit" disabled={!newIdea().title.trim()}><IconPlus size={16} />Add idea</button>
            </form>
            <Show when={plan.ideas.length} fallback={<div class="spec-empty wizard-field"><p>No ideas yet. Ask Claude for a few, or add the ones you already have. Claude rates each one on how well it fits your goals, how strong the hook is, and how easy it is to film.</p></div>}>
              <div class="idea-list"><For each={sortedIdeas()}>{i =>
                <article class="idea-card" classList={{ chosen: i.id === a().idea_id, listed: i.shortlisted }}>
                  <div class="idea-head">
                    <div class="idea-title">
                      <span class="idea-score" classList={{ strong: score(i) >= 4, weak: rated(i) && score(i) < 3 }}>{scoreLabel(i)}</span>
                      <strong>{i.title}</strong>
                      <Show when={i.hook}><p class="idea-hook">“{i.hook}”</p></Show>
                    </div>
                    <button class="text-button danger idea-remove" aria-label={`Remove ${i.title}`} onClick={() => removeIdea(i.id)}><IconTrash size={16} /></button>
                  </div>
                  <Show when={i.description}><p class="idea-desc">{i.description}</p></Show>
                  <div class="idea-tags"><For each={[i.pillar, i.platform, i.format, i.source === "claude" ? "From Claude" : "Your idea"].filter(Boolean)}>{t => <span>{t}</span>}</For></div>
                  <Show when={rated(i)}>
                    <div class="idea-meters"><Meter label="Fits your goals" value={i.fit} /><Meter label="Hook" value={i.hook_score} /><Meter label="Easy to make" value={i.effort} /></div>
                    <Show when={i.verdict}><p class="idea-verdict"><IconInfo size={15} />{i.verdict}</p></Show>
                  </Show>
                  <div class="idea-actions">
                    <button class="idea-pick" aria-pressed={i.id === a().idea_id} onClick={() => useForVideo(i.id)}>{i.id === a().idea_id ? <><IconCheck size={16} />This video</> : "Make this video"}</button>
                    <button class="idea-pick quiet" aria-pressed={i.shortlisted} onClick={() => updateIdea(i.id, { shortlisted: !i.shortlisted })}>{i.shortlisted ? <><IconCheck size={16} />On the shortlist</> : "Shortlist"}</button>
                    <select aria-label="Platform" value={i.platform} onChange={e => updateIdea(i.id, { platform: e.currentTarget.value })}>
                      <option value="">Any platform</option><For each={platformOptions}>{p => <option value={p}>{p}</option>}</For>
                    </select>
                    <select aria-label="Format" value={formatOptions.includes(i.format) ? i.format : ""} onChange={e => updateIdea(i.id, { format: e.currentTarget.value })}>
                      <option value="">{i.format && !formatOptions.includes(i.format) ? i.format : "Any format"}</option><For each={formatOptions}>{f => <option value={f}>{f}</option>}</For>
                    </select>
                  </div>
                </article>
              }</For></div>
            </Show>
          </Match>

          <Match when={step().id === "schedule"}>
            <div class="agency-toolbar">
              <button class="next-button" disabled={!unscheduled().length} onClick={fillCalendar}><IconSpark size={18} />Fill my calendar</button>
              <p class="field-hint">{unscheduled().length
                ? `${unscheduled().length} shortlisted ${unscheduled().length === 1 ? "idea isn’t" : "ideas aren’t"} planned yet. They go on your posting days, ${plan.posts_per_week} a week.`
                : plan.ideas.some(i => i.shortlisted) ? "Every shortlisted idea is planned." : "Shortlist ideas in the step before to plan them here."}</p>
            </div>
            <div class="calendar">
              <div class="calendar-nav">
                <button class="back-button" aria-label="Earlier weeks" onClick={() => setWeekOffset(weekOffset() - 4)}><IconArrowLeft size={16} /></button>
                <strong>{weeks()[0][0].toLocaleDateString(undefined, { day: "numeric", month: "short" })} to {weeks()[4][6].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</strong>
                <button class="back-button" aria-label="Later weeks" onClick={() => setWeekOffset(weekOffset() + 4)}><IconArrowRight size={16} /></button>
              </div>
              <div class="calendar-grid">
                <For each={days}>{d => <span class="calendar-day-name" classList={{ posting: postingDays().includes(d) }}>{d}</span>}</For>
                <For each={weeks().flat()}>{date => {
                  const key = iso(date);
                  return <div class="calendar-cell" classList={{ past: key < today(), today: key === today(), posting: postingDays().includes(dayName(date)) }}
                    onDragOver={e => { if (key >= today()) e.preventDefault(); }}
                    onDrop={e => { e.preventDefault(); if (dragged()) updateSlot(dragged(), { date: key }); setDragged(""); }}>
                    <span class="calendar-date">{date.getDate() === 1 || (date.getDay() === 1 && weeks()[0][0].getTime() === date.getTime()) ? date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : date.getDate()}</span>
                    <For each={slotsOn(key)}>{slot =>
                      <span class="calendar-post" classList={{ mine: slot.project_id === props.projectId || (!slot.project_id && slot.idea_id === a().idea_id), started: !!slot.project_id && slot.project_id !== props.projectId }}
                        draggable="true" title={ideaById(slot.idea_id)?.title}
                        onDragStart={e => { setDragged(slot.id); e.dataTransfer?.setData("text/plain", slot.id); }} onDragEnd={() => setDragged("")}>
                        {ideaById(slot.idea_id)?.title}<Show when={slot.platform}><small>{slot.platform}</small></Show>
                      </span>
                    }</For>
                  </div>;
                }}</For>
              </div>
            </div>
            <Show when={sortedSlots().length}>
              <section class="wizard-field q-gap"><h2>Planned posts</h2>
                <div class="slot-list"><For each={sortedSlots()}>{slot => {
                  const mine = () => slot.project_id === props.projectId || (!slot.project_id && slot.idea_id === a().idea_id);
                  return <div class="slot-row" classList={{ mine: mine() }}>
                    <input type="date" aria-label="Posting date" value={slot.date} min={today()} onChange={e => e.currentTarget.value && updateSlot(slot.id, { date: e.currentTarget.value })} />
                    <strong>{ideaById(slot.idea_id)?.title}</strong>
                    <select aria-label="Platform" value={slot.platform} onChange={e => updateSlot(slot.id, { platform: e.currentTarget.value })}>
                      <option value="">Any platform</option><For each={platformOptions}>{p => <option value={p}>{p}</option>}</For>
                    </select>
                    <Show when={!mine()} fallback={<span class="slot-tag">This video</span>}>
                      <Show when={slot.project_id} fallback={<button class="text-button" onClick={() => void startVideo(slot)}><IconVideo size={16} />Start this video</button>}>
                        <A class="text-button" href={`/p/${slot.project_id}`}>Open video<IconArrowRight size={16} /></A>
                      </Show>
                    </Show>
                    <button class="text-button danger" aria-label="Remove from the schedule" onClick={() => removeSlot(slot.id)}><IconTrash size={16} /></button>
                  </div>;
                }}</For></div>
              </section>
            </Show>
            <Show when={unscheduled().length}>
              <section class="wizard-field"><h2>Not planned yet</h2>
                <div class="pills"><For each={unscheduled()}>{i => <button onClick={() => schedule([i.id])}><IconPlus size={14} /> {i.title}</button>}</For></div>
              </section>
            </Show>
          </Match>

          <Match when={step().id === "filming"}>
            <Show when={idea()} fallback={<p class="field-hint agency-for">No idea picked yet. <button class="inline-link" onClick={() => go(3)}>Pick one</button> to get a shot list made for it.</p>}>
              <p class="field-hint agency-for">For: <strong>{idea()!.title}</strong></p>
            </Show>
            <div class="choice-grid styles q-three filming-grid"><For each={filmingOptions}>{f =>
              <button class="choice" aria-pressed={a().filming === f.id} onClick={() => setAgency({ filming: a().filming === f.id ? "" : f.id })}>
                <span class="filming-icon"><Dynamic component={f.icon} size={22} /></span><strong>{f.label}</strong><span>{f.hint}</span>
              </button>
            }</For></div>
            <Switch>
              <Match when={a().filming === "with_us"}>
                <div class="agency-row q-gap">
                  <section class="wizard-field"><h2><label for="a-dates">When suits you?</label></h2>
                    <input id="a-dates" maxLength={300} placeholder="E.g. weekday mornings next week" value={a().filming_dates} onInput={e => setAgency({ filming_dates: e.currentTarget.value })} />
                  </section>
                  <section class="wizard-field"><h2><label for="a-where">Where?</label></h2>
                    <input id="a-where" maxLength={300} placeholder="E.g. at our shop, or in your studio" value={a().filming_location} onInput={e => setAgency({ filming_location: e.currentTarget.value })} />
                  </section>
                </div>
                <section class="wizard-field"><h2><label for="a-film-notes">Anything we should know? <span class="optional">Optional</span></label></h2>
                  <textarea id="a-film-notes" maxLength={2000} placeholder="E.g. the shop is quiet before 10am, our head baker is happy to be on camera." value={a().filming_notes} onInput={e => setAgency({ filming_notes: e.currentTarget.value })} />
                  <p class="field-hint">We’ll confirm a date with you. A session takes about one to two hours, and we film several posts at once when we can.</p>
                </section>
              </Match>
              <Match when={a().filming === "self"}>
                <section class="wizard-field q-gap"><h2><label for="a-film-notes">Anything Claude should know? <span class="optional">Optional</span></label></h2>
                  <textarea id="a-film-notes" maxLength={2000} placeholder="E.g. we only have a phone, and the shop is busy after 10am." value={a().filming_notes} onInput={e => setAgency({ filming_notes: e.currentTarget.value })} />
                </section>
                <div class="agency-claude">
                  <div><strong>Your shot list</strong><p>Claude plans every shot for this idea, what to say, and how to make it look good with a phone.</p></div>
                  <button class="next-button" disabled={!!thinking() || !idea()} onClick={makeShotPlan}>{thinking() === "shots" ? <><Spinner />Planning…</> : <><IconWand size={18} />{a().shot_plan ? "Make a new one" : "Make my shot list"}</>}</button>
                </div>
                <Show when={a().shot_plan} fallback={
                  <section class="wizard-field q-gap"><h2>Filming basics</h2><ul class="shot-tips"><For each={basicTips}>{t => <li>{t}</li>}</For></ul></section>
                }>{plan2 =>
                  <div class="shot-plan q-gap">
                    <ol class="shot-list"><For each={plan2().shots}>{s =>
                      <li><div><strong>{s.shot}</strong><Show when={s.detail}><p>{s.detail}</p></Show></div><Show when={s.seconds}><span>{s.seconds} sec</span></Show></li>
                    }</For></ol>
                    <Show when={plan2().talking_points.length}><section class="wizard-field"><h2>What to say</h2><ul class="shot-tips"><For each={plan2().talking_points}>{t => <li>{t}</li>}</For></ul></section></Show>
                    <Show when={plan2().tips.length}><section class="wizard-field"><h2>Tips</h2><ul class="shot-tips"><For each={plan2().tips}>{t => <li>{t}</li>}</For></ul></section></Show>
                  </div>
                }</Show>
              </Match>
              <Match when={a().filming === "have_footage"}>
                <p class="field-hint q-gap">Good. You’ll add your footage in the editor, right after the plan.</p>
              </Match>
            </Switch>
          </Match>

          <Match when={step().id === "plan"}>
            <div class="review-hero">
              <div class="review-hero-text">
                <h2>{plan.name || "Your business"}</h2>
                <p>{idea() ? `Next up: ${idea()!.title}` : "Pick an idea for this video, or go straight to editing."}</p>
                <div class="review-stats">
                  <span>{plan.ideas.length} {plan.ideas.length === 1 ? "idea" : "ideas"}</span>
                  <span>{sortedSlots().length} planned {sortedSlots().length === 1 ? "post" : "posts"}</span>
                  <Show when={plan.platforms.length}><span>{plan.posts_per_week} a week</span></Show>
                </div>
              </div>
            </div>
            <ReviewCards items={summary().map(row => ({ label: row.label, value: row.value || "Not filled in", onEdit: () => go(row.step) }))} />
            <p class="field-hint review-next">Next, tell us how this video should be edited.{idea() ? " We’ve filled in what we already know." : ""}</p>
          </Match>
        </Switch>
      </Show>
      <Show when={error()}><p class="form-error" role="alert">{error()}</p></Show>
      <footer class="wizard-footer">
        <Show when={index() > 0} fallback={<span class="agency-start"><A class="projects-link" href="/projects"><IconArrowLeft size={16} />All projects</A><button class="quiet-button" onClick={skip}>Skip to editing</button></span>}>
          <button class="back-button" onClick={() => go(index() - 1)}><IconArrowLeft size={18} />Back</button>
        </Show>
        <Show when={step().id !== "plan"} fallback={<button class="next-button" onClick={() => void finish()}><IconSpark size={18} />Start editing</button>}>
          <button class="next-button" disabled={!reachable(index() + 1)} onClick={() => go(index() + 1)}>{step().id === "ideas" && !idea() ? "Skip for now" : "Next"}<IconArrowRight size={18} /></button>
        </Show>
      </footer>
    </div>
  </>;
}
