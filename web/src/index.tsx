import "./global.css";
import { render } from "solid-js/web";
import { API_BASE, DEMO } from "./api";
import { App } from "./App";
import { autosizeTextareas } from "./autosize";

if (import.meta.env.DEV) {
  // StyleX dev runtime: serves and hot-reloads the generated CSS.
  import("virtual:stylex:runtime");
}

autosizeTextareas();
render(() => <App />, document.getElementById("root")!);

if (!DEMO) {
// Lets the server know a Reel tab is open: when started from the launcher, it stops once all are closed.
const presence = (closing = false) => navigator.sendBeacon(`${API_BASE}/api/presence${closing ? "?closing=true" : ""}`);
presence();
setInterval(presence, 20_000);
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && presence());
addEventListener("pagehide", () => presence(true));
}
