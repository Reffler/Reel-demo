import * as stylex from "@stylexjs/stylex";

// Dark is the default; `lightTheme` overrides the same variables. Keep in step with :root in global.css.
export const color = stylex.defineVars({
  bg: "#1e1e20",
  surface: "#2a2a2d",
  surface2: "#37373b",
  surface3: "#444448",
  border: "rgba(255,255,255,0.09)",
  borderStrong: "#505055",
  text: "#f5f5f7",
  muted: "#aeaeb2",
  faint: "#98989d",
  accent: "#2997ff",
  accentFill: "#0071e3",
  accentFillHover: "#0077ed",
  accentText: "#ffffff",
  accentSoft: "rgba(41,151,255,0.12)",
  accent2: "#2997ff",
  success: "#30d158",
  warning: "#ff9f0a",
  danger: "#ff453a",
  dangerSoft: "rgba(255,69,58,0.14)",
  shadow: "none",
  overlay: "rgba(0,0,0,0.6)",
});

export const radius = stylex.defineVars({
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  pill: "999px",
});

export const font = stylex.defineVars({
  sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'Inter', system-ui, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
});

export const lightTheme = stylex.createTheme(color, {
  bg: "#f5f5f7",
  surface: "#ffffff",
  surface2: "#f0f0f3",
  surface3: "#e3e3e8",
  border: "rgba(0,0,0,0.08)",
  borderStrong: "#d2d2d7",
  text: "#1d1d1f",
  muted: "#6e6e73",
  faint: "#76767b",
  accent: "#0066cc",
  accentFill: "#0071e3",
  accentFillHover: "#0077ed",
  accentText: "#ffffff",
  accentSoft: "rgba(0,113,227,0.1)",
  accent2: "#0066cc",
  success: "#248a3d",
  warning: "#b25000",
  danger: "#d70015",
  dangerSoft: "rgba(215,0,21,0.08)",
  shadow: "none",
  overlay: "rgba(20,20,30,0.35)",
});
