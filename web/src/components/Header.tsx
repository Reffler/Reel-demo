import * as stylex from "@stylexjs/stylex";
import { A, useNavigate } from "@solidjs/router";
import { Show } from "solid-js";
import { isLight, signOut, toggleTheme, user } from "../store";
import { sx } from "../sx";
import { color } from "../tokens.stylex";
import { IconLogout, IconMoon, IconSun } from "../ui/icons";
import { Button } from "../ui/kit";
import { Brand } from "./Brand";
import { SaveStatus } from "./SaveStatus";
import { QuotaMenu } from "./QuotaMenu";

const s = stylex.create({
  bar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    backgroundColor: color.bg,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: color.border,
  },
  inner: {
    maxWidth: "100%",
    marginInline: "auto",
    height: 64,
    paddingInline: { default: 16, "@media (min-width: 720px)": 28 },
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  link: { textDecoration: "none" },
  spacer: { flexGrow: 1 },
});

export function Header() {
  const navigate = useNavigate();
  return (
    <header {...sx(s.bar)}>
      <div {...sx(s.inner)}>
        <A href="/" {...sx(s.link)}>
          <Brand />
        </A>
        <div id="wizard-navigation" class="wizard-navigation" />
        <div {...sx(s.spacer)} />
        <SaveStatus />
        <Show when={user()}>
          <nav class="header-nav" aria-label="Main">
            <A href="/clients" activeClass="active">Clients</A>
            <A href="/projects" activeClass="active">Projects</A>
          </nav>
        </Show>
        <button class="theme-toggle" onClick={toggleTheme} aria-label={isLight() ? "Switch to dark mode" : "Switch to light mode"} title={isLight() ? "Dark mode" : "Light mode"}>
          <Show when={isLight()} fallback={<IconSun size={18} />}><IconMoon size={18} /></Show>
        </button>
        <details class="account-menu"><summary aria-label="Account menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg></summary><div class="account-panel">
        <Show when={user()}>
          <QuotaMenu />
        </Show>
        <Show when={user()}>
          <Button
            variant="ghost"
            iconOnly
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
          >
            <IconLogout />
          </Button>
        </Show>
        </div></details>
      </div>
    </header>
  );
}
