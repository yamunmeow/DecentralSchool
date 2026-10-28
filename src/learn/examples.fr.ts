import type { Example } from "./examples";

/**
 * The starter datasets in French, with the same kinds of deliberate mistakes (typos in
 * labels, copies, a contradiction, someone's email, an outlier) for the Clean step.
 */

const pairs = (label: string, texts: string[]): [string, string][] => texts.map((t) => [t, label]);

const MOOD: [string, string][] = [
  ...pairs("content", [
    "J'adore les journées ensoleillées à la plage",
    "Nous avons gagné le match aujourd'hui !",
    "Mon meilleur ami est venu me voir",
    "Ce gâteau est délicieux, je l'adore",
    "J'ai eu la meilleure note en maths, je suis si content",
    "Le chiot est tellement mignon et joueur",
    "Nous partons en vacances demain, quelle joie",
    "J'ai tellement ri devant ce film drôle",
    "Ma grand-mère m'a fait un gros câlin",
    "J'ai enfin fini mon exposé et il est très réussi",
    "Merci, c'est le plus beau cadeau du monde",
    "Le jardin est plein de fleurs de toutes les couleurs",
    "Je me suis fait un nouvel ami à l'école",
    "Danser sous la pluie, c'était vraiment amusant",
    "Notre équipe a chanté tout le long du chemin",
    "Je n'arrête pas de sourire aujourd'hui",
    "Quelle merveilleuse journée en famille",
    "J'ai hâte de partir en sortie scolaire",
    "Nous avons joué et ri tout l'après-midi",
    "J'adore mes nouvelles chaussures, elles sont super",
    "La maîtresse a dit que mon histoire était géniale",
    "Youpi, c'est le week-end et on s'amuse bien",
    "Je me sens en pleine forme après une bonne nuit",
    "Ma petite sœur m'a fait rire",
    "Le plus beau jour de l'année, je suis si heureux",
    "Nous avons fait des biscuits ensemble, c'était génial",
    "J'ai gagné un prix au concours de dessin",
    "Je souris toute la journée parce qu'il fait beau",
  ]),
  ...pairs("triste", [
    "J'ai perdu mon crayon préféré",
    "Il a plu toute la journée et la sortie a été annulée",
    "Mon amie a déménagé dans une autre ville et elle me manque",
    "J'ai raté la dictée et je me sens mal",
    "Personne n'est venu à ma fête",
    "Ma glace est tombée par terre",
    "Le chat est malade et ne mange plus",
    "Mon ancienne école me manque",
    "Nous avons perdu la finale d'un seul but",
    "Je me sens seul à la cantine",
    "On m'a volé mon vélo hier",
    "Le film finissait vraiment mal et j'ai pleuré",
    "J'ai cassé le jouet de mon frère sans le faire exprès",
    "Tout le monde a oublié mon anniversaire",
    "Je suis fatigué et rien ne s'est bien passé aujourd'hui",
    "J'ai pleuré parce que mon chien s'est enfui",
    "Je me sens si triste et si seul",
    "Mon meilleur ami est fâché contre moi",
    "J'ai perdu mes devoirs et la maîtresse n'était pas contente",
    "Ça fait mal quand les autres se moquent de moi",
    "Nous avons dû dire au revoir à grand-père",
    "Je suis déçu parce que je ne peux pas sortir",
    "Rien n'est amusant quand on est triste",
    "J'ai fait tomber mon téléphone et l'écran s'est cassé",
    "Maman me manque quand elle travaille tard",
    "Le match a été annulé et nous étions tous tristes",
    "Je m'en veux d'avoir crié sur ma sœur",
    "Je me suis fait mal au football et j'ai pleuré",
  ]),
  // The mistakes:
  ["Nous avons gagné le match aujourd'hui !", "content"],
  ["Le chiot est tellement mignon et joueur  ", "content"],
  ["J'ai eu un nouveau vélo pour mon anniversaire", "contant"],
  ["Une glace avec mes cousins après l'école", "Content"],
  ["Mon amie a déménagé dans une autre ville et elle me manque", "content"],
  ["Écris-moi à awa.dossou@example.com, tu me manques", "triste"],
  ["", "triste"],
  ["Le plus beau jour de ma vie !!! https://example.com/photos", "content"],
];

const LANGUAGE: [string, string][] = [
  ...pairs("français", [
    "Où est la bibliothèque ?",
    "Je voudrais un verre d'eau",
    "Il fait beau aujourd'hui",
    "Mon frère joue au football tous les soirs",
    "Peux-tu m'aider avec mes devoirs ?",
    "Nous allons au marché",
    "Ce livre est très intéressant",
    "Bonjour, comment ça va ?",
    "Le train part à sept heures",
    "Ferme la fenêtre, s'il te plaît",
    "J'apprends à cuisiner",
    "Quelle heure est-il ?",
  ]),
  ...pairs("anglais", [
    "Where is the library?",
    "I would like a glass of water",
    "The weather is nice today",
    "My brother plays football every evening",
    "Can you help me with my homework?",
    "We are going to the market",
    "This book is very interesting",
    "Good morning, how are you?",
    "The train leaves at seven o'clock",
    "Please close the window",
    "I am learning to cook",
  ]),
  ...pairs("hindi", [
    "पुस्तकालय कहाँ है?",
    "मुझे एक गिलास पानी चाहिए",
    "आज मौसम अच्छा है",
    "मेरा भाई हर शाम फुटबॉल खेलता है",
    "क्या आप मेरा गृहकार्य करने में मदद करेंगे?",
    "हम बाज़ार जा रहे हैं",
    "यह किताब बहुत रोचक है",
    "सुप्रभात, आप कैसे हैं?",
    "ट्रेन सात बजे निकलती है",
    "कृपया खिड़की बंद कर दीजिए",
    "मैं खाना बनाना सीख रहा हूँ",
    "कितने बजे हैं?",
  ]),
  ...pairs("espagnol", [
    "¿Dónde está la biblioteca?",
    "Quisiera un vaso de agua",
    "Hoy hace buen tiempo",
    "Mi hermano juega al fútbol cada tarde",
    "¿Puedes ayudarme con mis deberes?",
    "Vamos al mercado",
    "Este libro es muy interesante",
    "Buenos días, ¿cómo estás?",
    "El tren sale a las siete",
    "Cierra la ventana, por favor",
  ]),
  ["What time is it?", "anglai"],
  ["It is raining a lot here", "Anglais"],
  ["Hola, me llamo Ana", "français"],
  ["Hola, me llamo Ana", "espagnol"],
  ["Où est la bibliothèque ?", "français"],
  ["12345 !!!", "français"],
];

const ASK_ZO: [string, string][] = [
  ...pairs("Je suis Zo, un petit éléphant qui adore apprendre !", ["Comment tu t'appelles ?", "Qui es-tu ?", "Comment dois-je t'appeler ?", "Dis-moi ton nom", "c koi ton nom", "Tu as un nom ?", "Ton prénom, s'il te plaît"]),
  ...pairs("Je suis un éléphant. Mes oreilles sont parfaites pour écouter !", ["Quel animal es-tu ?", "Tu es un éléphant ?", "Zo est quel genre d'animal ?", "Tu es une souris ?", "Tu es quel animal ?", "Tu es un rhinocéros ?"]),
  ...pairs("J'apprends grâce à des exemples, comme ceux que tu me donnes.", ["Comment apprends-tu ?", "Comment es-tu devenu si malin ?", "Qui t'a appris ?", "Comment Zo apprend-il ?", "Comment apprends-tu de nouvelles choses ?", "Tu apprends comment ?"]),
  ...pairs("Des bananes et de la canne à sucre, s'il te plaît !", ["Quel est ton plat préféré ?", "Qu'est-ce que tu aimes manger ?", "Tu as faim ?", "Que mangent les éléphants ?", "Quelle nourriture aimes-tu ?", "Tu aimes les bananes ?"]),
  ...pairs("Bonjour ! Ravi de te rencontrer.", ["Salut", "Bonjour", "Coucou Zo", "Bon matin", "Bonsoir", "Salut Zo", "Bonjour à toi", "Bon après-midi"]),
  ...pairs("Au revoir ! Reviens vite m'apprendre d'autres choses.", ["Au revoir", "À plus tard", "Au revoir Zo", "Je dois partir", "Salut, à bientôt", "À demain", "Bonne nuit Zo"]),
  ...pairs("Lire des histoires avec mes amis.", ["Qu'est-ce que tu aimes faire ?", "Quel est ton passe-temps ?", "Que fais-tu pour t'amuser ?", "Tu as un passe-temps ?", "Qu'aimes-tu faire ?", "Qu'est-ce qui t'amuse ?"]),
  ...pairs("Parfois je me trompe. Vérifie toujours ce que je dis !", ["Tu as toujours raison ?", "Tu peux te tromper ?", "Je peux te faire confiance ?", "Tu sais tout ?", "Il t'arrive de te tromper ?", "Tu fais des erreurs ?"]),
  // The mistakes:
  ["Comment tu t'appelles ?", "Je suis Zo, un petit éléphant qui adore apprendre !"],
  ["Qui es-tu ?", "Je suis Zo un petit éléphant qui adore apprendre !"],
  ["Bonjour", "Au revoir ! Reviens vite m'apprendre d'autres choses."],
  ["Appelle-moi au 97 12 34 56 si tu as besoin d'aide", "Bonjour ! Ravi de te rencontrer."],
  ["   ", "Bonjour ! Ravi de te rencontrer."],
];

const STUDY: [string, string][] = [
  ["1", "38"], ["1.5", "45"], ["2", "41"], ["2", "50"], ["2.5", "52"], ["3", "55"], ["3", "49"], ["3.5", "60"],
  ["4", "58"], ["4", "64"], ["4.5", "66"], ["5", "63"], ["5", "70"], ["5.5", "72"], ["6", "71"], ["6", "77"],
  ["6.5", "75"], ["7", "80"], ["7.5", "84"], ["8", "82"], ["8", "88"], ["8.5", "86"], ["9", "90"], ["10", "93"],
  // The mistakes:
  ["7 h", "79"], ["cinq", "68"], ["3", "5"], ["", "61"], ["4", "64"],
];

const TEMPERATURE: [string, string][] = [
  ["1", "14"], ["2", "17"], ["3", "23"], ["4", "29"], ["5", "33"], ["6", "34"], ["7", "31"], ["8", "30"], ["9", "29"], ["10", "26"], ["11", "20"], ["12", "15"],
  ["1", "13"], ["2", "18"], ["3", "24"], ["4", "30"], ["5", "34"], ["6", "33"], ["7", "30"], ["8", "29"], ["9", "28"], ["10", "25"], ["11", "19"], ["12", "14"],
  ["6", "330"], ["13", "16"],
];

const STORY = `Zo, le petit éléphant, vivait au bord d'une grande forêt verte.
Chaque matin, Zo marchait jusqu'à la rivière pour boire de l'eau fraîche.
Un matin, Zo trouva un oiseau perdu, assis sur une pierre.
L'oiseau était petit et bleu, et il ne pouvait pas voler.
Zo souleva doucement l'oiseau avec sa longue trompe.
« Ne t'inquiète pas, petit oiseau, je vais t'aider à retrouver ta maison », dit Zo.
Ils traversèrent la forêt et interrogèrent chaque animal qu'ils rencontraient.
Le singe dit : « J'ai vu des oiseaux bleus près du grand arbre, sur la colline. »
La tortue dit : « Le grand arbre est loin, mais tu es courageux. »
Zo marcha et marcha jusqu'à ce que le soleil soit haut dans le ciel.
Enfin, ils arrivèrent au grand arbre sur la colline.
Tout en haut des branches, il y avait un nid plein d'oiseaux bleus.
La maman oiseau chanta une chanson joyeuse en voyant son petit.
Zo souleva le petit oiseau jusqu'au nid avec sa trompe.
« Merci, Zo, chanta la maman oiseau. Tu es un véritable ami. »
Zo sourit et rentra lentement chez lui pendant que le soleil se couchait.
Cette nuit-là, Zo rêva d'oiseaux bleus qui chantaient dans les arbres.
Le lendemain, Zo retourna à la rivière pour boire de l'eau fraîche.
En chemin, Zo rencontra de nouveau le singe.
« As-tu trouvé la maison de l'oiseau ? » demanda le singe.
« Oui, répondit Zo. Le grand arbre était loin, mais nous l'avons trouvé ensemble. »
Le singe éclata de rire et se balança de branche en branche.
Puis le singe dit : « Veux-tu m'aider à retrouver ma banane perdue ? »
Zo rit aussi. « Bien sûr que je vais t'aider », dit Zo.
Ils cherchèrent sous les feuilles et derrière les rochers.
Enfin, Zo trouva la banane dans la rivière, qui flottait comme un petit bateau.
Zo la ramassa avec sa trompe et la donna au singe.
« Merci, Zo, dit le singe. Tu es un véritable ami. »
Zo sourit et rentra lentement chez lui pendant que le soleil se couchait.
Chaque jour, Zo aidait un nouvel ami dans la grande forêt verte.
Zo aida la tortue à traverser la route.
Zo aida le lapin à trouver une carotte.
Zo aida le vieux hibou à se souvenir d'une chanson.
Et chaque nuit, Zo rêvait de tous ses amis de la forêt.
Zo sourit et rentra lentement chez lui pendant que le soleil se couchait.
Rendez-vous sur www.example.com/histoires-de-zo pour d'autres histoires !
Histoire écrite par Aïcha, e-mail aicha.h@example.com`;

const CLOUD = `Il était une fois un petit nuage qui voulait voir le monde entier.
Le nuage flotta au-dessus des montagnes, des rivières et des villes animées.
Dans les montagnes, le nuage rencontra un vent froid qui aimait chanter.
Le vent dit : « Viens avec moi, je vais te montrer la mer. »
Le nuage suivit le vent au-dessus de champs de fleurs jaunes.
À la mer, le nuage vit des bateaux, des baleines et des poissons argentés.
Le nuage était si heureux qu'il se mit à pleuvoir.
La pluie tomba sur les champs et les fleurs poussèrent bien haut.
Les paysans levèrent les yeux et saluèrent le petit nuage.
Le nuage les salua à son tour et repartit à la recherche de nouveaux endroits.`;

export const EXAMPLES_FR: Example[] = [
  { id: "mood", mode: "sort", title: "Content ou triste ?", blurb: "Des phrases classées selon le sentiment.", rows: MOOD },
  { id: "language", mode: "sort", title: "Quelle langue ?", blurb: "Français, anglais, hindi ou espagnol.", rows: LANGUAGE },
  { id: "ask-zo", mode: "reply", title: "Pose une question à Zo", blurb: "Des questions et les réponses de Zo.", rows: ASK_ZO },
  { id: "study", mode: "predict", title: "Temps d'étude → notes", blurb: "Heures d'étude et notes au contrôle.", columns: ["Heures d'étude", "Note"], rows: STUDY },
  { id: "weather", mode: "predict", title: "Mois → température", blurb: "Deux années de températures maximales d'une ville.", columns: ["Mois", "Température (°C)"], rows: TEMPERATURE },
  { id: "story", mode: "write", title: "Les histoires de Zo", blurb: "Une courte histoire pour apprendre à écrire.", rows: STORY.split("\n").map((t) => [t, ""]) },
  { id: "cloud", mode: "write", title: "Le petit nuage", blurb: "Une toute petite histoire : voyez le peu que Zo peut apprendre.", rows: CLOUD.split("\n").map((t) => [t, ""]) },
];
