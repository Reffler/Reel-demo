import * as stylex from "@stylexjs/stylex";
import { sx } from "../sx";
import { color } from "../tokens.stylex";

const s = stylex.create({
  wrap: { display: "inline-flex", alignItems: "center", gap: 10, color: color.text, textDecoration: "none" },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    backgroundColor: color.accentFill,
    boxShadow: "none",
  },
  big: { width: 44, height: 44, borderRadius: 13 },
  word: { fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" },
  wordBig: { fontSize: 26 },
});

export function Brand(props: { big?: boolean }) {
  return (
    <span {...sx(s.wrap)}>
      <span {...sx(s.mark, props.big && s.big)}>
        <svg width={props.big ? 18 : 13} height={props.big ? 18 : 13} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 1.5v9l7.5-4.5z" fill="#fff" />
        </svg>
      </span>
      <span {...sx(s.word, props.big && s.wordBig)}>Reel</span>
    </span>
  );
}
