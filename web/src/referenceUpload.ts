import { createSignal } from "solid-js";
import { uploadReference } from "./api";

// Reference uploads live outside the questionnaire so they keep running (and
// keep reporting progress) while the customer moves between steps or pages.
export type ReferenceUpload = { filename: string; progress: number; error: string };

const [uploads, setUploads] = createSignal<Record<string, ReferenceUpload>>({});

export const referenceUpload = (projectId: string): ReferenceUpload | undefined => uploads()[projectId];

const put = (projectId: string, value: ReferenceUpload | undefined) =>
  setUploads((all) => {
    const next = { ...all };
    if (value) next[projectId] = value;
    else delete next[projectId];
    return next;
  });

export async function startReferenceUpload(projectId: string, file: File, onDone: () => void) {
  put(projectId, { filename: file.name, progress: 0, error: "" });
  try {
    await uploadReference(projectId, file, (progress) => put(projectId, { filename: file.name, progress, error: "" }));
    put(projectId, undefined);
    onDone();
  } catch (e) {
    put(projectId, { filename: file.name, progress: 0, error: (e as Error).message });
  }
}

export const clearReferenceUpload = (projectId: string) => put(projectId, undefined);
