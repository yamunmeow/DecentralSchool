import type { QuizGame } from "../../shared/types";
import { RandomizerButtons } from "../random/Randomizer";
import { Section } from "./common";
import { QuestionList } from "./QuestionList";

export function QuizEditor({ game, onChange }: { game: QuizGame; onChange: (g: QuizGame) => void }) {
  return (
    <Section
      title="Questions"
      count={`${game.questions.length} · ${Math.min(game.settings.round, game.questions.length)} per round`}
      actions={<RandomizerButtons gameId={game.id} questions={game.questions} onChange={(questions) => onChange({ ...game, questions })} />}
    >
      <QuestionList questions={game.questions} onChange={(questions) => onChange({ ...game, questions })} generate={{ template: "quiz" }} />
    </Section>
  );
}
