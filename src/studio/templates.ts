import { DEFAULT_SETTINGS, normalize } from "../shared/normalize";
import type { Game, Template, Tint } from "../shared/types";

export interface Starter {
  title: string;
  make: () => Partial<Game> & { template: Template };
}

export interface TemplateInfo {
  id: Template;
  name: string;
  emoji: string;
  tint: Tint;
  blurb: string;
  starters: Starter[];
}

const settings = (patch: Partial<typeof DEFAULT_SETTINGS> = {}) => ({ ...DEFAULT_SETTINGS, ...patch });

export const TEMPLATE_INFO: TemplateInfo[] = [
  {
    id: "quiz",
    name: "Quiz",
    emoji: "❓",
    tint: "lilac",
    blurb: "Multiple choice, true/false, short answers, ordering and matching.",
    starters: [
      {
        title: "Our Solar System",
        make: () => ({
          template: "quiz",
          title: "Our Solar System",
          subtitle: "How well do you know the planets?",
          emoji: "🪐",
          tint: "sky",
          settings: settings({ round: 8 }),
          questions: [
            { type: "mcq", q: "Which planet is closest to the Sun?", options: ["Mercury", "Venus", "Earth", "Mars"], answer: 0 },
            { type: "mcq", q: "Which is the largest planet?", options: ["Saturn", "Jupiter", "Neptune", "Earth"], answer: 1, explain: "Jupiter is more than twice as massive as all the other planets together." },
            { type: "tf", q: "The Sun is a star.", answer: true },
            { type: "tf", q: "Mars is called the Blue Planet.", answer: false, explain: "Mars is the Red Planet. Earth is often called the Blue Planet." },
            { type: "short", q: "How many planets are in our Solar System?", accept: ["8", "eight"] },
            { type: "mcq", q: "What do we call a rock from space that lands on Earth?", options: ["Comet", "Meteorite", "Moon", "Star"], answer: 1 },
            { type: "order", q: "Put these planets in order, starting nearest the Sun.", items: ["Mercury", "Venus", "Earth", "Mars"] },
            { type: "match", q: "Match each planet to a fact.", pairs: [["Saturn", "Has bright rings"], ["Mars", "The Red Planet"], ["Earth", "Has liquid water on its surface"], ["Jupiter", "The largest planet"]] },
            { type: "mcq", q: "What does the Moon travel around?", options: ["The Sun", "Mars", "Earth", "Jupiter"], answer: 2 },
            { type: "tf", q: "Earth takes about 365 days to travel around the Sun.", answer: true },
            { type: "mcq", q: "Which planet is famous for its Great Red Spot, a giant storm?", options: ["Venus", "Jupiter", "Uranus", "Mercury"], answer: 1 },
            { type: "short", q: "What is the name of the force that keeps planets in orbit?", accept: ["gravity"] },
          ],
        }),
      },
    ],
  },
  {
    id: "math",
    name: "Maths",
    emoji: "➗",
    tint: "mint",
    blurb: "New problems every round: tables, fractions, algebra, time and more.",
    starters: [
      {
        title: "Times tables 2–10",
        make: () => ({
          template: "math",
          title: "Times Tables Race",
          emoji: "✖️",
          tint: "mint",
          settings: settings({ round: 15, timer: 15 }),
          answer: "type",
          sets: [
            { kind: "mul", min: 2, max: 10, weight: 3 },
            { kind: "div", min: 2, max: 10, weight: 1 },
          ],
          questions: [],
        }),
      },
      {
        title: "Fractions",
        make: () => ({
          template: "math",
          title: "Fraction Friends",
          emoji: "🍕",
          tint: "peach",
          settings: settings({ round: 10 }),
          answer: "choose",
          sets: [
            { kind: "frac-of", min: 1, max: 10, weight: 1 },
            { kind: "frac-simplify", min: 2, max: 12, weight: 1 },
            { kind: "frac-add", min: 2, max: 10, weight: 1 },
          ],
          questions: [],
        }),
      },
      {
        title: "Mental maths mix",
        make: () => ({
          template: "math",
          title: "Mental Maths Mix",
          emoji: "🧠",
          tint: "lemon",
          settings: settings({ round: 12, lives: 3 }),
          answer: "type",
          sets: [
            { kind: "add", min: 10, max: 99, weight: 2 },
            { kind: "sub", min: 10, max: 99, weight: 2 },
            { kind: "missing", min: 1, max: 20, weight: 1 },
            { kind: "word", min: 2, max: 30, weight: 1 },
          ],
          questions: [],
        }),
      },
      {
        title: "Solve for x",
        make: () => ({
          template: "math",
          title: "Find x",
          emoji: "🔍",
          tint: "lilac",
          settings: settings({ round: 10 }),
          answer: "type",
          sets: [
            { kind: "linear", min: -10, max: 10, weight: 2 },
            { kind: "order-ops", min: 1, max: 10, weight: 1 },
          ],
          questions: [],
        }),
      },
    ],
  },
  {
    id: "grammar",
    name: "Grammar",
    emoji: "✏️",
    tint: "peach",
    blurb: "Spot the mistake, fill the gap, judge sentences, unscramble words.",
    starters: [
      {
        title: "Present and past tense",
        make: () => ({
          template: "grammar",
          title: "Tense Detective",
          subtitle: "Find and fix the mistakes",
          emoji: "🕵️",
          tint: "peach",
          settings: settings({ round: 10 }),
          items: [
            { type: "fix", text: "She go to school every day.", wrong: "go", right: "goes", options: ["going", "gone"], explain: "With he, she or it, add -s in the present simple." },
            { type: "fix", text: "Yesterday we eat rice and dal.", wrong: "eat", right: "ate", options: ["eaten", "eating"], explain: "Yesterday tells us it is in the past: eat → ate." },
            { type: "fix", text: "My brother don't like milk.", wrong: "don't", right: "doesn't", options: ["not", "isn't"] },
            { type: "fix", text: "They was playing cricket.", wrong: "was", right: "were", options: ["is", "be"], explain: "They → were." },
            { type: "gap", text: "Last week I ___ a letter to my grandmother.", options: ["write", "wrote", "writes"], answer: 1 },
            { type: "gap", text: "The sun ___ in the east.", options: ["rise", "rises", "rised"], answer: 1 },
            { type: "gap", text: "We ___ to the market tomorrow.", options: ["went", "are going", "goes"], answer: 1 },
            { type: "judge", text: "He plays football every Sunday.", correct: true },
            { type: "judge", text: "I seen that film last night.", correct: false, fix: "I saw that film last night." },
            { type: "judge", text: "Does she speak Hindi?", correct: true },
            { type: "unscramble", text: "The children are reading in the library." },
            { type: "unscramble", text: "Did you finish your homework?" },
          ],
        }),
      },
    ],
  },
  {
    id: "vocab",
    name: "Vocabulary",
    emoji: "🔤",
    tint: "sky",
    blurb: "Meanings, gap fills, spelling tiles, listening and matching pairs.",
    starters: [
      {
        title: "Feelings",
        make: () => ({
          template: "vocab",
          title: "Feelings Words",
          emoji: "😊",
          tint: "rose",
          settings: settings({ round: 10, speech: "en-GB" }),
          modes: ["meaning", "word", "gap", "spell", "listen", "opposite", "pairs"],
          words: [
            { word: "happy", meaning: "feeling good and pleased", example: "She was happy to see her friends.", emoji: "😊", opposite: "sad" },
            { word: "angry", meaning: "feeling very upset with someone or something", example: "He was angry when his bike was broken.", emoji: "😠", opposite: "calm" },
            { word: "scared", meaning: "feeling afraid", example: "The kitten was scared of the loud thunder.", emoji: "😨", opposite: "brave" },
            { word: "proud", meaning: "pleased about something you or others did well", example: "Mum was proud of my drawing.", emoji: "🥹" },
            { word: "bored", meaning: "tired because nothing is interesting", example: "I was bored on the long bus ride.", emoji: "🥱", opposite: "excited" },
            { word: "surprised", meaning: "feeling something unexpected happened", example: "We were surprised by the birthday party.", emoji: "😲" },
            { word: "lonely", meaning: "sad because you are alone", example: "The new boy felt lonely at first.", emoji: "😔" },
            { word: "excited", meaning: "very happy about something that will happen", example: "The class was excited about the trip.", emoji: "🤩", opposite: "bored" },
            { word: "nervous", meaning: "a little worried about something", example: "I was nervous before my test.", emoji: "😬", opposite: "relaxed" },
            { word: "calm", meaning: "quiet and peaceful, not worried", example: "The lake was calm in the morning.", emoji: "😌", opposite: "angry" },
          ],
        }),
      },
    ],
  },
  {
    id: "reading",
    name: "Reading",
    emoji: "📖",
    tint: "sage",
    blurb: "Upload or paste a text; it becomes reading, questions, gap fills and ordering.",
    starters: [
      {
        title: "The Thirsty Crow (fable)",
        make: () => ({
          template: "reading",
          title: "The Thirsty Crow",
          subtitle: "Read the fable, then play",
          emoji: "🐦‍⬛",
          tint: "sage",
          settings: settings({ round: 8 }),
          activities: ["questions", "cloze", "sequence", "truefalse", "glossary"],
          passages: [
            {
              title: "The Thirsty Crow",
              text:
                "It was a hot summer day. A crow had been flying for a long time and was very thirsty. He looked everywhere for water, but the rivers and ponds were dry.\n\nAt last he saw a clay pot in a garden. He flew down and looked inside. There was a little water at the bottom, but his beak could not reach it.\n\nThe crow did not give up. He saw some small pebbles on the ground. One by one, he picked them up and dropped them into the pot. Slowly the water rose higher and higher.\n\nSoon the water was near the top. The crow drank happily and flew away. Where there is a will, there is a way.",
              questions: [
                { type: "mcq", q: "Why was the crow looking for water?", options: ["He was thirsty", "He wanted to swim", "He was lost", "He was cold"], answer: 0 },
                { type: "mcq", q: "Where did the crow find water?", options: ["In a river", "In a clay pot", "In a pond", "In a bucket"], answer: 1 },
                { type: "tf", q: "The crow's beak could reach the water at first.", answer: false },
                { type: "mcq", q: "What did the crow drop into the pot?", options: ["Leaves", "Sticks", "Pebbles", "Seeds"], answer: 2 },
                { type: "short", q: "Finish the moral: Where there is a will, there is a …", accept: ["way"] },
                { type: "mcq", q: "Which word best describes the crow?", options: ["Lazy", "Clever", "Angry", "Shy"], answer: 1, explain: "He solved the problem by thinking of the pebbles." },
              ],
              glossary: [
                { word: "thirsty", meaning: "needing something to drink" },
                { word: "pebbles", meaning: "small smooth stones" },
                { word: "beak", meaning: "the hard pointed mouth of a bird" },
                { word: "rose", meaning: "went up" },
              ],
            },
          ],
        }),
      },
    ],
  },
  {
    id: "custom",
    name: "Your own game",
    emoji: "✨",
    tint: "lemon",
    blurb: "Describe any game to the assistant; it writes it from scratch.",
    starters: [
      {
        title: "Pop the even numbers",
        make: () => ({
          template: "custom",
          title: "Pop the Evens",
          emoji: "🎈",
          tint: "lemon",
          settings: settings(),
          html: POP_EVENS,
        }),
      },
    ],
  },
];

export const templateInfo = (id: Template) => TEMPLATE_INFO.find((t) => t.id === id)!;

export function blankGame(template: Template): Game {
  const info = templateInfo(template);
  const base = { template, title: `New ${info.name.toLowerCase()} game`, emoji: info.emoji, tint: info.tint, settings: settings() };
  const extra: Record<Template, object> = {
    quiz: { questions: [] },
    math: { sets: [{ kind: "add", min: 1, max: 20, weight: 1 }], answer: "type", questions: [] },
    grammar: { items: [] },
    vocab: { words: [], modes: ["meaning", "word", "gap", "spell"] },
    reading: { passages: [], activities: ["questions", "cloze", "sequence"] },
    custom: { html: "" },
  };
  return normalize({ ...base, ...extra[template] });
}

export const fromStarter = (s: Starter): Game => normalize(s.make());

const POP_EVENS = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pop the Evens</title>
<style>
  body { margin: 0; font-family: system-ui, sans-serif; background: #fdf8df; color: #3d2f10; height: 100vh; overflow: hidden; user-select: none; }
  header { display: flex; justify-content: space-between; padding: 14px 18px; font-weight: 800; font-size: 20px; }
  #sky { position: absolute; inset: 60px 0 0; }
  .b { position: absolute; width: 74px; height: 88px; border-radius: 50% 50% 46% 46%; display: grid; place-items: center; font-size: 28px; font-weight: 800; color: #fff; border: 0; animation: up linear forwards; }
  .b::after { content: ""; position: absolute; bottom: -14px; left: 36px; width: 2px; height: 16px; background: #87754c; }
  @keyframes up { from { transform: translateY(110vh); } to { transform: translateY(-140px); } }
  #end { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: #fdf8dfee; font-size: 22px; }
  #end button, #start { font: inherit; font-weight: 800; padding: 14px 28px; border-radius: 99px; border: 0; background: #f5b700; color: #3d2f10; }
  #start { position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%); }
</style>
</head>
<body>
<header><span>⭐ <span id="score">0</span></span><span>⏱ <span id="time">40</span></span></header>
<div id="sky"></div>
<button id="start">Pop only the EVEN numbers!</button>
<div id="end"><div>You scored <b id="final">0</b></div><button onclick="start()">Play again</button></div>
<script>
  var colors = ["#a693de", "#80b6dd", "#eba57f", "#70c4a2", "#e693a8"];
  var score = 0, time = 40, spawn, tick;
  var sky = document.getElementById("sky");
  function beep(f) { try { var a = new (window.AudioContext || window.webkitAudioContext)(); var o = a.createOscillator(); o.frequency.value = f; o.connect(a.destination); o.start(); o.stop(a.currentTime + 0.08); } catch (e) {} }
  function balloon() {
    var n = Math.floor(Math.random() * 50) + 1;
    var b = document.createElement("button");
    b.className = "b";
    b.textContent = n;
    b.style.left = Math.random() * (innerWidth - 80) + "px";
    b.style.background = colors[n % colors.length];
    b.style.animationDuration = 4 + Math.random() * 3 + "s";
    b.onclick = function () {
      score += n % 2 === 0 ? 1 : -1;
      beep(n % 2 === 0 ? 880 : 200);
      document.getElementById("score").textContent = score;
      b.remove();
    };
    b.addEventListener("animationend", function () { b.remove(); });
    sky.appendChild(b);
  }
  function start() {
    score = 0; time = 40;
    document.getElementById("score").textContent = 0;
    document.getElementById("start").style.display = "none";
    document.getElementById("end").style.display = "none";
    sky.innerHTML = "";
    spawn = setInterval(balloon, 700);
    tick = setInterval(function () {
      document.getElementById("time").textContent = --time;
      if (time <= 0) {
        clearInterval(spawn); clearInterval(tick);
        document.getElementById("final").textContent = score;
        document.getElementById("end").style.display = "flex";
      }
    }, 1000);
  }
  document.getElementById("start").onclick = start;
</script>
</body>
</html>`;
