import type { QuizGame } from "../../shared/types";
import { RandomizerButtons } from "../random/Randomizer";
import { t } from "../i18n";
import { Section } from "./common";
import { QuestionList } from "./QuestionList";

export function QuizEditor({ game, onChange }: { game: QuizGame; onChange: (g: QuizGame) => void }) {
  return (
    <Section
      title={t("Questions")}
      count={t("{all} · {round} per round", { all: game.questions.length, round: Math.min(game.settings.round, game.questions.length) })}
      actions={<RandomizerButtons gameId={game.id} questions={game.questions} onChange={(questions) => onChange({ ...game, questions })} />}
    >
      <QuestionList questions={game.questions} onChange={(questions) => onChange({ ...game, questions })} generate={{ template: "quiz" }} />
    </Section>
  );
}
