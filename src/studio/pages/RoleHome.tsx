import { useEffect, useState, type CSSProperties } from "react";
import { useAccount } from "../account";
import { costumeSvg, svgUrl } from "../../code/art";
import { newProject } from "../../code/project";
import type { CodeProject } from "../../code/types";
import { stepsDone } from "../class/model";
import { challenges, handins, projects } from "../db";
import { SignInButtons } from "../components/SignIn";
import { ZoPic } from "../learn/Zo";
import { PALETTE } from "../palette";
import { setRole, useRole } from "../role";
import { go } from "../store";
import { TEMPLATE_INFO } from "../templates";
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
  { href: "#/games", title: "Quick games", text: "Quizzes, maths, grammar, words and reading, ready as a link, a file or an app.", zo: "teacher", pose: "wave" },
] as const;

/** Signed out, this is the front door (App.tsx shows it for every studio page); signed in, it asks student or teacher. */
export function Welcome() {
  const account = useAccount();
  return (
    <div className="page welcome">
      <section className="hero welcome-hero">
        <div className="hero-text">
          <h1>{account ? `Welcome, ${account.name.split(" ")[0] || "friend"}! Who are you here as?` : "Make learning games that work offline."}</h1>
          {account ? (
            <div className="toolbar role-buttons">
              <button className="btn btn-ghost btn-big" onClick={() => setRole("student")}>
                I'm a student
              </button>
              <button className="btn btn-primary btn-big" onClick={() => setRole("teacher")}>
                I'm a teacher
              </button>
            </div>
          ) : (
            <>
              <p className="hero-lede">A free, open-source tool for students and teachers. Sign in for free with Google to start. After that, it works without the internet.</p>
              <SignInButtons />
            </>
          )}
        </div>
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="zo" pose="wave" size={170} />
        </div>
      </section>

      <section className="split">
        <h2 className="section-title">What you can do</h2>
        <ul className="check-list">
          {["Students make their own games; teachers set challenges and give feedback", "Share games as a link, an .html file or an Android app. They all work offline.", "Train a small AI model and see where its data has mistakes", "Free and open source (AGPL-3.0)"].map((t) => (
            <li key={t}>
              <Icon name="checkCircle" size={22} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="feature-grid" aria-label="What's inside">
        {FEATURES.map((f) => (
          <a key={f.href} href={account ? f.href : "#/signin"} className="feature-card">
            <span className="feature-cover">
              <ZoPic outfit={f.zo} pose={f.pose} size={96} />
            </span>
            <span className="feature-body">
              <strong>{f.title}</strong>
              <span>{f.text}</span>
              <span className="btn btn-primary btn-sm">{account ? "Open" : "Sign in for free"}</span>
            </span>
          </a>
        ))}
      </section>

      <section className="band welcome-band">
        <div className="band-grid">
          <h2>How we started</h2>
          <div className="band-text">
            <p>We started DecentralSchool after meeting an English teacher at the CAEB in Porto-Novo, Benin. He wanted to make games that his students could install in the classroom and use to practise English at home, without the internet.</p>
            <a className="btn btn-primary" href="#/mission">
              About DecentralSchool
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

const newGame = async () => {
  const p = newProject("My game");
  await projects.put(p);
  go(`code/${p.id}`);
};

function ProjectCard({ p }: { p: CodeProject }) {
  const s = p.sprites[0];
  const thumb = s?.costumes[s.costume] || p.stage.costumes[p.stage.costume];
  return (
    <a className="mini-card" href={`#/code/${p.id}`}>
      <span className="mini-pic">{thumb && <img src={svgUrl(costumeSvg(thumb))} alt="" />}</span>
      <span className="mini-text">
        <strong>{p.title}</strong>
        <small>{p.mission ? `Mission · ${stepsDone(p).length}/${p.mission.steps.length} steps` : new Date(p.updated).toLocaleDateString()}</small>
      </span>
    </a>
  );
}

function StudentHome() {
  const { name } = useRole();
  const [mine, setMine] = useState<CodeProject[]>([]);
  useEffect(() => {
    projects.all().then((all) => setMine(all.sort((a, b) => b.updated - a.updated)), () => setMine([]));
  }, []);
  const missions = mine.filter((p) => p.mission && !p.feedback?.some((f) => f.status === "approved"));

  return (
    <div className="page">
      <section className="hero student-hero">
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="artist" pose="cheer" size={92} />
        </div>
        <div className="hero-text">
          <h1>{name ? `Hi ${name}! What will you make?` : "What will you make today?"}</h1>
          <div className="toolbar">
            <button className="btn btn-primary btn-big" onClick={newGame}>
              <Icon name="plus" size={20} /> New game
            </button>
            <a className="btn btn-ghost" href="#/learn">
              <Icon name="cap" size={18} /> Teach Zo
            </a>
            <a className="btn btn-ghost" href="#/class">
              <Icon name="book" size={18} /> My class
            </a>
          </div>
        </div>
      </section>

      {missions.length > 0 && (
        <>
          <div className="page-head">
            <h2 className="section-title">Missions</h2>
          </div>
          <div className="mini-grid">
            {missions.slice(0, 4).map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        </>
      )}

      <div className="page-head">
        <h2 className="section-title">Keep going</h2>
        <span className="spacer" />
        <a className="btn btn-ghost btn-sm" href="#/code">
          All my games <Icon name="arrowR" size={16} />
        </a>
      </div>
      {mine.length ? (
        <div className="mini-grid">
          {mine.slice(0, 8).map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="card is-quiet start-card">
          <ZoPic outfit="baby" size={56} />
          <p>Your games will show up here.</p>
          <a className="btn btn-soft btn-sm" href="#/code">
            Start from an example
          </a>
        </div>
      )}
    </div>
  );
}

function TeacherHome() {
  const { name } = useRole();
  const [counts, setCounts] = useState({ challenges: 0, waiting: 0, approved: 0 });
  useEffect(() => {
    Promise.all([challenges.all(), handins.all()]).then(
      ([c, h]) => setCounts({ challenges: c.length, waiting: h.filter((x) => !x.feedback).length, approved: h.filter((x) => x.feedback?.status === "approved").length }),
      () => undefined,
    );
  }, []);

  return (
    <div className="page">
      <section className="hero teacher-hero">
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="teacher" pose="wave" size={92} />
        </div>
        <div className="hero-text">
          <h1>{name ? `Welcome back, ${name}` : "Your class"}</h1>
          <div className="toolbar">
            <a className="btn btn-primary btn-big hero-main" href="#/new">
              <Icon name="plus" size={20} /> Create a game
            </a>
            <button className="btn btn-ghost" onClick={() => go("class/challenge/new")}>
              <Icon name="star" size={18} /> New challenge
            </button>
            <a className="btn btn-ghost" href="#/class">
              <Icon name="book" size={18} /> Class
            </a>
          </div>
        </div>
      </section>

      <div className="stat-row">
        <a className="stat-tile" href="#/class">
          <strong>{counts.challenges}</strong>
          <span>challenge{counts.challenges === 1 ? "" : "s"}</span>
        </a>
        <a className={`stat-tile${counts.waiting ? " is-hot" : ""}`} href="#/class" onClick={() => sessionStorage.setItem("ds-class-tab", "handins")}>
          <strong>{counts.waiting}</strong>
          <span>to review</span>
        </a>
        <a className="stat-tile" href="#/class" onClick={() => sessionStorage.setItem("ds-class-tab", "gallery")}>
          <strong>{counts.approved}</strong>
          <span>for the gallery</span>
        </a>
      </div>

      <div className="page-head">
        <h2 className="section-title">Quick games</h2>
        <span className="spacer" />
        <a className="btn btn-ghost btn-sm" href="#/games">
          My quick games <Icon name="arrowR" size={16} />
        </a>
      </div>
      <section className="template-row" aria-label="Quick game templates">
        {TEMPLATE_INFO.map((t) => (
          <a key={t.id} href={`#/new/${t.id}`} className="template-tile" style={{ "--tint": PALETTE[t.tint].tint, "--ink-t": PALETTE[t.tint].ink } as CSSProperties}>
            <span className="template-emoji">{t.emoji}</span>
            <strong>{t.name}</strong>
          </a>
        ))}
      </section>
    </div>
  );
}
