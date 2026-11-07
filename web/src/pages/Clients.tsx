import "../portal.css";
import { A, useNavigate } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { api, type Business } from "../api";
import { fmtAgo } from "../format";
import { stageIndex, stages, type Portal, type PortalSummary } from "../portal";
import { Spinner } from "../ui/kit";
import { IconArrowRight, IconCheck, IconPlus } from "../ui/icons";

// The agency's overview: every client, which stage they're in, and whose turn it is.
// Clients waiting on you come first.

type MailForm = { host: string; port: number; username: string; password: string; sender: string; agency_email: string; public_url: string; has_password?: boolean };

export function Clients() {
  const navigate = useNavigate();
  const [data, { refetch }] = createResource(() => api<{ portals: PortalSummary[]; mail_ready: boolean }>("/api/portals"));
  const [businesses] = createResource(async () => (await api<{ businesses: Business[] }>("/api/businesses")).businesses);
  const [creating, setCreating] = createSignal(false);
  const [form, setForm] = createSignal({ business_id: "", name: "", client_name: "", client_email: "" });
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [mailOpen, setMailOpen] = createSignal(false);

  const sorted = () => [...(data()?.portals ?? [])].sort((a, b) => Number(b.turn.who === "agency") - Number(a.turn.who === "agency") || b.updated_at - a.updated_at);
  const free = () => (businesses() ?? []).filter(b => !(data()?.portals ?? []).some(p => p.business_id === b.id) && b.plan.name);

  async function create(e: Event) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { portal } = await api<{ portal: Portal }>("/api/portals", { method: "POST", json: form() });
      navigate(`/clients/${portal.id}`);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return <div class="portal-list">
    <div class="portal-list-head">
      <h1>Clients</h1>
      <div class="portal-actions">
        <button class="back-button" onClick={() => setMailOpen(!mailOpen())}>{data()?.mail_ready ? <><IconCheck size={16} />Emails on</> : "Set up emails"}</button>
        <button class="next-button" onClick={() => setCreating(true)}><IconPlus size={18} />New client</button>
      </div>
    </div>

    <Show when={mailOpen()}><MailSettings onSaved={() => void refetch()} /></Show>

    <Show when={creating()}>
      <form class="portal-card portal-form wizard" onSubmit={create}>
        <h3 class="portal-subtitle">New client</h3>
        <Show when={free().length}>
          <label class="portal-label" for="c-biz">Business</label>
          <select id="c-biz" value={form().business_id} onChange={e => setForm({ ...form(), business_id: e.currentTarget.value })}>
            <option value="">A new business</option>
            <For each={free()}>{b => <option value={b.id}>{b.plan.name} (already planned in Reel)</option>}</For>
          </select>
        </Show>
        <Show when={!form().business_id}>
          <label class="portal-label" for="c-name">Business name</label>
          <input id="c-name" maxLength={300} placeholder="E.g. Lina’s Bakery" value={form().name} onInput={e => setForm({ ...form(), name: e.currentTarget.value })} />
        </Show>
        <div class="agency-row">
          <div><label class="portal-label" for="c-person">Contact name</label>
            <input id="c-person" maxLength={300} placeholder="E.g. Lina" value={form().client_name} onInput={e => setForm({ ...form(), client_name: e.currentTarget.value })} /></div>
          <div><label class="portal-label" for="c-email">Email <span class="optional">For updates</span></label>
            <input id="c-email" type="email" maxLength={300} placeholder="lina@linasbakery.de" value={form().client_email} onInput={e => setForm({ ...form(), client_email: e.currentTarget.value })} /></div>
        </div>
        <Show when={error()}><p class="form-error">{error()}</p></Show>
        <div class="portal-actions">
          <button class="next-button" type="submit" disabled={busy() || (!form().business_id && !form().name.trim())}>{busy() ? <Spinner /> : null}Create their page<IconArrowRight size={18} /></button>
          <button class="text-button" type="button" onClick={() => setCreating(false)}>Cancel</button>
        </div>
      </form>
    </Show>

    <Show when={!data.loading} fallback={<div class="portal-loading"><Spinner /></div>}>
      <Show when={sorted().length} fallback={<Show when={!creating()}><div class="portal-wait"><div><strong>No clients yet</strong><p>Create a client, send them their link, and they fill in the brief. You take it from there.</p></div></div></Show>}>
        <ul class="portal-rows"><For each={sorted()}>{p => <li>
          <A href={`/clients/${p.id}`} classList={{ "portal-row": true, mine: p.turn.who === "agency" }}>
            <div class="portal-row-name"><strong>{p.name || "New business"}</strong><span>{[p.client_name, p.client_email].filter(Boolean).join(" · ") || "No contact yet"}</span></div>
            <div class="portal-row-stages" aria-label={`Stage ${stageIndex(p.stage) + 1} of 4`}>
              <For each={stages}>{(s, i) => <span classList={{ done: i() < stageIndex(p.stage), current: i() === stageIndex(p.stage) }} title={s.label} />}</For>
              <em>{stages[stageIndex(p.stage)].label}</em>
            </div>
            <div class="portal-row-turn">
              <span classList={{ "portal-chip": true, accent: p.turn.who === "agency" }}>{p.turn.who === "agency" ? "Your turn" : "Waiting on client"}</span>
              <span>{p.turn.what}</span>
            </div>
            <div class="portal-row-meta">
              <Show when={p.unread}><span class="portal-unread">{p.unread} new</span></Show>
              <span>{fmtAgo(p.updated_at)}</span>
            </div>
          </A>
        </li>}</For></ul>
      </Show>
    </Show>
  </div>;
}

function MailSettings(props: { onSaved: () => void }) {
  const [m, setM] = createSignal<MailForm | null>(null);
  const [state, setState] = createSignal<{ ready: boolean; default_url: string } | null>(null);
  const [msg, setMsg] = createSignal("");
  const [busy, setBusy] = createSignal("");
  void api<{ settings: MailForm; ready: boolean; default_url: string }>("/api/portal-settings").then(r => { setM({ ...r.settings, password: "" }); setState(r); });
  const set = (patch: Partial<MailForm>) => setM({ ...m()!, ...patch });
  async function save(test = false) {
    setBusy(test ? "test" : "save"); setMsg("");
    try {
      const r = await api<{ settings: MailForm; ready: boolean; default_url: string }>("/api/portal-settings", { method: "PUT", json: m() });
      setM({ ...r.settings, password: "" }); setState(r); props.onSaved();
      if (test) { await api("/api/portal-settings/test", { method: "POST" }); setMsg(`Test email sent to ${r.settings.agency_email}.`); }
      else setMsg("Saved.");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(""); }
  }
  return <Show when={m()} fallback={<Spinner />}>
    <div class="portal-card portal-form wizard">
      <h3 class="portal-subtitle">Email updates</h3>
      <p class="portal-muted">Reel emails the client when it's their turn, and you when a client did something. It sends from your own email account. For GMX: server mail.gmx.net, port 587, your GMX address and password (turn on “POP3/IMAP access” in GMX settings first).</p>
      <div class="agency-row">
        <div><label class="portal-label" for="m-host">Mail server</label><input id="m-host" placeholder="mail.gmx.net" value={m()!.host} onInput={e => set({ host: e.currentTarget.value.trim() })} /></div>
        <div><label class="portal-label" for="m-port">Port</label><input id="m-port" type="number" value={m()!.port} onInput={e => set({ port: +e.currentTarget.value || 587 })} /></div>
      </div>
      <div class="agency-row">
        <div><label class="portal-label" for="m-user">Login</label><input id="m-user" autocomplete="off" placeholder="you@gmx.de" value={m()!.username} onInput={e => set({ username: e.currentTarget.value.trim() })} /></div>
        <div><label class="portal-label" for="m-pass">Password</label><input id="m-pass" type="password" autocomplete="new-password" placeholder={m()!.has_password ? "Saved. Type to replace it." : ""} value={m()!.password} onInput={e => set({ password: e.currentTarget.value })} /></div>
      </div>
      <div class="agency-row">
        <div><label class="portal-label" for="m-me">Send my updates to</label><input id="m-me" type="email" placeholder="you@gmx.de" value={m()!.agency_email} onInput={e => set({ agency_email: e.currentTarget.value.trim() })} /></div>
        <div><label class="portal-label" for="m-from">From name and address <span class="optional">Optional</span></label><input id="m-from" placeholder="Reel Studio <you@gmx.de>" value={m()!.sender} onInput={e => set({ sender: e.currentTarget.value })} /></div>
      </div>
      <label class="portal-label" for="m-url">Address clients open <span class="optional">Optional</span></label>
      <input id="m-url" placeholder={state()?.default_url} value={m()!.public_url} onInput={e => set({ public_url: e.currentTarget.value.trim() })} />
      <Show when={msg()}><p class="portal-muted" role="status">{msg()}</p></Show>
      <div class="portal-actions">
        <button class="next-button" disabled={!!busy()} onClick={() => void save()}>{busy() === "save" ? <Spinner /> : null}Save</button>
        <button class="back-button" disabled={!!busy()} onClick={() => void save(true)}>{busy() === "test" ? <Spinner /> : null}Save and send a test</button>
      </div>
    </div>
  </Show>;
}
