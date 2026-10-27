import { useEffect } from "react";
import { ZoPic } from "../learn/Zo";
import { useRoute } from "../store";
import { Icon } from "../ui";

const BELIEFS = [
  ["Offline first", "Everything works without the internet once it has loaded: games, the Game Lab, Zo's models, even building Android apps."],
  ["Sustainable AI", "Small models that train and run on the student's own device, in seconds, with no data centre behind them."],
  ["Decentralised", "A free Google sign-in keeps only a name and an email. Games, class work and models stay on the devices of the people who made them."],
  ["Free and open source", "Released under the GNU AGPL-3.0, so anyone can run it, study it, change it and share it."],
  ["Creation over consumption", "Young people should get their gratification from making things, not from scrolling through what others made."],
] as const;

const THIRD_PARTY = [
  ["Scratch block language and project format", "Scratch Foundation / MIT Media Lab", "AGPL-3.0 (editor, VM, renderer)"],
  ["Blockly", "Google / Raspberry Pi Foundation", "Apache-2.0"],
  ["Leopard", "Leopard contributors", "MIT"],
  ["CodeMirror", "Marijn Haverbeke and contributors", "MIT"],
  ["pdf.js", "Mozilla", "Apache-2.0"],
  ["fflate", "Arjun Barrett", "MIT"],
  ["Better Auth (sign-in)", "Better Auth contributors", "MIT"],
  ["Fredoka, Nunito, Atkinson Hyperlegible", "Milena Brandão and Hafontia; Vernon Adams; Braille Institute", "SIL Open Font License 1.1"],
  ["Open Trivia Database questions", "opentdb.com contributors", "CC BY-SA 4.0"],
  ["Wikipedia summaries", "Wikipedia contributors", "CC BY-SA 4.0"],
  ["Country facts", "REST Countries", "MPL-2.0"],
  ["Word meanings", "Free Dictionary API (Wiktionary)", "CC BY-SA 3.0"],
] as const;

export function MissionPage() {
  const [, section] = useRoute();
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: "start" });
  }, [section]);

  return (
    <div className="page mission">
      <section className="hero mission-hero">
        <div className="hero-text">
          <p className="kicker">Our mission</p>
          <h1>Every classroom should be able to make its own games and learn without a connection.</h1>
          <p className="hero-lede">
            DecentralSchool is a free, open-source and offline-first studio where teachers and students create learning games, play them anywhere, and
            share them without a server in the middle.
          </p>
          <div className="toolbar">
            <a className="btn btn-primary" href="#/code">
              <Icon name="plus" size={18} /> Make a game
            </a>
            <a className="btn btn-ghost" href="#/play">
              <Icon name="play" size={18} /> Play now
            </a>
          </div>
        </div>
        <div className="hero-critters" aria-hidden>
          <ZoPic outfit="teacher" pose="wave" size={150} />
        </div>
      </section>

      <section className="story" aria-labelledby="start">
        <div>
          <h2 id="start" className="section-title">
            Where it started
          </h2>
        </div>
        <div className="prose">
          <p>
            DecentralSchool was inspired by the English teacher at the <strong>CAEB</strong>, the <em>Conseil des Activités Éducatives du Bénin</em>{" "}
            (Benin Council for Educational Activities), in <strong>Porto-Novo, Benin</strong>.
          </p>
          <p>
            He did not want to hand his students games that someone else had already made for the internet. He wanted the agency to create his own games
            and quizzes, built around his own lessons. And he wanted them to work offline: his students download and install them at the CAEB, then keep
            practising at home without worrying about an internet connection.
          </p>
          <p>
            His games are here as templates. <strong>Word Quest</strong>, <strong>Reading Quest</strong> and <strong>Math Quest</strong> can be played
            straight away without installing anything, copied and changed, or turned into an Android app for a class.
          </p>
          <a className="btn btn-soft btn-sm" href="#/play">
            Play the CAEB games <Icon name="arrowR" size={16} />
          </a>
        </div>
      </section>

      <section className="story" aria-labelledby="games">
        <div>
          <h2 id="games" className="section-title">
            The power of games
          </h2>
        </div>
        <div className="prose">
          <p>
            Games turn practice into something students choose to do. They give feedback in a second instead of a week, a reason to try again, and
            small wins that add up. The best learning game is the one a teacher shaped for their own class, in their own language, at their own level.
          </p>
          <p>
            AI is making that far more accessible: a teacher can describe a game and get a first version to adjust, instead of needing to be a
            programmer. DecentralSchool's assistant is optional, and every game it helps make is an ordinary file the teacher owns.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="data">
        <div>
          <h2 id="data" className="section-title">
            AI learns from data, and data has biases
          </h2>
        </div>
        <div className="prose">
          <p>
            The same AI is only as fair as the data it learned from. Data carries the gaps and habits of whoever collected it, and it has to be sorted,
            cleaned and moderated before a model learns from it. Students and teachers need to understand this to use AI well, and to question it.
          </p>
          <p>
            That is why we made <strong>Zo Wants to Learn</strong>. Students feed Zo their own data, find and fix the mistakes in it, split it into
            practice and test, train a real model in the browser, and look at exactly where Zo gets things wrong. Sorting, cleaning and bias are learned
            hands on, as collateral learning that happens while they play.
          </p>
          <a className="btn btn-soft btn-sm" href="#/learn">
            Teach Zo <Icon name="arrowR" size={16} />
          </a>
        </div>
      </section>

      <section className="story" aria-labelledby="code">
        <div>
          <h2 id="code" className="section-title">
            Blocks first, real code when you want it
          </h2>
        </div>
        <div className="prose">
          <p>
            Our <strong>Game Lab</strong> is built on top of Scratch's block language, so students start with blocks they may already know, and Scratch
            projects (.sb3) open here and save back. It also adds what Scratch does not have:
          </p>
          <ul className="check-list">
            {[
              "Every project shown as JavaScript, HTML and CSS, linked line by line to its blocks, so learning doesn't stop at the blocks for students who want to see the real syntax and logic.",
              "A mind map of the whole game: characters, scripts, loops and decisions laid out like an algorithm, so nothing gets lost under other blocks.",
              "Slow-motion and step-by-step debugging.",
              "Offline app files, web projects and Android apps made in the browser.",
              "Teacher challenges, hand-ins and feedback without accounts.",
            ].map((t) => (
              <li key={t}>
                <Icon name="checkCircle" size={22} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="story" aria-labelledby="believe">
        <div>
          <h2 id="believe" className="section-title">
            What we believe
          </h2>
        </div>
        <ul className="belief-grid">
          {BELIEFS.map(([title, text]) => (
            <li key={title} className="belief">
              <Icon name="checkCircle" size={24} />
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="story" id="license" aria-labelledby="license-title">
        <div>
          <h2 id="license-title" className="section-title">
            License
          </h2>
        </div>
        <div className="prose">
          <p>
            DecentralSchool is free software under the <strong>GNU Affero General Public License v3.0</strong>, the same license as Scratch's editor,
            virtual machine and renderer. You may run, study, change and share it; if you run a changed version for others, share your changes under the
            same license.
          </p>
          <p>
            The Game Lab is based on Scratch, made by the Lifelong Kindergarten Group at the MIT Media Lab and the Scratch Foundation. Scratch is a
            trademark of the Scratch Foundation; DecentralSchool is an independent project and is not endorsed by it.
          </p>
          <div className="table-scroll">
            <table className="credits">
              <thead>
                <tr>
                  <th>Uses</th>
                  <th>By</th>
                  <th>License</th>
                </tr>
              </thead>
              <tbody>
                {THIRD_PARTY.map(([what, who, lic]) => (
                  <tr key={what}>
                    <td>{what}</td>
                    <td>{who}</td>
                    <td>{lic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="band mission-band">
        <h2>We advocate for a world where young people get their gratification from creation, not consumption.</h2>
        <div className="toolbar">
          <a className="btn btn-primary" href="#/code">
            Start making
          </a>
          <a className="btn btn-ghost" href="https://decentralschool.org" rel="noopener">
            decentralschool.org
          </a>
        </div>
      </section>
    </div>
  );
}
