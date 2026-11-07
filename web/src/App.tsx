import * as stylex from "@stylexjs/stylex";
import { HashRouter, Navigate, Route, Router, useNavigate, type RouteSectionProps } from "@solidjs/router";
import { Show, createEffect, onMount, type ParentProps } from "solid-js";
import { Header } from "./components/Header";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { ProjectPage } from "./pages/Project";
import { Projects } from "./pages/Projects";
import { Clients } from "./pages/Clients";
import { ClientFolder } from "./pages/ClientFolder";
import { BrandSheetPage } from "./pages/BrandSheetPage";
import { AgencyClient, ClientPortal } from "./pages/ClientPortal";
import { AgencyPlanDocument, ClientPlanDocument } from "./pages/PlanDocument";
import { DEMO } from "./api";
import { DemoBadge } from "./mock/DemoBadge";
import { authReady, isLight, restoreSession, user } from "./store";
import { sx } from "./sx";
import { color, font, lightTheme } from "./tokens.stylex";
import { Spinner } from "./ui/kit";

const s = stylex.create({
  root: {
    minHeight: "100vh",
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans,
    fontSize: 15,
    lineHeight: 1.5,
    transitionProperty: "background-color, color",
    transitionDuration: "250ms",
  },
  center: { minHeight: "100vh", display: "grid", placeItems: "center", color: color.muted },
  main: { position: "relative", maxWidth: 1180, marginInline: "auto", paddingInline: { default: 16, "@media (min-width: 720px)": 28 }, paddingBottom: 80 },
});

function Shell(props: RouteSectionProps) {
  return (
    <>
      <Header />
      <main {...sx(s.main)}>{props.children}</main>
    </>
  );
}

function RequireAuth(props: ParentProps) {
  const navigate = useNavigate();
  createEffect(() => {
    if (authReady() && !user()) navigate("/login", { replace: true });
  });
  return <Show when={user()}>{props.children}</Show>;
}

const Routes = DEMO ? HashRouter : Router;

export function App() {
  onMount(restoreSession);
  // The theme lives on <html>, so pop-ups mounted outside the app follow it too.
  const lightClasses = (stylex.props(lightTheme).className ?? "").split(" ").filter(Boolean);
  createEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = isLight() ? "light" : "dark";
    for (const c of lightClasses) root.classList.toggle(c, isLight());
  });
  return (
    <div {...sx(s.root)}>

      {DEMO && <DemoBadge />}
      <Show
        when={authReady()}
        fallback={
          <div {...sx(s.center)}>
            <Spinner />
          </div>
        }
      >
        <Routes>
          <Route path="/" component={Landing} />
          <Route path="/welcome" component={() => <Navigate href="/" />} />
          <Route path="/login" component={() => (user() ? <Navigate href="/projects" /> : <Login />)} />
          <Route path="/c/:token" component={ClientPortal} />
          <Route path="/c/:token/plan" component={ClientPlanDocument} />
          <Route path="/clients/:id/plan" component={() => (<RequireAuth><AgencyPlanDocument /></RequireAuth>)} />
          <Route path="/" component={Shell}>
            <Route path="/projects" component={() => (<RequireAuth><Projects /></RequireAuth>)} />
            <Route path="/projects/client/:id" component={() => (<RequireAuth><ClientFolder /></RequireAuth>)} />
            <Route path="/projects/client/:id/brand" component={() => (<RequireAuth><BrandSheetPage /></RequireAuth>)} />
            <Route path="/clients" component={() => (<RequireAuth><Clients /></RequireAuth>)} />
            <Route path="/clients/:id" component={() => (<RequireAuth><AgencyClient /></RequireAuth>)} />
            <Route path="/p/:id/:step?" component={() => (<RequireAuth><ProjectPage /></RequireAuth>)} />
          </Route>
          <Route path="*" component={() => <Navigate href="/" />} />
        </Routes>
      </Show>
    </div>
  );
}
