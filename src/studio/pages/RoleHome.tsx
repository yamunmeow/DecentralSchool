import { useAccount } from "../account";
import { newProject } from "../../code/project";
import { projects } from "../db";
import { SignInButtons } from "../components/SignIn";
import { ZoPic } from "../learn/Zo";
import { setRole, useRole } from "../role";
import { go } from "../store";
import { t } from "../i18n";
import { TemplateRow } from "./Home";
import { Icon } from "../ui";

/** The first page: who's here decides what's in front. */
export function RoleHome() {
  const { role } = useRole();
  if (!role) return <Welcome />;
  return role === "teacher" ? <TeacherHome /> : <StudentHome />;
}

const FEATURES = [
  { href: "#/play", title: "Play now", text: "Random quizzes, examples and games from the CAEB in Porto-Novo. Nothing to install.", zo: "student", pose: "cheer" },
  { href: "#/code", title: "Game Lab", text: "Make games with Scratch's blocks and see the same game as JavaScript.", zo: "artist", pose: "wave" },
  { href: "#/learn", title: "Zo Wants to Learn", text: "Fix mistakes in a set of data, train a small model and test it.", zo: "scientist", pose: "stand" },
  { href: "#/games", title: "Game Templates", text: "Quizzes, maths, grammar, words and reading, ready as a link, a file or an app.", zo: "teacher", pose: "wave" },
] as const;

/** Signed out, this is the front door (App.tsx shows it for every studio page); signed in, it asks student or teacher. */
export function Welcome() {
  const account = useAccount();
  return (
    <div className="page welcome">
      <section className="hero welcome-hero">
        <div className="hero-text">
          <h1>{account ? (account.name.split(" ")[0] ? t("Welcome, {name}! Who are you here as?", { name: account.name.split(" ")[0] }) : t("Welcome, friend! Who are you here as?")) : t("Make learning games that work offline.")}</h1>
          {account ? (
            <div className="toolbar role-buttons">
              <button className="btn btn-ghost btn-big" onClick={() => setRole("student")}>
                {t("I'm a student")}
              </button>
              <button className="btn btn-primary btn-big" onClick={() => setRole("teacher")}>
                {t("I'm a teacher")}
              </button>
            </div>
          ) : (
            <>
              <p className="hero-lede">{t("A free, open-source tool for students and teachers. Sign in for free with Google to start. After that, it works without the internet.")}</p>
              <SignInButtons />
            </>
          )}
        </div>
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="zo" pose="wave" size={170} />
        </div>
      </section>

      <section className="feature-grid" aria-label={t("What's inside")}>
        {FEATURES.map((f) => (
          <a key={f.href} href={account ? f.href : "#/signin"} className="feature-card">
            <span className="feature-cover">
              <ZoPic outfit={f.zo} pose={f.pose} size={96} />
            </span>
            <span className="feature-body">
              <strong>{t(f.title)}</strong>
              <span>{t(f.text)}</span>
              <span className="btn btn-primary btn-sm">{account ? t("Open") : t("Sign in for free")}</span>
            </span>
          </a>
        ))}
      </section>
    </div>
  );
}

const newGame = async () => {
  const p = newProject(t("My game"));
  await projects.put(p);
  go(`code/${p.id}`);
};

function StudentHome() {
  const { name } = useRole();
  return (
    <div className="page">
      <section className="hero student-hero">
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="artist" pose="cheer" size={92} />
        </div>
        <div className="hero-text">
          <h1>{name ? t("Hi {name}! What will you make?", { name }) : t("What will you make today?")}</h1>
          <div className="toolbar">
            <button className="btn btn-primary btn-big" onClick={newGame}>
              <Icon name="plus" size={20} /> {t("New game")}
            </button>
            <a className="btn btn-ghost" href="#/learn">
              <Icon name="cap" size={18} /> {t("Teach Zo")}
            </a>
          </div>
        </div>
      </section>
      <Templates />
    </div>
  );
}

function TeacherHome() {
  const { name } = useRole();
  return (
    <div className="page">
      <section className="hero teacher-hero">
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="teacher" pose="wave" size={92} />
        </div>
        <div className="hero-text">
          <h1>{name ? t("Welcome back, {name}", { name }) : t("Welcome back")}</h1>
          <div className="toolbar">
            <a className="btn btn-primary btn-big hero-main" href="#/new">
              <Icon name="plus" size={20} /> {t("Create a game")}
            </a>
          </div>
        </div>
      </section>
      <Templates />
    </div>
  );
}

function Templates() {
  return (
    <>
      <div className="page-head">
        <h2 className="section-title">{t("Game Templates")}</h2>
      </div>
      <TemplateRow />
    </>
  );
}
