import "../portal.css";
import { A, useParams } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import type { ContentIdea } from "../api";
import { Brand } from "../components/Brand";
import { agencyApi, clientApi, niceDate, type Portal, type PortalApi } from "../portal";
import { Spinner } from "../ui/kit";
import { IconArrowLeft, IconDownload } from "../ui/icons";

// The content plan as one document: the strategy, the posting calendar, an overview of every
// video, then one page per video with its shot list. Made to read on screen, and to print or
// save as a PDF (the browser's print dialog) with each video on its own page.

export function AgencyPlanDocument() {
  const params = useParams();
  return <PlanDocument api={agencyApi(params.id!)} back={`/clients/${params.id}`} />;
}

export function ClientPlanDocument() {
  const params = useParams();
  return <PlanDocument api={clientApi(params.token!)} back={`/c/${params.token}`} />;
}

const seconds = (idea: ContentIdea) => idea.shots?.shots.reduce((n, s) => n + (s.seconds || 0), 0) ?? 0;

function PlanDocument(props: { api: PortalApi; back: string }) {
  const [portal] = createResource(() => props.api.load(true));
  const p = () => portal() as Portal;
  const plan = () => p().plan;
  const slot = (id: string) => plan().calendar.find(s => s.idea_id === id);
  const ideas = () => {
    const list = plan().ideas.some(i => i.shortlisted) ? plan().ideas.filter(i => i.shortlisted) : plan().ideas;
    return [...list].sort((a, b) => (slot(a.id)?.date || "9999").localeCompare(slot(b.id)?.date || "9999"));
  };
  const facts = () => [
    ["Where", plan().platforms.join(", ")],
    ["How often", `${plan().posts_per_week} ${plan().posts_per_week === 1 ? "post" : "posts"} a week`],
    ["Posting days", plan().posting_days.join(", ")],
    ["What about", plan().pillars.join(" · ")],
    ["How it sounds", plan().voice.join(" · ")],
  ].filter(([, v]) => v);
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return <div class="plan-doc-page">
    <div class="plan-doc-bar">
      <A href={props.back} class="text-button"><IconArrowLeft size={16} />Back</A>
      <button class="next-button" onClick={() => window.print()} disabled={!portal()}><IconDownload size={18} />Download PDF</button>
    </div>
    <Show when={portal()} fallback={<div class="portal-loading">{portal.error ? <p class="form-error">{(portal.error as Error).message}</p> : <Spinner />}</div>}>
      <article class="plan-doc">
        <header class="plan-doc-cover">
          <Brand />
          <p class="plan-doc-eyebrow">Content plan</p>
          <h1>{plan().name || "Your business"}</h1>
          <p class="plan-doc-meta">{[today, `${ideas().length} ${ideas().length === 1 ? "video" : "videos"}`, plan().platforms.join(", ")].filter(Boolean).join(" · ")}</p>
        </header>

        <section class="plan-doc-section">
          <h2>The strategy</h2>
          <Show when={plan().strategy_summary}><p class="plan-doc-lead">{plan().strategy_summary}</p></Show>
          <dl class="plan-doc-facts"><For each={facts()}>{([k, v]) => <div><dt>{k}</dt><dd>{v}</dd></div>}</For></dl>
        </section>

        <Show when={ideas().length}>
          <section class="plan-doc-section">
            <h2>The videos</h2>
            <table class="plan-doc-table">
              <thead><tr><th>#</th><th>Video</th><th>Format</th><th>Where</th><th>Post on</th></tr></thead>
              <tbody><For each={ideas()}>{(idea, i) => <tr>
                <td>{i() + 1}</td>
                <td><a href={`#idea-${idea.id}`}>{idea.title}</a><Show when={idea.hook}><span>“{idea.hook}”</span></Show></td>
                <td>{idea.format}</td>
                <td>{slot(idea.id)?.platform || idea.platform}</td>
                <td>{slot(idea.id) ? niceDate(slot(idea.id)!.date) : ""}</td>
              </tr>}</For></tbody>
            </table>
          </section>

          <For each={ideas()}>{(idea, i) => <section class="plan-doc-video" id={`idea-${idea.id}`}>
            <p class="plan-doc-eyebrow">Video {i() + 1}{slot(idea.id) ? ` · ${niceDate(slot(idea.id)!.date, true)}` : ""}</p>
            <h2>{idea.title}</h2>
            <div class="plan-doc-tags"><For each={[idea.format, slot(idea.id)?.platform || idea.platform, idea.pillar, seconds(idea) ? `about ${seconds(idea)} s of footage` : ""].filter(Boolean)}>{t => <span>{t}</span>}</For></div>
            <Show when={idea.hook}><p class="plan-doc-hook"><strong>Hook</strong>“{idea.hook}”</p></Show>
            <Show when={idea.description}><p class="plan-doc-lead">{idea.description}</p></Show>
            <Show when={idea.shots?.shots.length}>
              <h3>Shot list</h3>
              <ol class="plan-doc-shots"><For each={idea.shots!.shots}>{(s, k) => <li>
                <span class="plan-doc-n">{k() + 1}</span>
                <div><strong>{s.shot}</strong><Show when={s.detail}><p>{s.detail}</p></Show></div>
                <Show when={s.seconds}><span class="plan-doc-sec">{s.seconds} s</span></Show>
              </li>}</For></ol>
              <Show when={idea.shots!.talking_points.length}>
                <h3>Talking points</h3>
                <ul class="plan-doc-list"><For each={idea.shots!.talking_points}>{t => <li>{t}</li>}</For></ul>
              </Show>
              <Show when={idea.shots!.tips.length}>
                <h3>Tips for the shoot</h3>
                <ul class="plan-doc-list"><For each={idea.shots!.tips}>{t => <li>{t}</li>}</For></ul>
              </Show>
            </Show>
          </section>}</For>
        </Show>
      </article>
    </Show>
  </div>;
}
