import { Icon } from "../ui";
import { PRIVACY_CONTACT } from "./PrivacyPage";

const UPDATED = "27 October 2026";

const NOT_OK = [
  "Games that bully, harass or frighten people, or that are hateful, sexual or violent in a way that isn't right for school.",
  "Anything that breaks the law, or uses other people's work in a way you're not allowed to.",
  "Trying to break or overload the site, or to get into someone else's account.",
  "Pretending to be someone else.",
];

export function TermsPage() {
  return (
    <div className="page mission privacy">
      <section className="hero mission-hero">
        <div className="hero-text">
          <p className="kicker">Terms</p>
          <h1>Terms of use</h1>
          <p className="hero-lede">The short version: it's free, what you make is yours, be kind, and there are no guarantees.</p>
          <p className="muted">Last updated {UPDATED}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="using">
        <div>
          <h2 id="using" className="section-title">
            Using DecentralSchool
          </h2>
        </div>
        <div className="prose">
          <p>
            DecentralSchool is free. The studio opens once you sign in for free with a Google account, and Google's own rules for that account apply too,
            including its minimum age. Shared game links, downloaded games and apps play without signing in. By using decentralschool.org you agree to
            these terms.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="yours">
        <div>
          <h2 id="yours" className="section-title">
            What you make is yours
          </h2>
        </div>
        <div className="prose">
          <p>
            Games, Game Lab projects, Zo's models and class work belong to whoever made them. We don't get a copy: they're saved on your device, so we
            can't recover them if they're lost. Use <strong>Settings → Back up</strong> now and then.
          </p>
          <p>
            Only put in pictures, sounds and texts you're allowed to use. Games in the library and the templates keep their own credits, listed on the{" "}
            <a href="#/mission/license">Mission page</a>.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="kind">
        <div>
          <h2 id="kind" className="section-title">
            Be kind
          </h2>
        </div>
        <div className="prose">
          <p>
            <strong>Don't use DecentralSchool for:</strong>
          </p>
          <ul className="check-list">
            {NOT_OK.map((t) => (
              <li key={t}>
                <Icon name="close" size={22} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="story" aria-labelledby="accounts">
        <div>
          <h2 id="accounts" className="section-title">
            Accounts
          </h2>
        </div>
        <div className="prose">
          <p>
            One account per person. Keep your Google account safe, since that's how you sign in here (for free). You can delete your account any time
            in <strong>Settings → Account</strong>. We may close an account that breaks these terms.
          </p>
          <p>
            What we keep about you, and what we don't, is on the <a href="#/privacy">privacy page</a>.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="ai">
        <div>
          <h2 id="ai" className="section-title">
            AI and other services
          </h2>
        </div>
        <div className="prose">
          <p>
            The AI assistant is optional and uses the teacher's own OpenRouter account, under OpenRouter's terms. AI gets things wrong, so check what it
            makes before using it with a class. The randomizer's trivia and word questions come from outside sources and can contain mistakes too.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="code">
        <div>
          <h2 id="code" className="section-title">
            The software
          </h2>
        </div>
        <div className="prose">
          <p>
            DecentralSchool's code is free software under the <a href="#/mission/license">GNU AGPL-3.0</a>. You may run, study, change and share it. If
            you run a changed version for others, share your changes under the same license. These terms are about using decentralschool.org; the
            license is about the code.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="warranty">
        <div>
          <h2 id="warranty" className="section-title">
            No guarantees
          </h2>
        </div>
        <div className="prose">
          <p>
            DecentralSchool is offered as it is, for free. It may have bugs, change, or be unavailable at times. We try hard to keep it working and your
            work safe, but we can't promise it. As far as the law allows, we aren't responsible for lost work or other harm from using it, so keep
            backups of anything important.
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="changes">
        <div>
          <h2 id="changes" className="section-title">
            Changes and questions
          </h2>
        </div>
        <div className="prose">
          <p>
            If these terms change, the date at the top changes too. Questions: <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
