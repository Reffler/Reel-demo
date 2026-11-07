import { For, Show, createResource, createSignal } from "solid-js";
import { api } from "../api";
import { IconPlus, IconSpark } from "../ui/icons";

type Memory = { lessons: string[]; feedback: number };

// What Reel remembers for one client: rules learned from the feedback on their videos, applied to every
// new video of theirs. Rules can be removed or added here.
export function ClientMemory(props: { businessId: string }) {
  const [memory, { mutate }] = createResource(() => props.businessId, id => api<Memory>(`/api/businesses/${id}/memory`));
  const [draft, setDraft] = createSignal("");
  const [error, setError] = createSignal("");
  async function save(lessons: string[]) {
    setError("");
    try {
      mutate(await api<Memory>(`/api/businesses/${props.businessId}/memory`, { method: "PUT", json: { lessons } }));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function add(e: Event) {
    e.preventDefault();
    const text = draft().trim();
    if (!text) return;
    setDraft("");
    void save([...(memory()?.lessons ?? []), text]);
  }
  return (
    <section class="client-memory">
      <div class="client-memory-head">
        <span class="client-kit-icon"><IconSpark size={18} /></span>
        <div><strong>Reel remembers</strong>
          <span>Applied to every new video of this client. Learned from your change requests{memory()?.feedback ? ` (${memory()!.feedback} so far)` : ""}, and updated with each new one.</span></div>
      </div>
      <Show when={memory()?.lessons.length} fallback={<p class="client-memory-empty">Nothing yet. Request changes on one of their videos, or add a rule below.</p>}>
        <ul><For each={memory()!.lessons}>{(l, i) => <li><span>{l}</span>
          <button class="text-button" aria-label={`Forget: ${l}`} onClick={() => void save(memory()!.lessons.filter((_, j) => j !== i()))}>Forget</button></li>}</For></ul>
      </Show>
      <form onSubmit={add}>
        <input value={draft()} maxLength={200} placeholder="e.g. Music quiet under speech" onInput={e => setDraft(e.currentTarget.value)} aria-label="New rule" />
        <button class="text-button" type="submit" disabled={!draft().trim()}><IconPlus size={16} />Add</button>
      </form>
      <Show when={error()}><p class="form-error">{error()}</p></Show>
    </section>
  );
}
