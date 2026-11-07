import * as stylex from "@stylexjs/stylex";
import { For, Show, splitProps, type JSX, type ParentProps } from "solid-js";
import { sx } from "../sx";
import { color, font, radius } from "../tokens.stylex";

const spin = stylex.keyframes({ to: { transform: "rotate(360deg)" } });
const shimmer = stylex.keyframes({
  "0%": { backgroundPosition: "-200% 0" },
  "100%": { backgroundPosition: "200% 0" },
});

const s = stylex.create({
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 40,
    paddingInline: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "-0.005em",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.45 },
    transitionProperty: "background-color, border-color, transform, box-shadow, opacity",
    transitionDuration: "160ms",
    transform: { default: null, ":active": "scale(0.98)" },
    whiteSpace: "nowrap",
    userSelect: "none",
    flexShrink: 0,
    outline: { default: "none", ":focus-visible": `2px solid ${color.accent}` },
    outlineOffset: 2,
  },
  primary: {
    backgroundColor: { default: color.accentFill, ":hover": color.accentFillHover },
    color: color.accentText,
    boxShadow: "none",
  },
  secondary: {
    backgroundColor: { default: color.surface2, ":hover": color.surface3 },
    borderColor: color.border,
    color: color.text,
  },
  ghost: {
    backgroundColor: { default: "transparent", ":hover": color.surface2 },
    color: color.muted,
  },
  danger: {
    backgroundColor: { default: color.dangerSoft, ":hover": color.danger },
    color: { default: color.danger, ":hover": "#fff" },
  },
  sm: { height: 32, paddingInline: 12, fontSize: 13, borderRadius: radius.sm },
  lg: { height: 48, paddingInline: 22, fontSize: 15, borderRadius: radius.lg },
  icon: { width: 36, height: 36, paddingInline: 0 },
  full: { width: "100%" },

  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.xl,
    boxShadow: color.shadow,
  },

  switch: {
    position: "relative",
    width: 40,
    height: 24,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 0,
    padding: 0,
    cursor: "pointer",
    transitionProperty: "background-color",
    transitionDuration: "180ms",
    outline: { default: "none", ":focus-visible": `2px solid ${color.accent}` },
    outlineOffset: 2,
  },
  switchOff: { backgroundColor: color.surface3 },
  switchOn: { backgroundColor: color.success },
  knob: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    transitionProperty: "transform",
    transitionDuration: "180ms",
    transitionTimingFunction: "cubic-bezier(.3,.7,.4,1)",
  },
  knobOn: { transform: "translateX(16px)" },

  segmented: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  segment: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: "fit-content",
    height: 32,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: "transparent", ":hover": color.surface3 },
    color: color.muted,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transitionProperty: "background-color, color",
    transitionDuration: "140ms",
    outline: { default: "none", ":focus-visible": `2px solid ${color.accent}` },
  },
  segmentOn: {
    backgroundColor: { default: color.surface, ":hover": color.surface },
    color: color.text,
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  segmentDisabled: { opacity: 0.4, pointerEvents: "none" },

  slider: {
    width: "100%",
    accentColor: color.accent,
    height: 24,
    cursor: "pointer",
  },

  spinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    borderRadius: "50%",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    borderTopColor: "transparent",
    animationName: spin,
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
    flexShrink: 0,
  },

  track: {
    position: "relative",
    width: "100%",
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.surface3,
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: radius.pill,
    backgroundColor: color.accentFill,
    transitionProperty: "width",
    transitionDuration: "400ms",
  },
  indeterminate: {
    width: "100%",
    backgroundImage: `linear-gradient(90deg, transparent, ${color.accent}, transparent)`,
    backgroundSize: "200% 100%",
    animationName: shimmer,
    animationDuration: "1.4s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 24,
    paddingInline: 10,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: color.surface2,
    color: color.muted,
    whiteSpace: "nowrap",
  },
  badgeAccent: { backgroundColor: color.accentSoft, color: color.accent },
  badgeSuccess: { backgroundColor: "rgba(61,220,151,0.12)", color: color.success },
  badgeDanger: { backgroundColor: color.dangerSoft, color: color.danger },

  label: { fontSize: 13, fontWeight: 600, color: color.muted, marginBottom: 8, display: "block" },

  input: {
    width: "100%",
    height: 46,
    paddingInline: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: color.border, ":focus": color.accent },
    backgroundColor: color.surface2,
    color: color.text,
    fontSize: 15,
    outline: "none",
    transitionProperty: "border-color, box-shadow",
    transitionDuration: "150ms",
    boxShadow: { default: "none", ":focus": `0 0 0 4px ${color.accentSoft}` },
    "::placeholder": { color: color.faint },
  },
  mono: { fontFamily: font.mono, fontSize: 14 },
});

const widths = stylex.create({ w: (pct: string) => ({ width: pct }) });

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  full?: boolean;
  loading?: boolean;
};

export function Button(props: ParentProps<ButtonProps>) {
  const [local, rest] = splitProps(props, ["variant", "size", "iconOnly", "full", "loading", "children", "disabled"]);
  return (
    <button
      type="button"
      {...rest}
      disabled={local.disabled || local.loading}
      {...sx(
        s.button,
        s[local.variant ?? "secondary"],
        local.size === "sm" && s.sm,
        local.size === "lg" && s.lg,
        local.iconOnly && s.icon,
        local.full && s.full,
      )}
    >
      <Show when={local.loading}>
        <span {...sx(s.spinner)} />
      </Show>
      {local.children}
    </button>
  );
}

export function Card(props: ParentProps<{ style?: stylex.StyleXStyles; as?: "section" | "div" }>) {
  return <section {...sx(s.card, props.style)}>{props.children}</section>;
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      {...sx(s.switch, props.checked ? s.switchOn : s.switchOff)}
    >
      <span {...sx(s.knob, props.checked && s.knobOn)} />
    </button>
  );
}

export function Segmented<T extends string | number>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={props.label} {...sx(s.segmented, props.disabled && s.segmentDisabled)}>
      <For each={props.options}>
        {(o) => (
          <button
            type="button"
            role="radio"
            aria-checked={props.value === o.value}
            onClick={() => props.onChange(o.value)}
            {...sx(s.segment, props.value === o.value && s.segmentOn)}
          >
            {o.label}
          </button>
        )}
      </For>
    </div>
  );
}

export function Slider(props: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onInput: (v: number) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="range"
      aria-label={props.label}
      min={props.min}
      max={props.max}
      step={props.step ?? 1}
      value={props.value}
      disabled={props.disabled}
      onInput={(e) => props.onInput(Number(e.currentTarget.value))}
      {...sx(s.slider)}
    />
  );
}

export const Spinner = () => <span {...sx(s.spinner)} />;

export function Progress(props: { value: number | null }) {
  return (
    <div {...sx(s.track)} role="progressbar" aria-valuenow={props.value == null ? undefined : Math.round(props.value * 100)}>
      <Show when={props.value != null} fallback={<div {...sx(s.bar, s.indeterminate)} />}>
        <div {...sx(s.bar, widths.w(`${Math.max(2, Math.min(100, (props.value ?? 0) * 100))}%`))} />
      </Show>
    </div>
  );
}

export function Badge(props: ParentProps<{ tone?: "accent" | "success" | "danger" }>) {
  return (
    <span
      {...sx(
        s.badge,
        props.tone === "accent" && s.badgeAccent,
        props.tone === "success" && s.badgeSuccess,
        props.tone === "danger" && s.badgeDanger,
      )}
    >
      {props.children}
    </span>
  );
}

export function TextInput(
  props: JSX.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean; ref?: (el: HTMLInputElement) => void },
) {
  const [local, rest] = splitProps(props, ["mono"]);
  return <input {...rest} {...sx(s.input, local.mono && s.mono)} />;
}

export const Label = (props: ParentProps<{ for?: string }>) => (
  <label for={props.for} {...sx(s.label)}>
    {props.children}
  </label>
);
