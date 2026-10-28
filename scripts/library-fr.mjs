/**
 * French copies of the library games, made from the English files by exact
 * replacements (each one must be found, so a changed game fails loudly instead of
 * shipping half in English). The studio plays index.fr.html when it is in French.
 */

const NB = " ";

function swap(html, pairs, name) {
  let out = html;
  for (const [from, to, all] of pairs) {
    if (!out.includes(from)) throw new Error(`${name}: not found: ${from.slice(0, 80)}`);
    out = all ? out.split(from).join(to) : out.replace(from, () => to);
  }
  return out;
}

/** Multiplication Quest: the text is written into the page and its script. */
export function mathQuestFr(html) {
  return swap(
    html,
    [
      ['<html lang="en">', '<html lang="fr">'],
      ["<title>Multiplication Quest · 1–9</title>", "<title>Défi Multiplication · 1–9</title>"],
      ["</span> Multiplication Quest</div>", "</span> Défi Multiplication</div>"],
      ["✓ Works offline · Ages 6–10", "✓ Fonctionne hors ligne · 6–10 ans"],
      ["A little challenge, a big achievement", "Un petit défi, une grande réussite"],
      ["How strong are your times tables?", `Connais-tu bien tes tables de multiplication${NB}?`],
      [
        "Play through the 1 to 9 multiplication tables, collect stars, and discover what to practise next. Each child gets their own result.",
        "Parcours les tables de multiplication de 1 à 9, gagne des étoiles et découvre ce qu’il te reste à travailler. Chaque enfant obtient son propre résultat.",
      ],
      ["Set up the quest", "Prépare le défi"],
      ["Choose a child or type a name.", "Choisis un enfant ou écris un prénom."],
      ['aria-label="Choose a child"', 'aria-label="Choisir un enfant"'],
      ["Child's name", "Prénom de l’enfant"],
      ['placeholder="Or type another name"', 'placeholder="Ou écris un autre prénom"'],
      ["Choose a challenge", "Choisis un défi"],
      ['aria-label="Challenge length"', 'aria-label="Durée du défi"'],
      ["⚡ Quick Quest · 27 questions", "⚡ Défi rapide · 27 questions"],
      ["Three different questions from each table. About 5–10 minutes.", "Trois questions différentes par table. Environ 5 à 10 minutes."],
      ["🏆 Full Quest · 81 questions", "🏆 Grand défi · 81 questions"],
      ["Every combination from 1 × 1 to 9 × 9, once each.", "Toutes les opérations de 1 × 1 à 9 × 9, une fois chacune."],
      ["Start playing →", "Commencer à jouer →"],
      [
        "No account or internet needed. Results stay on this browser; you can also print or download a report.",
        `Pas besoin de compte ni d’internet. Les résultats restent dans ce navigateur${NB}; vous pouvez aussi imprimer ou télécharger un bilan.`,
      ],
      ['<span id="playerLine">Quest</span>', '<span id="playerLine">Défi</span>'],
      ['<span id="starLine">⭐ 0 stars</span>', '<span id="starLine">⭐ 0 étoile</span>'],
      ['aria-label="Quest progress"', 'aria-label="Progression du défi"'],
      ["Solve this one", "Résous cette opération"],
      ['aria-label="Multiplication question"', 'aria-label="Question de multiplication"'],
      ['for="answer">Your answer</label>', 'for="answer">Ta réponse</label>'],
      ['aria-label="Your answer"', 'aria-label="Ta réponse"'],
      ["Check ✓", "Vérifier ✓"],
      ['type="button">Next question →</button>', 'type="button">Question suivante →</button>'],
      ["End quest early", "Arrêter le défi"],
      ["Parent report", "Bilan pour les parents"],
      ['id="reportTitle">Quest complete!</h1>', `id="reportTitle">Défi terminé${NB}!</h1>`],
      ["<span>First-try correct</span>", "<span>Justes du premier coup</span>"],
      ["<span>Accuracy</span>", "<span>Réussite</span>"],
      ["<span>Time taken</span>", "<span>Temps passé</span>"],
      ["Results by times table", "Résultats par table"],
      ["<th>Table</th><th>Correct</th><th>Accuracy</th><th>Next step</th>", "<th>Table</th><th>Justes</th><th>Réussite</th><th>Prochaine étape</th>"],
      ["Play again →", "Rejouer →"],
      ['type="button">Retry missed questions</button>', 'type="button">Refaire les questions manquées</button>'],
      ["Print report", "Imprimer le bilan"],
      ["Download CSV", "Télécharger le CSV"],
      ["Recent results on this device", "Résultats récents sur cet appareil"],
      ["Clear saved results", "Effacer les résultats enregistrés"],
      ["A parent-friendly learning game · Everything works in this one file.", "Un jeu éducatif pensé pour les parents · Tout fonctionne dans ce seul fichier."],
      ["'<p>No saved results yet.</p>'", "'<p>Aucun résultat enregistré pour l’instant.</p>'"],
      [`$('playerLine').textContent=player+"'s quest";`, "$('playerLine').textContent='Le défi de '+player;"],
      ["$('starLine').textContent='⭐ '+answers.filter(a=>a.correct).length+' stars';", "$('starLine').textContent=(n=>'⭐ '+n+(n>1?' étoiles':' étoile'))(answers.filter(a=>a.correct).length);", true],
      ["`Question ${index+1} of ${questions.length}`", "`Question ${index+1} sur ${questions.length}`"],
      ["currentType==='full'?'Full Quest':currentType==='retry'?'Retry Quest':'Quick Quest'", "currentType==='full'?'Grand défi':currentType==='retry'?'Défi de rattrapage':'Défi rapide'", true],
      ["`${q.a} times ${q.b} equals what?`", `\`\${q.a} fois \${q.b}, combien ça fait${NB}?\``],
      ["'Please enter a whole number from 0 to 81.'", "'Écris un nombre entier entre 0 et 81.'"],
      ["['Brilliant! You got it! ⭐','Yes! Nice thinking! ⭐','Correct! Keep going! ⭐']", `['Bravo${NB}! Tu as trouvé${NB}! ⭐','Oui${NB}! Bien réfléchi${NB}! ⭐','C’est juste${NB}! Continue${NB}! ⭐']`],
      ["`Good try! ${q.a} × ${q.b} = ${q.a*q.b}. We'll practise this one again.`", `\`Bien essayé${NB}! \${q.a} × \${q.b} = \${q.a*q.b}. On s’entraînera encore sur celle-ci.\``],
      ["'See my results →':'Next question →'", "'Voir mes résultats →':'Question suivante →'"],
      ["type+' (ended early)'", "type+' (arrêté avant la fin)'"],
      ["let date=new Date().toLocaleString();", "let date=new Date().toLocaleString('fr-FR');"],
      ["'Quest ended':'Quest complete!'", `'Défi arrêté':'Défi terminé${NB}!'`],
      [
        "`${player} answered ${total} of ${questions.length} questions in the ${type.toLowerCase()}. Scores count the first answer to each question.`",
        "`${player} a répondu à ${total} question${total>1?'s':''} sur ${questions.length} (${type.toLowerCase()}). Le score compte la première réponse à chaque question.`",
      ],
      ["duration<60?duration+' sec':Math.floor(duration/60)+'m '+String(duration%60).padStart(2,'0')+'s'", "duration<60?duration+' s':Math.floor(duration/60)+' min '+String(duration%60).padStart(2,'0')+' s'"],
      ["'All 9 facts per table were tested.'", "'Les 9 opérations de chaque table ont été testées.'"],
      ["'Three facts per table were sampled; use Full Quest for every combination.'", `'Trois opérations par table ont été tirées au sort${NB}; choisissez le Grand défi pour toutes les tester.'`],
      ["'This retry checks only the questions missed in the previous quest.'", "'Ce rattrapage reprend seulement les questions manquées au défi précédent.'"],
      ["'Looking strong':rate>=.67?'A little practice':'Practise this table'", "'Bien maîtrisée':rate>=.67?'Encore un peu d’entraînement':'Table à travailler'"],
      ["<b>Questions to revisit (${mistakes.length})</b><br>", "<b>Questions à revoir (${mistakes.length})</b><br>"],
      ["`${x.a} × ${x.b} = ${x.a*x.b} (answered ${x.given})`", `\`\${x.a} × \${x.b} = \${x.a*x.b} (réponse donnée${NB}: \${x.given})\``],
      ["'<b>Wonderful! Every answer was correct on the first try. ⭐</b>'", `'<b>Merveilleux${NB}! Toutes les réponses étaient justes du premier coup. ⭐</b>'`],
      [
        "`Retry ${mistakes.length} missed question${mistakes.length===1?'':'s'}`:'No missed questions'",
        "`Refaire ${mistakes.length===1?'la question manquée':mistakes.length+' questions manquées'}`:'Aucune question manquée'",
      ],
      [
        "['Child','Challenge','Date','Question','Table','Multiplier','Correct answer','Given answer','First try correct']",
        "['Enfant','Défi','Date','Question','Table','Multiplicateur','Bonne réponse','Réponse donnée','Juste du premier coup']",
      ],
      ["new Date(started).toLocaleString()", "new Date(started).toLocaleString('fr-FR')"],
      ["x.correct?'Yes':'No'", "x.correct?'Oui':'Non'"],
      ["'multiplication-report-'", "'bilan-multiplication-'"],
      ["||player||'My child';", "||player||'Mon enfant';"],
      ["confirm('End this quest and see the answers completed so far?')", `confirm('Arrêter ce défi et voir les réponses déjà données${NB}?')`],
      ["confirm('Clear all saved results on this browser?')", `confirm('Effacer tous les résultats enregistrés dans ce navigateur${NB}?')`],
    ],
    "math-quest",
  );
}

/** Reading Quest already speaks both languages; the French copy opens in French. */
export function readingQuestFr(html) {
  return swap(
    html,
    [
      ['<html lang="en">', '<html lang="fr">'],
      ["language='en',storyIndex=null", "language='fr',storyIndex=null"],
      ['<span aria-hidden="true">📖</span> Reading Quest</div>', '<span aria-hidden="true">📖</span> Défi Lecture</div>'],
    ],
    "reading-quest",
  );
}

const WORD_QUEST_TEXT = {
  hello: `Salut, {name}${NB}!`,
  level: "Niveau {n}",
  xpToNext: "Encore {n} XP pour le niveau {next}",
  streak: "🔥 {n} jours d’affilée",
  mastered: "⭐ {n} / {total} mots maîtrisés",
  quickPlay: "Partie rapide",
  quickPlayHint: "{n} mots de toutes les séries",
  review: "Corriger mes erreurs",
  reviewHint: "{n} mots à revoir",
  reviewNone: "Aucune erreur pour l’instant",
  packs: "Séries de mots",
  words: "{n} mots",
  learn: "📖 Apprendre",
  play: "▶ Jouer",
  back: "← Retour",
  next: "Suivant →",
  previous: "← Retour",
  startQuiz: "Commencer le quiz ▶",
  listen: "Écouter",
  qMeaning: `Que veut dire ce mot${NB}?`,
  qWord: "Quel mot veut dire…",
  qGap: "Complète la phrase",
  qListen: `Quel mot entends-tu${NB}?`,
  qSpell: "Écris le mot",
  qOpposite: "Quel est le contraire de…",
  clear: "Effacer",
  skip: "Je ne sais pas",
  correct: [`Juste${NB}!`, `Bravo${NB}!`, `Bien joué${NB}!`, `Excellent${NB}!`, `Oui, c’est ça${NB}!`],
  wrong: "Pas tout à fait",
  answerWas: `La réponse est «${NB}{answer}${NB}».`,
  oppositeWas: `Le contraire de «${NB}{word}${NB}» est «${NB}{answer}${NB}».`,
  continue: "Continuer",
  seeResults: "Voir mon score",
  combo: `🔥 {n} d’affilée${NB}!`,
  resultTitle: [`Continue à t’entraîner${NB}!`, `Bel effort${NB}!`, `Bravo${NB}!`, `Incroyable${NB}!`],
  score: "{n} sur {total} justes",
  xpEarned: "+{n} XP",
  bestCombo: `Meilleure série${NB}: {n}`,
  missedWords: "Mots à revoir",
  playAgain: "Rejouer",
  practiseMissed: "Revoir ces mots",
  allPacks: "Toutes les séries",
  leaveTitle: `Quitter cette partie${NB}?`,
  leaveBody: "Tes réponses ne seront pas enregistrées.",
  leave: "Quitter",
  keepPlaying: "Continuer à jouer",
  players: `Qui joue${NB}?`,
  addPlayer: "Ajouter",
  newPlayer: "Prénom du nouveau joueur",
  sound: "Effets sonores",
  on: "Activés",
  off: "Désactivés",
  resetPlayer: "Remettre à zéro la progression de {name}",
  removePlayer: "Retirer {name}",
  resetTitle: `Remettre la progression à zéro${NB}?`,
  resetBody: "Tous les scores et toutes les étoiles de {name} seront effacés.",
  removeTitle: `Retirer ce joueur${NB}?`,
  removeBody: "{name} et toute sa progression seront supprimés.",
  reset: "Remettre à zéro",
  remove: "Retirer",
  cancel: "Annuler",
  done: "Terminé",
  defaultPlayer: "Joueur",
  loadError: "Le jeu n’a pas pu démarrer",
  previewHint: "Fichier ouvert directement depuis le disque ? Les navigateurs bloquent alors content.fr.json. Ouvrez-le depuis le studio.",
};

const DECKS_FR = {
  "At Home": "À la maison",
  "Food & Drink": "Nourriture et boissons",
  Animals: "Les animaux",
  "At School": "À l’école",
  "Weather & Nature": "Météo et nature",
  "Body & Health": "Le corps et la santé",
  Feelings: "Les émotions",
  "Action Words": "Les verbes d’action",
  Opposites: "Les contraires",
  "Around Town": "En ville",
  "Time & Routine": "L’heure et le quotidien",
  Travel: "Les voyages",
};

const WORD_TYPES_FR = { noun: "nom", verb: "verbe", adjective: "adjectif", adverb: "adverbe" };

/**
 * Word Quest teaches English words, so the words, meanings and voice stay English;
 * everything around them (buttons, packs, word types) is French. The game reads its
 * text from content.json, so the French copy reads content.fr.json.
 */
export function wordQuestFr(html, content) {
  const page = swap(
    html,
    [
      ['<html lang="en">', '<html lang="fr">'],
      ["<title>Word Quest</title>", "<title>Défi Vocabulaire</title>"],
      ['<span id="brandTitle">Word Quest</span>', '<span id="brandTitle">Défi Vocabulaire</span>'],
      ['<p class="center-msg">Loading…</p>', '<p class="center-msg">Chargement…</p>'],
      ["fetch('content.json'", "fetch('content.fr.json'"],
      ['aria-label="${n} of 3 stars"', 'aria-label="${n} étoile${n > 1 ? \'s\' : \'\'} sur 3"'],
      ['aria-label="blank"', 'aria-label="mot manquant"'],
      ["content.title || 'Word Quest'", "content.title || 'Défi Vocabulaire'"],
    ],
    "word-quest",
  );
  const data = {
    ...content,
    title: "Défi Vocabulaire",
    subtitle: "Apprends des mots anglais. Écoute, joue et épelle.",
    text: { ...(content.text || {}), ...WORD_QUEST_TEXT },
    decks: content.decks.map((d) => ({
      ...d,
      title: DECKS_FR[d.title] || d.title,
      words: d.words.map((w) => (w.type && WORD_TYPES_FR[w.type] ? { ...w, type: WORD_TYPES_FR[w.type] } : w)),
    })),
  };
  return { page, content: data };
}
