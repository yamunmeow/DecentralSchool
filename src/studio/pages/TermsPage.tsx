import { getLang, t, tj } from "../i18n";
import { Icon } from "../ui";
import { PRIVACY_CONTACT } from "./PrivacyPage";

const UPDATED = new Date(2026, 9, 27);

// English; shown through t().
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
          <p className="kicker">{t("Terms")}</p>
          <h1>{t("Terms of use")}</h1>
          <p className="hero-lede">{t("The short version: it's free, what you make is yours, be kind, and there are no guarantees.")}</p>
          <p className="muted">{t("Last updated {date}", { date: UPDATED.toLocaleDateString(getLang() === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) })}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="using">
        <div>
          <h2 id="using" className="section-title">
            {t("Using DecentralSchool")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("DecentralSchool is free. The studio opens once you sign in for free with a Google account, and Google's own rules for that account apply too, including its minimum age. Shared game links, downloaded games and apps play without signing in. By using decentralschool.org you agree to these terms.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="yours">
        <div>
          <h2 id="yours" className="section-title">
            {t("What you make is yours")}
          </h2>
        </div>
        <div className="prose">
          <p>
            {tj("Games, Game Lab projects, Zo's models and class work belong to whoever made them. We don't get a copy, unless you submit a game to the Wall of Fame: they're saved on your device, so we can't recover them if they're lost. Use {backup} now and then.", {
              backup: <strong>{t("Settings → Back up")}</strong>,
            })}
          </p>
          <p>
            {tj("Only put in pictures, sounds and texts you're allowed to use. Games in the library and the templates keep their own credits, listed on the {page}.", {
              page: <a href="#/mission/license">{t("Mission page")}</a>,
            })}
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="fame">
        <div>
          <h2 id="fame" className="section-title">
            {t("The Wall of Fame")}
          </h2>
        </div>
        <div className="prose">
          <p>
            {tj("Teachers can submit games they made. By submitting one, you confirm that you made it, that you may share everything in it, and that it has no students' names, photos or other personal details. You let anyone play, copy and change it under {license}, with the name you typed shown as its maker.", {
              license: (
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                  CC BY 4.0
                </a>
              ),
            })}
          </p>
          <p>{t("We review new games every week and choose the most creative and unique. We may decline a game without giving a reason, or take one down later. Chosen games earn a certificate of appreciation, which you can print from the Wall of Fame page. You can withdraw your game at any time; copies others already made stay theirs under the licence.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="kind">
        <div>
          <h2 id="kind" className="section-title">
            {t("Be kind")}
          </h2>
        </div>
        <div className="prose">
          <p>
            <strong>{t("Don't use DecentralSchool for:")}</strong>
          </p>
          <ul className="check-list">
            {NOT_OK.map((item) => (
              <li key={item}>
                <Icon name="close" size={22} />
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="story" aria-labelledby="accounts">
        <div>
          <h2 id="accounts" className="section-title">
            {t("Accounts")}
          </h2>
        </div>
        <div className="prose">
          <p>
            {tj("One account per person. Keep your Google account safe, since that's how you sign in here (for free). You can delete your account any time in {path}. We may close an account that breaks these terms.", {
              path: <strong>{t("Settings → Account")}</strong>,
            })}
          </p>
          <p>{tj("What we keep about you, and what we don't, is on the {page}.", { page: <a href="#/privacy">{t("privacy page")}</a> })}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="ai">
        <div>
          <h2 id="ai" className="section-title">
            {t("AI and other services")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("The AI assistant is optional and uses the teacher's own OpenRouter account, under OpenRouter's terms. AI gets things wrong, so check what it makes before using it with a class. The randomizer's trivia and word questions come from outside sources and can contain mistakes too.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="code">
        <div>
          <h2 id="code" className="section-title">
            {t("The software")}
          </h2>
        </div>
        <div className="prose">
          <p>
            {tj("DecentralSchool's code is free software under the {license}. You may run, study, change and share it. If you run a changed version for others, share your changes under the same license. These terms are about using decentralschool.org; the license is about the code.", {
              license: <a href="#/mission/license">GNU AGPL-3.0</a>,
            })}
          </p>
        </div>
      </section>

      <section className="story" aria-labelledby="warranty">
        <div>
          <h2 id="warranty" className="section-title">
            {t("No guarantees")}
          </h2>
        </div>
        <div className="prose">
          <p>{t("DecentralSchool is offered as it is, for free. It may have bugs, change, or be unavailable at times. We try hard to keep it working and your work safe, but we can't promise it. As far as the law allows, we aren't responsible for lost work or other harm from using it, so keep backups of anything important.")}</p>
        </div>
      </section>

      <section className="story" aria-labelledby="changes">
        <div>
          <h2 id="changes" className="section-title">
            {t("Changes and questions")}
          </h2>
        </div>
        <div className="prose">
          <p>{tj("If these terms change, the date at the top changes too. Questions: {email}.", { email: <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a> })}</p>
        </div>
      </section>
    </div>
  );
}
