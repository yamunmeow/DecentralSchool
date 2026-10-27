import type { LearnMode } from "./types";

/**
 * Starter datasets. Each has a few deliberate mistakes (typos in labels, copies,
 * a contradiction, someone's email, an outlier) for the Clean step to find.
 */

export interface Example {
  id: string;
  mode: LearnMode;
  title: string;
  blurb: string;
  columns?: [string, string];
  /** sort / reply / predict: [text, label]. write: lines of text. */
  rows: [string, string][];
}

const pairs = (label: string, texts: string[]): [string, string][] => texts.map((t) => [t, label]);

const MOOD: [string, string][] = [
  ...pairs("happy", [
    "I love sunny days at the beach",
    "We won the match today!",
    "My best friend came to visit",
    "This cake is delicious and I love it",
    "I got full marks in maths, I am so happy",
    "The puppy is so cute and playful",
    "We are going on holiday tomorrow, how exciting",
    "I laughed so much at the funny film",
    "My grandma gave me a big hug",
    "Finally finished my project and it looks great",
    "Thank you, this is the best gift ever",
    "The garden is full of bright flowers",
    "I made a new friend at school",
    "Dancing in the rain was so much fun",
    "Our team cheered and sang all the way home",
    "I can't stop smiling today",
    "What a wonderful day with my family",
    "I am so excited for the school trip",
    "We played games and laughed all afternoon",
    "I love my new shoes, they are great",
    "The teacher said my story was brilliant",
    "Yay, it's the weekend and we are having fun",
    "I feel great after a good sleep",
    "My little sister made me laugh",
    "Best day of the year, I am so happy",
    "We baked cookies together and it was fun",
    "I won a prize at the art show",
    "Smiling all day because the sun is out",
  ]),
  ...pairs("sad", [
    "I lost my favourite pencil",
    "It rained all day and the trip was cancelled",
    "My friend moved to another city and I miss her",
    "I failed the spelling test and I feel bad",
    "Nobody came to my party",
    "My ice cream fell on the floor",
    "The cat is sick and won't eat",
    "I miss my old school",
    "We lost the final by one goal",
    "I feel lonely at lunch time",
    "My bike was stolen yesterday",
    "The film had a really sad ending and I cried",
    "I broke my brother's toy by mistake",
    "Everyone forgot my birthday",
    "I am tired and nothing went right today",
    "I cried because my dog ran away",
    "I feel so sad and alone",
    "My best friend is angry with me",
    "I lost my homework and the teacher was upset",
    "It hurts when people laugh at me",
    "We had to say goodbye to grandpa",
    "I am upset because I can't go outside",
    "Nothing is fun when you feel sad",
    "I dropped my phone and the screen broke",
    "I miss my mum when she works late",
    "The game was cancelled and we were all sad",
    "I feel bad that I shouted at my sister",
    "I got hurt playing football and cried",
  ]),
  // The mistakes:
  ["We won the match today!", "happy"],
  ["The puppy is so cute and playful  ", "happy"],
  ["I got a new bike for my birthday", "hapy"],
  ["Ice cream with my cousins after school", "Happy"],
  ["My friend moved to another city and I miss her", "happy"],
  ["Write to me at riya.sharma@example.com, I miss you", "sad"],
  ["", "sad"],
  ["Best day ever!!! https://example.com/photos", "happy"],
];

const LANGUAGE: [string, string][] = [
  ...pairs("English", [
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
    "What time is it?",
  ]),
  ...pairs("Hindi", [
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
  ...pairs("French", [
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
  ]),
  ...pairs("Spanish", [
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
  ["Quelle heure est-il ?", "Franch"],
  ["Il pleut beaucoup ici", "french"],
  ["Hola, me llamo Ana", "English"],
  ["Hola, me llamo Ana", "Spanish"],
  ["Where is the library?", "English"],
  ["12345 !!!", "English"],
];

const ASK_ZO: [string, string][] = [
  ...pairs("I'm Zo, a little elephant who loves to learn!", ["What is your name?", "Who are you?", "What should I call you?", "Tell me your name", "what's ur name", "Do you have a name?", "Your name please", "Who am I talking to?"]),
  ...pairs("I'm an elephant. My ears are great for listening!", ["What animal are you?", "Are you an elephant?", "What kind of animal is Zo?", "Are you a mouse?", "Which animal are you?", "Are you a real animal?", "Why are your ears so big?"]),
  ...pairs("I learn from examples, just like the ones you give me.", ["How do you learn?", "How did you get so clever?", "Who taught you?", "How does Zo learn things?", "How do you learn new things?", "Where do you learn from?", "Can you learn from me?"]),
  ...pairs("Bananas and sugar cane, please!", ["What is your favourite food?", "What do you like to eat?", "Are you hungry?", "What do elephants eat?", "What food do you like?", "Do you like bananas?", "What is your favourite snack?"]),
  ...pairs("Hello! Nice to meet you.", ["Hi", "Hello", "Hey Zo", "Good morning", "Namaste", "Hi Zo", "Hello there", "Good afternoon"]),
  ...pairs("Goodbye! Come back and teach me more.", ["Bye", "See you later", "Goodbye Zo", "I have to go now", "Bye bye", "See you tomorrow", "Good night Zo"]),
  ...pairs("Reading stories with my friends.", ["What do you like to do?", "What is your hobby?", "What do you do for fun?", "Do you have a hobby?", "What do you like doing?", "What is fun for you?"]),
  ...pairs("Sometimes I'm wrong. Always check what I say!", ["Are you always right?", "Can you make mistakes?", "Should I trust you?", "Do you know everything?", "Are you ever wrong?", "Do you make mistakes?", "Can I trust what you say?"]),
  // The mistakes:
  ["What is your name?", "I'm Zo, a little elephant who loves to learn!"],
  ["Who are you?", "Im Zo, a little elephant who loves to learn!"],
  ["Hello", "Goodbye! Come back and teach me more."],
  ["Call me on 98765 43210 if you need help", "Hello! Nice to meet you."],
  ["   ", "Hello! Nice to meet you."],
];

const STUDY: [string, string][] = [
  ["1", "38"], ["1.5", "45"], ["2", "41"], ["2", "50"], ["2.5", "52"], ["3", "55"], ["3", "49"], ["3.5", "60"],
  ["4", "58"], ["4", "64"], ["4.5", "66"], ["5", "63"], ["5", "70"], ["5.5", "72"], ["6", "71"], ["6", "77"],
  ["6.5", "75"], ["7", "80"], ["7.5", "84"], ["8", "82"], ["8", "88"], ["8.5", "86"], ["9", "90"], ["10", "93"],
  // The mistakes:
  ["7 hrs", "79"], ["five", "68"], ["3", "5"], ["", "61"], ["4", "64"],
];

const TEMPERATURE: [string, string][] = [
  ["Jan", "14"], ["Feb", "17"], ["Mar", "23"], ["Apr", "29"], ["May", "33"], ["Jun", "34"], ["Jul", "31"], ["Aug", "30"], ["Sep", "29"], ["Oct", "26"], ["Nov", "20"], ["Dec", "15"],
].map(([, t], i): [string, string] => [String(i + 1), t]).concat([
  ["1", "13"], ["2", "18"], ["3", "24"], ["4", "30"], ["5", "34"], ["6", "33"], ["7", "30"], ["8", "29"], ["9", "28"], ["10", "25"], ["11", "19"], ["12", "14"],
  ["6", "330"], ["13", "16"],
]);

const STORY = `Zo the little elephant lived at the edge of a big green forest.
Every morning Zo walked to the river to drink cool water.
One morning Zo found a lost bird sitting on a stone.
The bird was small and blue and it could not fly.
Zo lifted the bird gently with its long trunk.
"Don't worry, little bird, I will help you find your home," said Zo.
They walked through the forest and asked every animal they met.
The monkey said, "I saw blue birds near the tall tree by the hill."
The tortoise said, "The tall tree is far away, but you are brave."
Zo walked and walked until the sun was high in the sky.
At last they reached the tall tree by the hill.
High in the branches there was a nest full of blue birds.
The mother bird sang a happy song when she saw her baby.
Zo lifted the little bird up to the nest with its trunk.
"Thank you, Zo," sang the mother bird. "You are a true friend."
Zo smiled and walked home slowly as the sun went down.
That night Zo dreamed of blue birds singing in the trees.
The next day Zo went back to the river to drink cool water.
On the way Zo met the monkey again.
"Did you find the bird's home?" asked the monkey.
"Yes, I did," said Zo. "The tall tree was far away, but we found it together."
The monkey laughed and swung from branch to branch.
Then the monkey said, "Will you help me find my lost banana?"
Zo laughed too. "Of course I will help you," said Zo.
They looked under the leaves and behind the rocks.
At last Zo found the banana in the river, floating like a little boat.
Zo picked it up with its trunk and gave it to the monkey.
"Thank you, Zo," said the monkey. "You are a true friend."
Zo smiled and walked home slowly as the sun went down.
Every day Zo helped a new friend in the big green forest.
Zo helped the tortoise cross the road.
Zo helped the rabbit find a carrot.
Zo helped the old owl remember a song.
And every night Zo dreamed of all the friends in the forest.
Zo smiled and walked home slowly as the sun went down.
Visit www.example.com/zo-stories for more stories!
Story written by Meera, email meera.k@example.com`;

const RIDDLES = `Once upon a time a small cloud wanted to see the whole world.
The cloud floated over mountains, rivers and busy cities.
In the mountains the cloud met a cold wind that liked to sing.
The wind said, "Come with me and I will show you the sea."
The cloud followed the wind over fields of yellow flowers.
At the sea the cloud saw ships, whales and silver fish.
The cloud was so happy that it began to rain.
The rain fell on the fields and the flowers grew tall.
The farmers looked up and waved at the little cloud.
The cloud waved back and floated on, looking for new places.`;

export const EXAMPLES: Example[] = [
  { id: "mood", mode: "sort", title: "Happy or sad?", blurb: "Sentences sorted by feeling.", rows: MOOD },
  { id: "language", mode: "sort", title: "Which language?", blurb: "English, Hindi, French or Spanish.", rows: LANGUAGE },
  { id: "ask-zo", mode: "reply", title: "Ask Zo", blurb: "Questions and Zo's answers.", rows: ASK_ZO },
  { id: "study", mode: "predict", title: "Study time → marks", blurb: "Hours of study and test marks.", columns: ["Hours of study", "Marks"], rows: STUDY },
  { id: "weather", mode: "predict", title: "Month → temperature", blurb: "Two years of a town's warmest days.", columns: ["Month", "Temperature (°C)"], rows: TEMPERATURE },
  { id: "story", mode: "write", title: "Zo's stories", blurb: "A short story to learn writing from.", rows: STORY.split("\n").map((t) => [t, ""]) },
  { id: "cloud", mode: "write", title: "The little cloud", blurb: "A tiny story: see how little Zo can learn.", rows: RIDDLES.split("\n").map((t) => [t, ""]) },
];
