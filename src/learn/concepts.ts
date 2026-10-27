import type { LearnMode } from "./types";

/** The six steps, the Zo who guides each one, the quiz questions and the badges. */

export type Step = "feed" | "clean" | "split" | "train" | "test" | "use";

export const STEPS: { id: Step; name: string; zo: string }[] = [
  { id: "feed", name: "Feed", zo: "baby" },
  { id: "clean", name: "Clean", zo: "detective" },
  { id: "split", name: "Split", zo: "chef" },
  { id: "train", name: "Train", zo: "student" },
  { id: "test", name: "Test", zo: "teacher" },
  { id: "use", name: "Use", zo: "graduate" },
];

export const MODES: { id: LearnMode; name: string; blurb: string; zo: string }[] = [
  { id: "sort", name: "Sort", blurb: "Text → a label", zo: "detective" },
  { id: "reply", name: "Reply", blurb: "Question → answer", zo: "teacher" },
  { id: "write", name: "Write", blurb: "Text → more text", zo: "artist" },
  { id: "predict", name: "Predict", blurb: "Number → number", zo: "scientist" },
];

export interface Question {
  id: string;
  step: Step;
  modes?: LearnMode[];
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export const QUESTIONS: Question[] = [
  {
    id: "many",
    step: "feed",
    q: "Why does Zo need lots of different examples?",
    options: ["So the file looks bigger", "So it can find what the examples have in common", "It doesn't: one example is enough"],
    answer: 1,
    explain: "A pattern only shows up across many examples. With one, Zo can only copy.",
  },
  {
    id: "clash",
    step: "clean",
    modes: ["sort", "reply"],
    q: "The same sentence is labelled “happy” in one row and “sad” in another. What does Zo learn?",
    options: ["Both, which makes it extra clever", "Nothing, Zo skips it", "Mixed signals: it gets pulled both ways"],
    answer: 2,
    explain: "Contradicting labels pull Zo's weights in opposite directions. Clean data, clear lesson.",
  },
  {
    id: "outlier",
    step: "clean",
    modes: ["predict"],
    q: "One student studied 3 hours and got 5 marks, far from everyone else. What should you do first?",
    options: ["Check it: maybe it's a typo for 50", "Delete it straight away", "Copy it ten times so Zo notices"],
    answer: 0,
    explain: "Outliers can be mistakes or rare real cases. Check before you delete.",
  },
  {
    id: "privacy",
    step: "clean",
    modes: ["write"],
    q: "Why take emails and phone numbers out of the training text?",
    options: ["They make Zo slower", "Models can repeat what they were trained on", "Zo can't read numbers"],
    answer: 1,
    explain: "Language models can repeat bits of their training text word for word, private details too.",
  },
  {
    id: "fair-test",
    step: "split",
    q: "Why is Zo tested on examples it never practised on?",
    options: ["To see if it learned the pattern, not just the answers", "Practice examples get used up", "To make the test harder for fun"],
    answer: 0,
    explain: "Testing on practice examples is like marking a test that came with its answers.",
  },
  {
    id: "overfit",
    step: "train",
    modes: ["sort", "reply", "predict"],
    q: "Zo's practice mistakes keep going down, but its test mistakes start going up. What's happening?",
    options: ["Zo is getting smarter", "Zo is memorising the practice examples", "The test examples are broken"],
    answer: 1,
    explain: "That's overfitting: learning the examples instead of the pattern. Stop earlier or keep Zo simple.",
  },
  {
    id: "context",
    step: "train",
    modes: ["write"],
    q: "Zo looks back 3 words and starts writing whole sentences from the story. Why?",
    options: ["Zo has become a great writer", "3-word phrases are rare in a short text, so Zo copies the ones it saw", "The story is too easy"],
    answer: 1,
    explain: "Long contexts need a lot of text. With a little, Zo memorises instead of learning to write.",
  },
  {
    id: "score",
    step: "test",
    modes: ["sort", "reply"],
    q: "Zo gets 90% right on the test. What does that mean?",
    options: ["Zo will be 90% right on anything", "Zo is always right", "About 1 in 10 test examples were wrong"],
    answer: 2,
    explain: "A test score only tells you about examples like the test ones. New kinds of text can trip Zo up.",
  },
  {
    id: "miss",
    step: "test",
    modes: ["predict"],
    q: "Zo's average miss on the test is 6 marks. What does that mean?",
    options: ["Zo's guesses are usually about 6 marks off", "Zo got 6 answers wrong", "Zo is 6% wrong"],
    answer: 0,
    explain: "The average miss is in the same units as what you predict: here, marks.",
  },
  {
    id: "temperature",
    step: "test",
    modes: ["write"],
    q: "What happens when you turn Zo's creativity (temperature) right up?",
    options: ["Zo writes more correct sentences", "Zo picks unlikely words more often", "Zo writes faster"],
    answer: 1,
    explain: "Temperature flattens the chances, so rare words get picked more: more surprising, less sensible.",
  },
  {
    id: "wrong",
    step: "use",
    q: "Someone uses your Zo app and it gives a wrong answer. What should you do?",
    options: ["Add better examples and train again", "Nothing: AI is always right", "Delete the test examples"],
    answer: 0,
    explain: "Every AI makes mistakes. Better and more varied data is the main fix.",
  },
];

export const questionsFor = (step: Step, mode: LearnMode) => QUESTIONS.filter((q) => q.step === step && (!q.modes || q.modes.includes(mode)));

export interface Badge {
  id: string;
  name: string;
  how: string;
  zo: string;
}

export const BADGES: Badge[] = [
  { id: "fed", name: "First bite", how: "Feed Zo 10 examples", zo: "baby" },
  { id: "detective", name: "Data detective", how: "Fix every problem in the data", zo: "detective" },
  { id: "split", name: "Fair test", how: "Keep some examples for the test", zo: "chef" },
  { id: "trained", name: "First lesson", how: "Train Zo", zo: "student" },
  { id: "scientist", name: "Experimenter", how: "Try 3 different settings", zo: "scientist" },
  { id: "overfit", name: "Memory spotter", how: "Catch Zo memorising", zo: "explorer" },
  { id: "examiner", name: "Examiner", how: "Try Zo on your own example", zo: "teacher" },
  { id: "graduate", name: "Graduate", how: "Pass the test", zo: "graduate" },
  { id: "quiz", name: "Quiz whiz", how: "Answer every question right", zo: "wizard" },
  { id: "card", name: "Honest maker", how: "Fill in the model card", zo: "royal" },
  { id: "shipped", name: "Ready to fly", how: "Save Zo as an app", zo: "pilot" },
];
