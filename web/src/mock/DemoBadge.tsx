import { resetMock } from "./backend";

// A small corner note on the static demo: nothing is sent anywhere, and the sample data can be reset.
export function DemoBadge() {
  const reset = () => {
    if (!confirm("Reset the demo? Everything you made here is cleared and the sample workspace comes back.")) return;
    resetMock();
    location.hash = "#/";
    location.reload();
  };
  return (
    <div style={{ position: "fixed", right: "12px", bottom: "12px", "z-index": 1000, display: "flex", gap: "8px", "align-items": "center", padding: "7px 12px",
      "border-radius": "999px", background: "rgba(20,20,30,.88)", color: "#fff", "font-size": "12px", "box-shadow": "0 4px 18px rgba(0,0,0,.3)" }}>
      <span>Demo · no server, your changes stay in this browser</span>
      <button onClick={reset} style={{ background: "rgba(255,255,255,.16)", color: "inherit", border: "0", "border-radius": "999px", padding: "3px 10px", cursor: "pointer", font: "inherit" }}>Reset</button>
    </div>
  );
}
