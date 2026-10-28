import type { Template } from "../shared/types";
import { POP_EVENS, settings, type Starter } from "./templates";

/** No line break before ? ! : ; or inside « », except where the player splits words on spaces. */
const typeset = (x: unknown): unknown => {
  if (typeof x === "string") return x.replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
  if (Array.isArray(x)) return x.map(typeset);
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (o.type === "unscramble") return o;
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === "html" ? v : typeset(v)]));
  }
  return x;
};

/** The example games when the studio is in French: the same games, written for French-speaking classes. */
const STARTERS: Record<Template, Starter[]> = {
  quiz: [
    {
      title: "Notre système solaire",
      make: () => ({
        template: "quiz",
        title: "Notre système solaire",
        subtitle: "Connais-tu bien les planètes ?",
        emoji: "🪐",
        tint: "sky",
        settings: settings({ round: 8 }),
        questions: [
          { type: "mcq", q: "Quelle planète est la plus proche du Soleil ?", options: ["Mercure", "Vénus", "la Terre", "Mars"], answer: 0 },
          { type: "mcq", q: "Quelle est la plus grande planète ?", options: ["Saturne", "Jupiter", "Neptune", "la Terre"], answer: 1, explain: "Jupiter a une masse plus de deux fois supérieure à celle de toutes les autres planètes réunies." },
          { type: "tf", q: "Le Soleil est une étoile.", answer: true },
          { type: "tf", q: "On appelle Mars la planète bleue.", answer: false, explain: "Mars est la planète rouge. C'est la Terre que l'on appelle souvent la planète bleue." },
          { type: "short", q: "Combien de planètes compte notre système solaire ?", accept: ["8", "huit"] },
          { type: "mcq", q: "Comment appelle-t-on une roche venue de l'espace qui tombe sur la Terre ?", options: ["une comète", "une météorite", "une lune", "une étoile"], answer: 1 },
          { type: "order", q: "Range ces planètes dans l'ordre, en partant de la plus proche du Soleil.", items: ["Mercure", "Vénus", "la Terre", "Mars"] },
          { type: "match", q: "Relie chaque planète à sa particularité.", pairs: [["Saturne", "Elle a des anneaux brillants"], ["Mars", "La planète rouge"], ["la Terre", "Elle a de l'eau liquide à sa surface"], ["Jupiter", "La plus grande planète"]] },
          { type: "mcq", q: "Autour de quoi la Lune tourne-t-elle ?", options: ["le Soleil", "Mars", "la Terre", "Jupiter"], answer: 2 },
          { type: "tf", q: "La Terre met environ 365 jours pour faire le tour du Soleil.", answer: true },
          { type: "mcq", q: "Quelle planète est célèbre pour sa Grande Tache rouge, une tempête géante ?", options: ["Vénus", "Jupiter", "Uranus", "Mercure"], answer: 1 },
          { type: "short", q: "Comment s'appelle la force qui maintient les planètes sur leur orbite ?", accept: ["la gravité", "gravité", "la gravitation", "gravitation", "l'attraction"] },
        ],
      }),
    },
  ],
  math: [
    {
      title: "Tables de multiplication de 2 à 10",
      make: () => ({
        template: "math",
        title: "La course aux tables",
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
        title: "Les amies fractions",
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
      title: "Calcul mental",
      make: () => ({
        template: "math",
        title: "Calcul mental en folie",
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
      title: "Trouver x",
      make: () => ({
        template: "math",
        title: "Trouve x",
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
  grammar: [
    {
      title: "Présent et passé composé",
      make: () => ({
        template: "grammar",
        title: "Détective de la conjugaison",
        subtitle: "Trouve et corrige les erreurs",
        emoji: "🕵️",
        tint: "peach",
        settings: settings({ round: 10 }),
        items: [
          { type: "fix", text: "Elle vas à l'école tous les jours.", wrong: "vas", right: "va", options: ["allons", "vont"], explain: "Avec il, elle ou on, le verbe aller se conjugue « va »." },
          { type: "fix", text: "Hier, nous mangeons du riz et de la sauce.", wrong: "mangeons", right: "avons mangé", options: ["mangerons", "mangions"], explain: "Hier indique le passé : on emploie le passé composé." },
          { type: "fix", text: "Mon frère n'aiment pas le lait.", wrong: "n'aiment", right: "n'aime", options: ["n'aimes", "n'aimons"], explain: "Le sujet « mon frère » est au singulier : il n'aime pas." },
          { type: "fix", text: "Ils jouait au football.", wrong: "jouait", right: "jouaient", options: ["jouais", "jouions"], explain: "Ils → jouaient." },
          { type: "gap", text: "La semaine dernière, j'___ une lettre à ma grand-mère.", options: ["écris", "ai écrit", "écrirai"], answer: 1 },
          { type: "gap", text: "Le soleil ___ à l'est.", options: ["se lèvent", "se lève", "se levé"], answer: 1 },
          { type: "gap", text: "Demain, nous ___ au marché.", options: ["sommes allés", "irons", "allait"], answer: 1 },
          { type: "judge", text: "Il joue au football tous les dimanches.", correct: true },
          { type: "judge", text: "Hier soir, j'ai voir ce film.", correct: false, fix: "Hier soir, j'ai vu ce film." },
          { type: "judge", text: "Est-ce qu'elle parle le fon ?", correct: true },
          { type: "unscramble", text: "Les enfants lisent à la bibliothèque." },
          { type: "unscramble", text: "Nous avons fini nos devoirs." },
        ],
      }),
    },
  ],
  vocab: [
    {
      title: "Les émotions",
      make: () => ({
        template: "vocab",
        title: "Les mots des émotions",
        emoji: "😊",
        tint: "rose",
        settings: settings({ round: 10 }),
        modes: ["meaning", "word", "gap", "spell", "listen", "opposite", "pairs"],
        words: [
          { word: "heureux", meaning: "qui se sent bien et content", example: "Il était heureux de revoir ses amis.", emoji: "😊", opposite: "triste" },
          { word: "fâché", meaning: "très mécontent contre quelqu'un ou quelque chose", example: "Il était fâché quand son vélo a été cassé.", emoji: "😠", opposite: "calme" },
          { word: "effrayé", meaning: "qui a peur", example: "Le chaton était effrayé par le bruit du tonnerre.", emoji: "😨", opposite: "courageux" },
          { word: "fier", meaning: "content de ce que l'on a bien fait, ou de ce que d'autres ont bien fait", example: "Papa était fier de mon dessin.", emoji: "🥹" },
          { word: "ennuyé", meaning: "fatigué parce que rien n'est intéressant", example: "Je me suis ennuyé pendant le long trajet en bus.", emoji: "🥱", opposite: "enthousiaste" },
          { word: "surpris", meaning: "qui ressent qu'une chose inattendue est arrivée", example: "Nous avons été surpris par la fête d'anniversaire.", emoji: "😲" },
          { word: "seul", meaning: "triste parce qu'on n'a personne avec soi", example: "Le nouvel élève s'est senti seul au début.", emoji: "😔" },
          { word: "enthousiaste", meaning: "très content à l'idée de ce qui va arriver", example: "La classe était enthousiaste à l'idée de la sortie.", emoji: "🤩", opposite: "ennuyé" },
          { word: "nerveux", meaning: "un peu inquiet à propos de quelque chose", example: "J'étais nerveux avant mon contrôle.", emoji: "😬", opposite: "détendu" },
          { word: "calme", meaning: "tranquille et paisible, sans inquiétude", example: "Le lac était calme ce matin-là.", emoji: "😌", opposite: "fâché" },
        ],
      }),
    },
  ],
  reading: [
    {
      title: "Le Corbeau assoiffé (fable)",
      make: () => ({
        template: "reading",
        title: "Le Corbeau assoiffé",
        subtitle: "Lis la fable, puis joue",
        emoji: "🐦‍⬛",
        tint: "sage",
        settings: settings({ round: 8 }),
        activities: ["questions", "cloze", "sequence", "truefalse", "glossary"],
        passages: [
          {
            title: "Le Corbeau assoiffé",
            text:
              "C'était une chaude journée d'été. Un corbeau volait depuis longtemps et il avait très soif. Il cherchait de l'eau partout, mais les rivières et les mares étaient à sec.\n\nEnfin, il aperçut une jarre en terre dans un jardin. Il descendit et regarda à l'intérieur. Il y avait un peu d'eau au fond, mais son bec ne pouvait pas l'atteindre.\n\nLe corbeau ne se découragea pas. Il vit de petits cailloux sur le sol. Un par un, il les ramassa et les laissa tomber dans la jarre. Peu à peu, l'eau monta de plus en plus haut.\n\nBientôt, l'eau arriva presque en haut. Le corbeau but avec joie, puis il s'envola. Quand on veut, on peut.",
            questions: [
              { type: "mcq", q: "Pourquoi le corbeau cherchait-il de l'eau ?", options: ["Il avait soif", "Il voulait nager", "Il était perdu", "Il avait froid"], answer: 0 },
              { type: "mcq", q: "Où le corbeau a-t-il trouvé de l'eau ?", options: ["Dans une rivière", "Dans une jarre en terre", "Dans une mare", "Dans un seau"], answer: 1 },
              { type: "tf", q: "Au début, le bec du corbeau pouvait atteindre l'eau.", answer: false },
              { type: "mcq", q: "Qu'est-ce que le corbeau a laissé tomber dans la jarre ?", options: ["Des feuilles", "Des bâtons", "Des cailloux", "Des graines"], answer: 2 },
              { type: "short", q: "Complète la morale : Quand on veut, on …", accept: ["peut"] },
              { type: "mcq", q: "Quel mot décrit le mieux le corbeau ?", options: ["Paresseux", "Malin", "Fâché", "Timide"], answer: 1, explain: "Il a résolu le problème en pensant aux cailloux." },
            ],
            glossary: [
              { word: "aperçut", meaning: "vit, remarqua" },
              { word: "cailloux", meaning: "petites pierres lisses" },
              { word: "bec", meaning: "la bouche dure et pointue d'un oiseau" },
              { word: "monta", meaning: "alla vers le haut" },
            ],
          },
        ],
      }),
    },
  ],
  custom: [
    {
      title: "Éclate les nombres pairs",
      make: () => ({
        template: "custom",
        title: "Éclate les nombres pairs",
        emoji: "🎈",
        tint: "lemon",
        settings: settings(),
        html: POP_EVENS.replace('<html lang="en">', '<html lang="fr">')
          .replace("<title>Pop the Evens</title>", "<title>Éclate les nombres pairs</title>")
          .replace("Pop only the EVEN numbers!", "N'éclate que les nombres PAIRS&nbsp;!")
          .replace("<div>You scored <b id=\"final\">0</b></div>", "<div>Ton score&nbsp;: <b id=\"final\">0</b></div>")
          .replace(">Play again</button>", ">Rejouer</button>"),
      }),
    },
  ],
};

export const STARTERS_FR = Object.fromEntries(
  Object.entries(STARTERS).map(([id, list]) => [id, list.map((st) => ({ title: st.title, make: () => typeset(st.make()) as ReturnType<Starter["make"]> }))]),
) as Record<Template, Starter[]>;
