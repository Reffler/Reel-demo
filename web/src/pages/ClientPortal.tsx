import "../portal.css";
import { A, useNavigate, useParams } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { api } from "../api";
import { Brand } from "../components/Brand";
import { PortalView } from "../components/PortalView";
import { agencyApi, clientApi, type Portal } from "../portal";
import { isLight, toggleTheme } from "../store";
import { IconArrowLeft, IconCheck, IconMoon, IconSun } from "../ui/icons";

/** The agency's view of one client: the shared page, plus the link to send and the contact details. */
export function AgencyClient() {
  const params = useParams();
  return <>
    <A href="/clients" class="text-button portal-back"><IconArrowLeft size={16} />All clients</A>
    <PortalView api={agencyApi(params.id!)} header={p => <ClientTools portal={p} />} />
  </>;
}

function ClientTools(props: { portal: Portal }) {
  const navigate = useNavigate();
  const [copied, setCopied] = createSignal(false);
  const [open, setOpen] = createSignal(false);
  const [contact, setContact] = createSignal({ client_name: props.portal.state.client_name, client_email: props.portal.state.client_email });
  const [msg, setMsg] = createSignal("");
  const copy = async () => { await navigator.clipboard.writeText(props.portal.link!); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return <div class="portal-tools">
    <button class="next-button" onClick={copy}>{copied() ? <><IconCheck size={18} />Link copied</> : "Copy client link"}</button>
    <A class="back-button" href={`/projects/client/${props.portal.business_id}`}>Videos</A>
    <a class="back-button" href={props.portal.link!.replace(/^https?:\/\/[^/]+/, "")} target="_blank" rel="noopener">See it as the client</a>
    <details class="portal-more" open={open()} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary class="text-button">Contact and link</summary>
      <div class="portal-card portal-form wizard">
        <label class="portal-label" for="t-name">Contact name</label>
        <input id="t-name" value={contact().client_name} onInput={e => setContact({ ...contact(), client_name: e.currentTarget.value })} />
        <label class="portal-label" for="t-email">Email</label>
        <input id="t-email" type="email" value={contact().client_email} onInput={e => setContact({ ...contact(), client_email: e.currentTarget.value })} />
        <Show when={!props.portal.mail_ready}><p class="field-hint">Emails aren't set up yet, so Reel can't email them. <A href="/clients" class="inline-link">Set up emails</A></p></Show>
        <div class="portal-actions">
          <button class="next-button" onClick={async () => { await api(`/api/portals/${props.portal.id}`, { method: "PATCH", json: contact() }); setMsg("Saved."); }}>Save</button>
          <button class="text-button" onClick={async () => { if (!confirm("Make a new link? The old one stops working.")) return; await api(`/api/portals/${props.portal.id}/new-link`, { method: "POST" }); location.reload(); }}>New link</button>
          <button class="text-button danger" onClick={async () => { if (!confirm("Close this client's page? Their business and plan stay in Reel.")) return; await api(`/api/portals/${props.portal.id}`, { method: "DELETE" }); navigate("/clients"); }}>Close their page</button>
        </div>
        <Show when={msg()}><p class="portal-muted" role="status">{msg()}</p></Show>
      </div>
    </details>
  </div>;
}

/** What the client opens with their private link. No Reel account, no editor: just their page. */
export function ClientPortal() {
  const params = useParams();
  return <div class="portal-client">
    <header class="portal-client-bar">
      <Brand />
      <button class="theme-toggle" onClick={toggleTheme} aria-label={isLight() ? "Switch to dark mode" : "Switch to light mode"}>
        <Show when={isLight()} fallback={<IconSun size={18} />}><IconMoon size={18} /></Show>
      </button>
    </header>
    <main class="portal-client-main"><PortalView api={clientApi(params.token!)} /></main>
  </div>;
}
