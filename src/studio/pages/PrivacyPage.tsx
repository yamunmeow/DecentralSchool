import { Icon } from "../ui";

export const PRIVACY_CONTACT = "privacy@decentralschool.org";
const UPDATED = "27 October 2026";

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
  "Your games, projects, class work or Zo's models. Those stay on your device.",
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
          <p className="kicker">Privacy</p>
          <h1>What we collect, and what we don't</h1>
          <p className="hero-lede">Most of DecentralSchool works without sending anything anywhere. This page lists everything that does.</p>
          <p className="muted">Last updated {UPDATED}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="device">
        <div>
          <h2 id="device" className="section-title">
            On your device
          </h2>
        </div>
        <div className="prose">
          <p>
            Your games, Game Lab projects, Zo's models, challenges, hand-ins and feedback are saved in
            this browser, on your device. So are your settings: student or teacher, your name, the theme, the AI key and the app signing key. We never see
            any of it.
          </p>
          <p>
            Game links carry the game after the <code>#</code> in the address. Browsers never send that part to a server, so a shared game doesn't pass
            through us either.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="account">
        <div>
          <h2 id="account" className="section-title">
            Your account
          </h2>
        </div>
        <div className="prose">
          <p>
            The studio opens once you sign in with Google. We only ask Google for your basic profile and email address, and we keep:
          </p>
          <div className="table-scroll">
            <table className="credits">
              <thead>
                <tr>
                  <th>What</th>
                  <th>Why</th>
                  <th>From</th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNT_DATA.map(([what, why, from]) => (
                  <tr key={what}>
                    <td>{what}</td>
                    <td>{why}</td>
                    <td>{from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>We don't keep:</strong>
          </p>
          <ul className="check-list">
            {NOT_KEPT.map((t) => (
              <li key={t}>
                <Icon name="checkCircle" size={22} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p>Your name and email are also saved in your browser, so the studio still knows who you are when you're offline.</p>
        </div>
      </section>

      <section className="story" aria-labelledby="cookies">
        <div>
          <h2 id="cookies" className="section-title">
            Cookies
          </h2>
        </div>
        <div className="prose">
          <p>There are no cookies until you sign in. Then there are these, and only these:</p>
          <div className="table-scroll">
            <table className="credits">
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>What it's for</th>
                  <th>Lasts</th>
                </tr>
              </thead>
              <tbody>
                {COOKIES.map(([name, what, lasts]) => (
                  <tr key={name}>
                    <td>
                      <code>{name}</code>
                    </td>
                    <td>{what}</td>
                    <td>{lasts}</td>
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
            Other services
          </h2>
        </div>
        <div className="prose">
          <div className="table-scroll">
            <table className="credits">
              <thead>
                <tr>
                  <th>Who</th>
                  <th>What they get</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {SERVICES.map(([who, what, when]) => (
                  <tr key={who}>
                    <td>{who}</td>
                    <td>{what}</td>
                    <td>{when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Each of these has its own privacy policy.</p>
        </div>
      </section>

      <section className="story" aria-labelledby="never">
        <div>
          <h2 id="never" className="section-title">
            What we never do
          </h2>
        </div>
        <ul className="check-list prose">
          {NEVER.map((t) => (
            <li key={t}>
              <Icon name="checkCircle" size={22} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="story" aria-labelledby="delete">
        <div>
          <h2 id="delete" className="section-title">
            How long we keep it
          </h2>
        </div>
        <div className="prose">
          <p>
            Your account stays until you delete it. A sign-in session ends when you sign out, or after 30 days without visiting.
          </p>
          <p>
            <strong>Settings → Account → Delete account</strong> removes your name, email and sessions straight away. Cloudflare keeps a recovery copy of
            the database for 7 days, so after that it's gone completely. Games on your device are yours to delete in the studio or by clearing your
            browser's data for this site.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="children">
        <div>
          <h2 id="children" className="section-title">
            Children
          </h2>
        </div>
        <div className="prose">
          <p>
            Students sign in with a Google account, such as one from their school or one a parent manages; Google sets its own minimum age. Shared
            game links, downloaded games and apps play without signing in. A parent or school that
            wants a child's account removed can write to us.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="contact">
        <div>
          <h2 id="contact" className="section-title">
            Questions and requests
          </h2>
        </div>
        <div className="prose">
          <p>
            To ask what we hold about you, correct it or delete it, write to <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>. If this page
            changes, the date at the top changes too.
          </p>
          <p>
            DecentralSchool is open source, so the code that does all of this can be read by anyone. See the <a href="#/mission/license">license</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
