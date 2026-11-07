import { createSignal } from "solid-js";
import { api, getToken, setToken, setUnauthorizedHandler, type User } from "./api";

const [user, setUser] = createSignal<User | null>(null);
const [authReady, setAuthReady] = createSignal(false);
export { user, authReady };

export async function restoreSession() {
  if (getToken()) {
    try {
      setUser((await api<{ user: User }>("/api/auth/me")).user);
    } catch {
      setToken(null);
    }
  }
  setAuthReady(true);
}

export function signedIn(token: string, u: User) {
  setToken(token);
  setUser(u);
}

export async function signOut() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    /* session may already be gone */
  }
  setToken(null);
  setUser(null);
}

setUnauthorizedHandler(() => {
  setToken(null);
  setUser(null);
});

// ── theme ──
export type ThemePref = "system" | "light" | "dark";
const media = window.matchMedia("(prefers-color-scheme: light)");
const [themePref, setThemePrefSignal] = createSignal<ThemePref>(
  (localStorage.getItem("reel.theme") as ThemePref) || "dark",
);
const [systemLight, setSystemLight] = createSignal(media.matches);
media.addEventListener("change", (e) => setSystemLight(e.matches));

export const isLight = () => (themePref() === "system" ? systemLight() : themePref() === "light");
export { themePref };
export const setThemePref = (t: ThemePref) => {
  localStorage.setItem("reel.theme", t);
  setThemePrefSignal(t);
};
export const toggleTheme = () => setThemePref(isLight() ? "dark" : "light");
