import * as stylex from "@stylexjs/stylex";

type StyleArg = stylex.StyleXStyles | stylex.Theme<any> | false | null | undefined | 0 | "";

/** StyleX → Solid props (`class` + `style`). */
export const sx = (...styles: StyleArg[]) => {
  const p = (stylex.props as (...a: unknown[]) => { className?: string; style?: Record<string, string> })(...styles);
  return { class: p.className, style: p.style };
};
