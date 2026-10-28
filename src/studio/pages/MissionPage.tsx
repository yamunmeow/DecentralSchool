import { useEffect } from "react";
import { ZoPic } from "../learn/Zo";
import { useRoute } from "../store";
import { t, tj } from "../i18n";
import { Icon } from "../ui";

// English; shown through t().
const BELIEFS = [
  ["Works offline", "After the first visit, the games, the Game Lab, Zo and the Android app builder work without the internet."],
  ["Small models", "Zo's models are small. They train and run in the browser, on the student's own device."],
  ["Work stays on your device", "Signing in with Google is free and keeps only your name and email. Games, class work and models are saved in your browser, not on our server."],
  ["Free and open source", "The code is under the GNU AGPL-3.0. Anyone can run it, read it, change it and share it."],
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
          <p className="kicker">{t("About")}</p>
          <h1>{t("DecentralSchool is a free tool for making learning games that work offline.")}</h1>
          <p className="hero-lede">{t("Teachers and students use it to make quizzes and small games, play them in a browser, and share them as a link, a file or an Android app.")}</p>
          <div className="toolbar">
            <a className="btn btn-primary" href="#/code">
              <Icon name="plus" size={18} /> {t("Make a game")}
            </a>
            <a className="btn btn-ghost" href="#/play">
              <Icon name="play" size={18} /> {t("Play now")}
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
            {t("How we started")}
          </h2>
        </div>
        <div className="prose">
          <p>
            {tj("We started DecentralSchool after meeting an English teacher at the {caeb}, the {council} (Benin Council for Educational Activities), in {town}.", {
              caeb: <strong>CAEB</strong>,
              council: <em>Conseil des Activités Éducatives du Bénin</em>,
              town: <strong>{t("Porto-Novo, Benin")}</strong>,
            })}
          </p>
          <p>{t("He wanted to make his own games and quizzes for his lessons. He wanted his students to install the games at the CAEB and practise English at home, without needing the internet.")}</p>
          <p>
            {tj("Three games from the CAEB are included: {a}, {b} and {c}. You can play them in the browser, copy and change them, or turn them into an Android app.", {
              a: <strong>{t("Word Quest")}</strong>,
              b: <strong>{t("Reading Quest")}</strong>,
              c: <strong>{t("Math Quest")}</strong>,
            })}
          </p>
          <a className="btn btn-soft btn-sm" href="#/play">
            {t("Play the CAEB games")} <Icon name="arrowR" size={16} />
          </a>
        </div>
      </section>

      <section className="story" aria-labelledby="games">
        <div>
          <h2 id="games" className="section-title">
            {t("Making a game")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("A teacher can start from a template, upload a lesson file, or describe a game to the AI assistant and edit the first version it makes. The assistant is optional. Every game is a normal file that the teacher keeps.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="data">
        <div>
          <h2 id="data" className="section-title">
            {t("Zo Wants to Learn")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("AI models learn from data. If the data has mistakes or gaps, the model learns those too.")}</p>
          <p>
            {tj("In {zo}, students add their own data, fix the mistakes in it, split it into practice and test sets, train a small model in the browser, and see where the model gets things wrong.", {
              zo: <strong>{t("Zo Wants to Learn")}</strong>,
            })}
          </p>
          <a className="btn btn-soft btn-sm" href="#/learn">
            {t("Teach Zo")} <Icon name="arrowR" size={16} />
          </a>
        </div>
      </section>

      <section className="story" aria-labelledby="code">
        <div>
          <h2 id="code" className="section-title">
            {t("Game Lab")}
          </h2>
        </div>
        <div className="prose">
          <p>{tj("The {lab} uses Scratch's block language. Scratch projects (.sb3) open here and can be saved back as .sb3. It also has:", { lab: <strong>{t("Game Lab")}</strong> })}</p>
          <ul className="check-list">
            {[
              "The JavaScript, HTML and CSS for each project, linked line by line to its blocks.",
              "A mind map of the game that shows its characters, scripts, loops and decisions.",
              "Slow and step-by-step debugging.",
              "Export as an offline .html file, a web project or an Android app.",
              "Teacher challenges, hand-ins and feedback, sent as files and links.",
            ].map((item) => (
              <li key={item}>
                <Icon name="checkCircle" size={22} />
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="story" aria-labelledby="believe">
        <div>
          <h2 id="believe" className="section-title">
            {t("How it works")}
          </h2>
        </div>
        <ul className="belief-grid">
          {BELIEFS.map(([title, text]) => (
            <li key={title} className="belief">
              <Icon name="checkCircle" size={24} />
              <strong>{t(title)}</strong>
              <span>{t(text)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="story" id="license" aria-labelledby="license-title">
        <div>
          <h2 id="license-title" className="section-title">
            {t("License")}
          </h2>
        </div>
        <div className="prose">
          <p>
            {tj("DecentralSchool is free software under the {license}, the same license as Scratch's editor, virtual machine and renderer. You may run, study, change and share it. If you run a changed version for others, share your changes under the same license.", {
              license: <strong>GNU Affero General Public License v3.0</strong>,
            })}
          </p>
          <p>{t("The Game Lab is based on Scratch, made by the Lifelong Kindergarten Group at the MIT Media Lab and the Scratch Foundation. Scratch is a trademark of the Scratch Foundation. DecentralSchool is an independent project and is not endorsed by it.")}</p>
          <div className="table-scroll">
            <table className="credits">
              <thead>
                <tr>
                  <th>{t("Uses")}</th>
                  <th>{t("By")}</th>
                  <th>{t("License")}</th>
                </tr>
              </thead>
              <tbody>
                {THIRD_PARTY.map(([what, who, lic]) => (
                  <tr key={what}>
                    <td>{t(what)}</td>
                    <td>{t(who)}</td>
                    <td>{lic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="band mission-band">
        <h2>{t("Make a game and share it with your class.")}</h2>
        <div className="toolbar">
          <a className="btn btn-primary" href="#/code">
            {t("Open the Game Lab")}
          </a>
          <a className="btn btn-ghost" href="https://decentralschool.org" rel="noopener">
            decentralschool.org
          </a>
        </div>
      </section>
    </div>
  );
}
