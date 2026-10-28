import { getLang, t, tj } from "../i18n";
import { Icon } from "../ui";

export const PRIVACY_CONTACT = "privacy@decentralschool.org";
const UPDATED = new Date(2026, 9, 27);

// The tables are English; their cells are shown through t().
const ACCOUNT_DATA = [
  ["Your name", "To greet you and to put on your hand-ins and feedback", "Google"],
  ["Your email address", "To recognise your account when you sign in again", "Google"],
  ["Whether Google has confirmed that email", "So nobody can take over your account with someone else's address", "Google"],
  ["The account number Google gives us for you", "To know it's you next time", "Google"],
  ["When the account was made and last changed", "Housekeeping", "Us"],
  ["A sign-in session: a random code and when it runs out", "To keep you signed in on this device", "Us"],
] as const;

const NOT_KEPT = [
  "Passwords. There are none: Google checks who you are.",
  "Your profile photo.",
  "Your IP address or what device you use, in our database.",
  "Google access keys. They're thrown away at sign-in, so we can't read your email, files, calendar or contacts.",
  "Your games, projects, class work or Zo's models. Those stay on your device, unless you submit a game to the Wall of Fame.",
];

const COOKIES = [
  ["better-auth.session_token", "Keeps you signed in", "30 days, or until you sign out"],
  ["better-auth.session_data", "A signed copy of your session, so the site doesn't ask the database on every visit", "5 minutes"],
  ["better-auth.oauth_state", "Only while you're on Google's sign-in page, to finish signing in safely", "Minutes"],
] as const;

const SERVICES = [
  [
    "Cloudflare",
    "Hosts this website and the account database, which is kept in Western Europe. Like any web host it handles your IP address to deliver pages and block attacks. We haven't switched on Cloudflare's visitor analytics.",
    "Always",
  ],
  ["Google", "Learns that you signed in to DecentralSchool, and sends us your name and email.", "When you sign in"],
  [
    "OpenRouter and the AI model it picks",
    "Receive what a teacher types to the assistant and the game being made. The AI key is kept in the teacher's browser; we never see it.",
    "Only if a teacher connects the AI assistant",
  ],
  ["Open Trivia Database, Datamuse", "Receive the topic you asked for, and your IP address, like any website you visit.", "Only when the randomizer fetches new trivia or word questions"],
] as const;

const NEVER = ["Show ads", "Sell or share your data", "Track you across websites or use analytics", "Train AI on your data", "Send you emails"];

export function PrivacyPage() {
  return (
    <div className="page mission privacy">
      <section className="hero mission-hero">
        <div className="hero-text">
          <p className="kicker">{t("Privacy")}</p>
          <h1>{t("What we collect, and what we don't")}</h1>
          <p className="hero-lede">{t("Most of DecentralSchool works without sending anything anywhere. This page lists everything that does.")}</p>
          <p className="muted">{t("Last updated {date}", { date: UPDATED.toLocaleDateString(getLang() === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) })}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="device">
        <div>
          <h2 id="device" className="section-title">
            {t("On your device")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("Your games, Game Lab projects, Zo's models, challenges, hand-ins and feedback are saved in this browser, on your device. So are your settings: student or teacher, your name, the theme, the AI key and the app signing key. We never see any of it, except a game you choose to submit to the Wall of Fame (see below).")}</p>
          <p>{tj("Game links carry the game after the {hash} in the address. Browsers never send that part to a server, so a shared game doesn't pass through us either.", { hash: <code>#</code> })}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="account">
        <div>
          <h2 id="account" className="section-title">
            {t("Your account")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("The studio opens once you sign in for free with Google. We only ask Google for your basic profile and email address, and we keep:")}</p>
          <div className="table-scroll">
            <table className="credits">
              <thead>
                <tr>
                  <th>{t("What")}</th>
                  <th>{t("Why")}</th>
                  <th>{t("From")}</th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNT_DATA.map(([what, why, from]) => (
                  <tr key={what}>
                    <td>{t(what)}</td>
                    <td>{t(why)}</td>
                    <td>{t(from)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>{t("We don't keep:")}</strong>
          </p>
          <ul className="check-list">
            {NOT_KEPT.map((item) => (
              <li key={item}>
                <Icon name="checkCircle" size={22} />
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
          <p>{t("Your name and email are also saved in your browser, so the studio still knows who you are when you're offline.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="fame">
        <div>
          <h2 id="fame" className="section-title">
            {t("Wall of Fame")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("When you submit a game, we keep the game itself, the title, what makes it special, the name and school you typed, your note to the reviewers, the date, and which account sent it. Before it leaves your device, the studio takes out class work, feedback and app-signing details.")}</p>
          <p>{t("Our reviewers see all of that, plus your account's name and email, so they can contact you. If the game is chosen, everyone signed in to DecentralSchool can play and copy it and see the name and school you typed, but not your email or your note.")}</p>
          <p>{t("It stays until you withdraw it on the Wall of Fame page or delete your account, and both remove it straight away.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="cookies">
        <div>
          <h2 id="cookies" className="section-title">
            {t("Cookies")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("There are no cookies until you sign in. Then there are these, and only these:")}</p>
          <div className="table-scroll">
            <table className="credits">
              <thead>
                <tr>
                  <th>{t("Cookie")}</th>
                  <th>{t("What it's for")}</th>
                  <th>{t("Lasts")}</th>
                </tr>
              </thead>
              <tbody>
                {COOKIES.map(([name, what, lasts]) => (
                  <tr key={name}>
                    <td>
                      <code>{name}</code>
                    </td>
                    <td>{t(what)}</td>
                    <td>{t(lasts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="story" aria-labelledby="services">
        <div>
          <h2 id="services" className="section-title">
            {t("Other services")}
          </h2>
        </div>
        <div className="prose">
          <div className="table-scroll">
            <table className="credits">
              <thead>
                <tr>
                  <th>{t("Who")}</th>
                  <th>{t("What they get")}</th>
                  <th>{t("When")}</th>
                </tr>
              </thead>
              <tbody>
                {SERVICES.map(([who, what, when]) => (
                  <tr key={who}>
                    <td>{t(who)}</td>
                    <td>{t(what)}</td>
                    <td>{t(when)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>{t("Each of these has its own privacy policy.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="never">
        <div>
          <h2 id="never" className="section-title">
            {t("What we never do")}
          </h2>
        </div>
        <ul className="check-list prose">
          {NEVER.map((item) => (
            <li key={item}>
              <Icon name="checkCircle" size={22} />
              <span>{t(item)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="story" aria-labelledby="delete">
        <div>
          <h2 id="delete" className="section-title">
            {t("How long we keep it")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("Your account stays until you delete it. A sign-in session ends when you sign out, or after 30 days without visiting.")}</p>
          <p>
            {tj("{path} removes your name, email, sessions and Wall of Fame submissions straight away. Cloudflare keeps a recovery copy of the database for 7 days, so after that it's gone completely. Games on your device are yours to delete in the studio or by clearing your browser's data for this site.", {
              path: <strong>{t("Settings → Account → Delete account")}</strong>,
            })}
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="children">
        <div>
          <h2 id="children" className="section-title">
            {t("Children")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("Students sign in for free with a Google account, such as one from their school or one a parent manages; Google sets its own minimum age. Shared game links, downloaded games and apps play without signing in. A parent or school that wants a child's account removed can write to us.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="contact">
        <div>
          <h2 id="contact" className="section-title">
            {t("Questions and requests")}
          </h2>
        </div>
        <div className="prose">
          <p>{tj("To ask what we hold about you, correct it or delete it, write to {email}. If this page changes, the date at the top changes too.", { email: <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a> })}</p>
          <p>{tj("DecentralSchool is open source, so the code that does all of this can be read by anyone. See the {license}.", { license: <a href="#/mission/license">{t("license")}</a> })}</p>
        </div>
      </section>
    </div>
  );
}
