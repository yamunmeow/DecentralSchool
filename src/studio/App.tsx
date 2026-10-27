import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { refreshAccount, takeSignInError, useAccount } from "./account";
import { finishSignIn, modelName } from "./ai/openrouter";
import { SignInPage } from "./components/SignIn";
import { AssistantPage } from "./pages/AssistantPage";
import { Editor } from "./pages/Editor";
import { Home } from "./pages/Home";
import { RoleHome, Welcome } from "./pages/RoleHome";
import { useRole } from "./role";
import { NewGame } from "./pages/NewGame";
import { Settings } from "./pages/Settings";
import { AppProvider, go, useApp, useRoute } from "./store";
import { ThemeToggle } from "./Theme";
import { Icon } from "./ui";
import { LogoMark, Wordmark } from "./Brand";
import { useAi } from "./useAi";

// Game Lab (Blockly, the stage runtime) loads only when it is opened.
const CodeEditor = lazy(() => import("./code/CodeEditor").then((m) => ({ default: m.CodeEditor })));
const CodeHome = lazy(() => import("./code/CodeHome").then((m) => ({ default: m.CodeHome })));
const LearnHome = lazy(() => import("./learn/LearnHome").then((m) => ({ default: m.LearnHome })));
const LearnPage = lazy(() => import("./learn/LearnPage").then((m) => ({ default: m.LearnPage })));
const ClassPage = lazy(() => import("./class/ClassPage").then((m) => ({ default: m.ClassPage })));
const JoinPage = lazy(() => import("./class/ClassPage").then((m) => ({ default: m.JoinPage })));
const FeedbackPage = lazy(() => import("./class/ClassPage").then((m) => ({ default: m.FeedbackPage })));
const PlayPage = lazy(() => import("./play/PlayPage").then((m) => ({ default: m.PlayPage })));
const MissionPage = lazy(() => import("./pages/MissionPage").then((m) => ({ default: m.MissionPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const ChallengeEditorPage = lazy(() => import("./class/ChallengeEditor").then((m) => ({ default: m.ChallengeEditorPage })));

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

/** Pages anyone can open. Everything else in the studio needs a signed-in account. */
const PUBLIC = new Set(["privacy", "terms", "mission", "signin"]);

function Shell() {
  const route = useRoute();
  const { ready, toast } = useApp();
  const account = useAccount();
  const locked = !account;
  const [menu, setMenu] = useState(false);
  const compact = useFit(ready);
  useEffect(() => setMenu(false), [route.join("/")]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);
  useEffect(() => {
    finishSignIn().then((r) => {
      if (r === "ok") toast("OpenRouter connected");
      else if (r !== "none") toast(r, "error");
    });
    const failed = takeSignInError();
    if (failed) {
      toast(failed, "error");
      go("signin");
    }
    refreshAccount();
  }, [toast]);

  if (!ready)
    return (
      <div className="splash" aria-busy>
        <LogoMark size={72} />
      </div>
    );

  const [head, id, tab] = route;
  let page: ReactNode;
  if (locked && !PUBLIC.has(head)) page = <Welcome />;
  else if (head === "game" && id) page = <Editor key={id} id={id} tab={tab} />;
  else if (head === "new") page = <NewGame template={id} />;
  else if (head === "assistant") page = <AssistantPage />;
  else if (head === "code" && id) page = <CodeEditor key={id} id={id} />;
  else if (head === "code") page = <CodeHome />;
  else if (head === "learn" && id) page = <LearnPage key={id} id={id} step={tab} />;
  else if (head === "learn") page = <LearnHome />;
  else if (head === "class" && id === "challenge" && tab) page = <ChallengeEditorPage key={tab} id={tab} />;
  else if (head === "class") page = <ClassPage />;
  else if (head === "join" && id) page = <JoinPage key={id} data={id} />;
  else if (head === "feedback" && id) page = <FeedbackPage key={id} data={id} />;
  else if (head === "games") page = <Home />;
  else if (head === "play") page = <PlayPage id={id} />;
  else if (head === "mission") page = <MissionPage />;
  else if (head === "privacy") page = <PrivacyPage />;
  else if (head === "terms") page = <TermsPage />;
  else if (head === "signin") page = <SignInPage />;
  else if (head === "settings") page = <Settings />;
  else page = <RoleHome />;

  return (
    <div className="shell">
      <a className="skip-link" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById("main")?.focus())}>
        Skip to content
      </a>
      <header className="site-head">
        <div className={`site-head-in${compact.on ? " is-compact" : ""}`} ref={compact.box}>
          <a href="#/" className="brand" aria-label="DecentralSchool home">
            <LogoMark size={40} />
            <Wordmark />
          </a>
          {!locked && (
            <nav className="site-nav" aria-label="Main" aria-hidden={compact.on || undefined} ref={compact.nav}>
              <NavLinks current={route} />
            </nav>
          )}
          <span className="spacer" />
          <div className="head-tools" ref={compact.tools}>
            <ThemeToggle />
            <AccountButton current={head} />
            {!locked && (
              <>
                <a href="#/settings" className={`icon-btn head-settings${head === "settings" ? " on" : ""}`} aria-label="Settings" title="Settings">
                  <Icon name="gear" size={21} />
                </a>
                <HeadCta />
                <button className="icon-btn menu-btn" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}>
                  <Icon name="menu" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <div className={`scrim${menu ? " on" : ""}`} onClick={() => setMenu(false)} aria-hidden />
      {!locked && <Drawer current={route} open={menu} onClose={() => setMenu(false)} />}
      <main className="main" id="main" tabIndex={-1}>
        <Suspense fallback={<div className="splash" aria-busy />}>{page}</Suspense>
      </main>
      <SiteFoot locked={locked} />
    </div>
  );
}

/**
 * Whether the top menu fits beside the logo and the buttons. When it doesn't (narrow
 * screens, a longer teacher menu, bigger text), it folds into the ☰ drawer instead of
 * running under the buttons.
 */
function useFit(ready: boolean) {
  const box = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const tools = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const brand = el.querySelector<HTMLElement>(".brand");
      const box = getComputedStyle(el);
      const menu = nav.current ? getComputedStyle(nav.current) : null;
      const gaps = parseFloat(box.columnGap) * 3 + (menu ? parseFloat(menu.marginLeft) + parseFloat(menu.marginRight) : 0);
      const room = el.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
      setOn((brand?.offsetWidth || 0) + (nav.current?.scrollWidth || 0) + (tools.current?.scrollWidth || 0) + gaps > room);
    };
    measure();
    // The menu keeps its natural width (it never shrinks), so a font swap or a longer menu shows up here too.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (nav.current) ro.observe(nav.current);
    if (tools.current) ro.observe(tools.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [ready]);
  return { box, nav, tools, on };
}

function useNav(current: string[]) {
  const { role } = useRole();
  const [head] = current;
  const items: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; on: boolean }[] = [
    { href: "play", label: "Play", icon: "play", on: head === "play" },
    { href: "code", label: "Game Lab", icon: "code", on: head === "code" },
    { href: "learn", label: "Zo Wants to Learn", icon: "cap", on: head === "learn" },
    { href: "games", label: "Quick games", icon: "game", on: head === "games" || head === "new" || head === "game" },
    { href: "class", label: role === "teacher" ? "Class" : "My class", icon: "book", on: head === "class" || head === "join" || head === "feedback" },
  ];
  if (role === "teacher") items.push({ href: "assistant", label: "Assistant", icon: "sparkle", on: head === "assistant" });
  items.push({ href: "mission", label: "Mission", icon: "heart", on: head === "mission" });
  return items;
}

function NavLinks({ current }: { current: string[] }) {
  return (
    <>
      {useNav(current).map((l) => (
        <a key={l.href} href={`#/${l.href}`} className={`site-link${l.on ? " on" : ""}`} aria-current={l.on ? "page" : undefined}>
          {l.label}
        </a>
      ))}
    </>
  );
}

function AccountButton({ current }: { current?: string }) {
  const account = useAccount();
  const label = account ? `Signed in as ${account.name || account.email}` : "Sign in";
  return (
    <a href={account ? "#/settings" : "#/signin"} className={`icon-btn head-account${current === "signin" ? " on" : ""}`} aria-label={label} title={label}>
      {account ? <span className="account-initial">{(account.name || account.email).trim().charAt(0).toUpperCase()}</span> : <Icon name="user" size={21} />}
    </a>
  );
}

function HeadCta() {
  const { role } = useRole();
  if (role === "teacher")
    return (
      <a className="btn btn-primary btn-sm head-cta" href="#/new">
        <Icon name="plus" size={18} /> Create a game
      </a>
    );
  return (
    <a className="btn btn-primary btn-sm head-cta" href="#/code">
      <Icon name="plus" size={18} /> Make a game
    </a>
  );
}

function Drawer({ current, open, onClose }: { current: string[]; open: boolean; onClose: () => void }) {
  const { games } = useApp();
  const ai = useAi();
  const { role, name } = useRole();
  const recent = role === "teacher" ? games.slice(0, 6) : [];

  return (
    <nav className={`drawer${open ? " open" : ""}`} aria-label="Menu" aria-hidden={!open} inert={!open}>
      <div className="drawer-head">
        <a href="#/" className="brand">
          <LogoMark size={36} />
          <Wordmark />
        </a>
        <button className="icon-btn" onClick={onClose} aria-label="Close menu">
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className="drawer-scroll">
        <a href="#/" className={`drawer-link${current.join("/") === "" ? " on" : ""}`}>
          <span className="nav-icon">
            <Icon name="home" />
          </span>
          Home
        </a>
        {useNav(current).map((l) => (
          <a key={l.href} href={`#/${l.href}`} className={`drawer-link${l.on ? " on" : ""}`} aria-current={l.on ? "page" : undefined}>
            <span className="nav-icon">
              <Icon name={l.icon} />
            </span>
            {l.label}
          </a>
        ))}
        <a href="#/settings" className={`drawer-link${current[0] === "settings" ? " on" : ""}`}>
          <span className="nav-icon">
            <Icon name="gear" />
          </span>
          Settings
        </a>
        {recent.length > 0 && (
          <>
            <h2 className="nav-title">Recent quick games</h2>
            {recent.map((g) => (
              <a key={g.id} href={`#/game/${g.id}`} className="drawer-link">
                <span className="nav-icon nav-emoji">{g.emoji}</span>
                <span className="nav-label">{g.title}</span>
              </a>
            ))}
          </>
        )}
      </div>
      <div className="drawer-foot">
        {role === "teacher" ? (
          <a href="#/settings" className={`ai-chip${ai.connected ? " on" : ""}`}>
            <span className="ai-dot" aria-hidden />
            <span>
              <strong>{ai.connected ? "AI connected" : "Connect AI"}</strong>
              <small>{ai.connected ? modelName(ai.model) : "Optional, free models"}</small>
            </span>
          </a>
        ) : (
          <a href="#/settings" className="ai-chip">
            <span className="ai-dot" aria-hidden />
            <span>
              <strong>{name || "Student"}</strong>
              <small>{role ? "Student" : "Pick student or teacher"}</small>
            </span>
          </a>
        )}
      </div>
    </nav>
  );
}

function SiteFoot({ locked }: { locked: boolean }) {
  return (
    <footer className="site-foot">
      <div className="site-foot-in">
        <div className="foot-brand">
          <a href="#/" className="brand">
            <LogoMark size={36} />
            <Wordmark />
          </a>
          <p>Offline-first tools for making, playing and sharing learning games. Free and open source.</p>
        </div>
        {!locked && (
          <>
            <div className="foot-col">
              <h2>Make</h2>
              <a href="#/code">Game Lab</a>
              <a href="#/games">Quick games</a>
              <a href="#/learn">Zo Wants to Learn</a>
            </div>
            <div className="foot-col">
              <h2>Play</h2>
              <a href="#/play">All games</a>
              <a href="#/class">Class</a>
              <a href="#/settings">Settings</a>
            </div>
          </>
        )}
        <div className="foot-col">
          <h2>About</h2>
          <a href="#/mission">Our mission</a>
          <a href="#/mission/license">License (AGPL-3.0)</a>
          <a href="#/privacy">Privacy</a>
          <a href="#/terms">Terms</a>
          <a href="https://decentralschool.org" rel="noopener">decentralschool.org</a>
        </div>
      </div>
      <p className="foot-small">Built on Scratch's block language. Works without the internet once it has loaded.</p>
    </footer>
  );
}
