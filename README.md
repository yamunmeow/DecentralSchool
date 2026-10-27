# DecentralSchool

**[decentralschool.org](https://decentralschool.org)** · free, open-source and offline-first

DecentralSchool is a studio where students make their own learning games and teachers
supervise and scaffold them, with nothing in the middle: a free Google sign-in opens the
studio (keeping only a name and email), games and class work never touch a server, and no
internet is needed once it has loaded. Games travel as a link, a
single `.html` file, an Android app, or a Scratch project.

## Mission

Every classroom should be able to make its own games and learn without a connection.

DecentralSchool was inspired by the English teacher at the **CAEB** (*Conseil des
Activités Éducatives du Bénin*, the Benin Council for Educational Activities) in
**Porto-Novo, Benin**. He did not want to use games someone else had already put on the
internet; he wanted the agency to create his own games and quizzes for his own lessons,
and he wanted them to work offline, so his students could download and install them at
the CAEB and keep practising at home without worrying about an internet connection. His
games (Word Quest, Reading Quest and Math Quest) ship with DecentralSchool as templates.

- **Games work.** Quick feedback, a reason to try again and small wins turn practice into
  something students choose to do, and the best learning game is the one a teacher shaped
  for their own class.
- **AI makes making easier, and needs understanding.** AI now lets any educator describe a
  game and get a first version. But AI learns from data, data carries biases, and it has to
  be sorted, cleaned and moderated. **Zo Wants to Learn** lets students do exactly that with
  their own data, hands on, as collateral learning while they play.
- **Blocks, then real code.** The **Game Lab** is built on top of Scratch's block language,
  with the JavaScript, HTML and CSS of every game shown beside its blocks, so learning
  doesn't stop at blocks for students who want to see the real syntax and logic.
- **Sustainable, offline-first, decentralised.** Small models that run on the device, files
  that keep working without a network, and work that stays with the people who made it.

We advocate for a world where young people get their gratification from creation, not
consumption.

## What's inside

| Area | Route | What it does |
| --- | --- | --- |
| Play | `#/play` | Play the CAEB games, random quizzes and examples in the browser, nothing to install; copy any of them into the studio or download it as one `.html` file |
| Game Lab | `#/code` | Block coding built on Scratch, with a mind map of the project, real JavaScript, a debugger, and Scratch `.sb3` in and out |
| Zo Wants to Learn | `#/learn` | Feed, clean, split, train, test and use a real model in the browser |
| Quick games | `#/games` | Quiz, maths, grammar, vocabulary, reading and own-HTML templates, with the randomizer |
| Class | `#/class` | Challenges, hand-ins, feedback and a class gallery, all as files and links |
| Mission | `#/mission` | Why this exists, the license and credits |
| Sign in | `#/signin` | Free account with Google; Settings has sign out and delete |
| Privacy | `#/privacy` (also `/privacy`) | Exactly what is collected, and what isn't |
| Terms | `#/terms` (also `/terms`) | Terms of use, in plain words |

After signing in, the first visit asks "I'm a student" or "I'm a teacher" (switch any time in Settings). It
only changes what's in front; nothing is locked away.

## Play without installing

`public/library/` holds finished games exactly as they were made, each in its own folder
(`index.html`, its data, `icon.png`). They play in the page, keep their progress, and are
stored by the service worker so they also open offline. Each one can be:

- **made your own** as an editable quick game: Word Quest becomes a vocabulary game with its
  144 words, Reading Quest a reading game with its 26 stories (English or French), Math Quest
  a times-tables game; or as its original HTML;
- **downloaded** as a single `.html` file (Word Quest's `content.json` is folded in), which
  plays from a USB stick or a phone's files with no internet.

To add more games laid out as `games/<name>/{game.json, icon.png, www/}`:

```bash
npm run library -- "../CAEB Games/VocabGame/games/word-quest" …
```

then list them in `src/studio/play/library.ts`.

## The randomizer

Quizzes can get a **new set** of questions of the same kind every time, from open sources:

| Source | Needs internet | License |
| --- | --- | --- |
| Countries (capitals, flags, continents, money, coast, size), from the bundled [world-countries](https://github.com/mledoze/countries) data | No | ODbL-1.0 |
| Trivia by subject and level, from the [Open Trivia Database](https://opentdb.com) (a session token avoids repeats) | Yes | CC BY-SA 4.0 |
| Word meanings by topic, from [Datamuse](https://www.datamuse.com/api/) (Wiktionary and WordNet definitions); falls back to Word Quest's words offline | Yes | CC BY-SA / WordNet |

In the quiz editor, **Randomizer** picks the source and replaces or adds questions, and
**New set** fetches another batch from the same source. The vocabulary editor has
**Random words**. Fetched questions become ordinary questions in the game, so the game itself
still plays offline; the student player's **New set** button draws a different round from
the bank every time. On the Play page, random quizzes fetch a fresh set on every **New set**.

## Quick games (templates)

| Template | What students do | Where the variety comes from |
| --- | --- | --- |
| Quiz | Multiple choice, true/false, short answer, ordering, matching | A bank bigger than a round; unseen questions first |
| Maths | Number pad or four choices | 21 generators (tables, fractions, decimals, percentages, solve for x, area, time, word problems…) make new problems every round |
| Grammar | Tap the mistake and fix it, fill the gap, right or wrong, unscramble | Bank rotation |
| Vocabulary | Meaning ↔ word, complete the sentence, spelling tiles, listening, opposites, translation, matching pairs | Every word × every activity |
| Reading | Read (with read-aloud), then answer | Teacher/AI questions plus automatic gap fills, sentence ordering, "did the text say this?" and glossary questions; long texts split into parts, one per round |
| Your own game | Anything the assistant writes as one HTML file | Up to the game |

Every round shuffles. After a round, students can **practise their mistakes**; maths
regenerates fresh problems of the kinds they got wrong. Rounds can have a timer and
hearts. Player buttons come in English, Hindi, French and Spanish, and read-aloud
uses the phone's voices (the Android app uses the system text-to-speech).

Texts for reading games can be pasted or uploaded as `.txt`, `.md`, `.html`, `.docx`,
`.odt` or `.pdf` (pdf.js loads only when a PDF is uploaded).

To give students new questions, the teacher adds to the game and sends the link again,
or builds the APK again: the same app id with a higher version installs as an update
and keeps the student's progress.

## Game Lab: built on Scratch, with more

The Game Lab uses **Scratch 3's block language**: its opcodes, inputs and project model, so
Scratch-trained students feel at home, Scratch projects (`.sb3`) open here and Game Lab
projects save back to `.sb3` (verified loading and running in scratch-vm). On top of that it
has what Scratch does not:

- **Mind map** (Map tab, `src/studio/code/mindmap.ts`): the whole game as one map. The game,
  then each character, its scripts and their steps; loops branch to the right, ifs fork into
  "yes" and "otherwise", and every "send the signal" step is linked by a dashed arrow to the
  scripts it starts. Tap a node to jump to its block; fold and unfold branches; download the
  map as SVG or PNG.
- **Palette by algorithm step**: categories hang off five branches: 1 When (Start), 2 Do
  (Move, Look, Sound, Draw), 3 Decide & repeat (Flow), 4 Check (Sense, Maths & words),
  5 Remember (Memory, My tricks).
- **Nothing gets lost under other blocks**: a script dropped on another one moves just below
  it, and **Tidy** puts every script in columns by what starts it (Play, keys, taps, signals,
  copies, tricks, loose blocks).
- **Real code**: JavaScript, HTML and CSS translated from the blocks and linked line by line.
- **Slow and Step debugging**, tap a palette block to run it, read-aloud, zoom, high-contrast
  blocks and an easy-to-read font.
- **Exports**: an app `.html` that plays offline and reopens for editing, a link, an Android
  app, a web project `.zip`, a Scratch `.sb3`, and the project `.json`.

The blocks have their own look ("rail cards", `src/studio/code/renderer.ts`) and plain
wording (Start, Move, Look, Sound, Flow, Sense, Maths & words, Memory, My tricks, Draw;
characters, outfits, scene).

Built on:

- **Blockly** (Apache-2.0) with the continuous toolbox.
- **Leopard** (MIT) for drawing, collisions, pen and sound, under a scheduler in
  `src/code/runtime.ts` that follows scratch-vm's timing and value rules (`src/code/cast.ts`).
- `src/code/compiler.ts` turns each target's scripts into generator methods for that runtime.
- `src/code/sb3.ts` (import) and `src/code/sb3export.ts` (export, with assets named by MD5).

Characters are Zo, the DecentralSchool elephant, drawn in code (`src/code/art/zo.ts`), with
28 jobs and six poses each, plus 33 things, 14 backdrops and 25 synthesised sounds, so
projects need no image or audio files.

### Blocks and real code

Every project can also be seen as a plain web page, translated from the blocks by
`src/code/web/translate.ts`:

- **index.html**: the stage, with each sprite as an `<img>` and variables as watchers.
- **style.css**: where each sprite starts (x: 0, y: 0 is `left: 240px; top: 180px`), its
  size as a width, the backdrop.
- **script.js**: the scripts in modern JavaScript (`zo.whenFlagClicked(async (me) => { … })`,
  `await wait(1)`, `while (true) { …; await nextFrame(); }`).
- **web.js** (`src/code/web/web.js`): the short, readable library script.js uses. Moving a
  sprite there visibly sets CSS `left`/`top`.

In the editor, the **{ } JavaScript** button on the Code tab shows script.js under the
blocks. Selecting a block lights up its lines; clicking a line selects its block (and
switches sprite if needed). The **Web** tab shows the three files, editable, beside the
page running live; once a file is edited it's the student's own until "Make again from
blocks". Eight **Connect the dots** challenges are ticked off automatically. **Save &
share → Web project (.zip)** gives the files with pictures and sounds, to open in any
editor and browser.

This is a translation for learning, not the Scratch runtime: touching uses boxes around
pictures, and blocks with no web version (colour sensing, loudness, sound effects, some
graphic effects) become comments and are listed under "Not in the web version".

### Drawing, Scratch files, search and debugging

- **Paint editor** (`src/code/paint.ts`, `src/studio/code/Paint.tsx`): "Draw" and "Change the
  drawing" on the Outfits/Backgrounds tab. Vector shapes on a 480 × 360 board: brush,
  line, rectangle, circle, words, fill, eraser, select/move/resize, layers, copy, colours
  and line width, the turning point (rotation centre), undo/redo, zoom; mouse, pen or
  finger. The shapes are kept with the outfit so it can be edited again; existing
  pictures (Zo, uploads) come in as one movable picture to draw over. Outfits are saved
  cropped to what's drawn.
- **Open Scratch projects (.sb3)** (`src/code/sb3.ts`, "Open a file" on the Game Lab
  home): scripts carry over block for block (Game Lab keeps Scratch's opcodes), with
  custom blocks and their inputs, variables, lists and their stage displays, signals,
  costumes (vector, and bitmaps at either resolution) and sounds. Blocks from extensions
  (Music, Video…) are left out and listed. Overlapping scripts are spread out on load.
- **Find a block**: the search box at the workspace's top-left (or press `/`) fills the
  palette with matching blocks; it also knows Scratch's words ("forever", "broadcast",
  "costume", "variable").
- **Debugger**: under the scene, Normal / Slow / Step. Slow runs with a pause before every
  block and outlines the block running; Step runs one block per "Next block". Editor
  builds put a pause point before each block (`yield* this.rt.dbg(id)` in the compiled
  code); exported games don't.
- **Tap a block in the palette** to run it once on the selected character (reporters show
  their value), as in Scratch.
- Changing blocks while a game runs turns Play into **Restart** (the running game keeps
  the code it started with).

## Zo Wants to Learn

`#/learn`: students teach Zo from their own data. It looks like real model training because
it is real: four tiny models train in the browser in a second or two, so every curve, score
and mistake on screen actually happened. No AI service is involved.

| Mode | What Zo learns | Model (`src/learn/`) |
| --- | --- | --- |
| Sort | text → a label | softmax regression on words and/or letter groups, SGD (`classifier.ts`) |
| Reply | question → answer | the same classifier, with "I haven't learned that yet" below 40% confidence |
| Write | text → more text | word n-gram model with Witten–Bell smoothing; loss in bits per word (`writer.ts`) |
| Predict | number → number | straight line, curve or wiggly bumps by gradient descent with Adam (`regression.ts`) |

Six steps, each with its own Zo (baby, detective, chef, student, teacher, graduate/robot), a
one-line speech bubble and a "Zo asks" question:

1. **Feed**: type, paste (CSV/TSV), or upload .csv/.txt/.docx/.odt/.pdf. Seven example datasets
   ship with deliberate mistakes.
2. **Clean**: data checks with one-click fixes and undo (`clean.ts`): missing values, extra
   spaces, emails/phone numbers, links, rows without words, duplicates, contradicting labels,
   label typos ("hapy" → "happy"), rare labels, imbalance, values that aren't numbers ("7 hrs",
   "five"), outliers, too little data.
3. **Split**: practice/test share and a seeded, per-label shuffle (`split.ts`).
4. **Train**: rounds, learning speed, features / shape / context length, "keep it simple" (L2).
   Live loss and score charts for practice vs test, a Stop button (early stopping), automatic
   overfitting detection, and an experiment log of past runs.
5. **Test**: score, confusion table, Zo's mistakes, what Zo looks for (strongest weights), and a
   "try it" box that explains which words pushed the answer. Predict warns when asked outside
   the practised range; Write has a creativity (temperature) slider, next-word chances and a
   "copied word for word" share.
6. **Use**: a model card (made by / good at / not good at), 11 badges, and the trained Zo as an
   offline app: an .html file or an APK. The app (`src/learnplayer`, compiled through
   `virtual:learn-runtime`) carries the model and card only, not the training data.

Projects live in IndexedDB (store `models`, database version 3). Chart colours (practice blue,
test orange) were checked with the dataviz palette validator against both themes.

### Class work without a server


1. **Challenge** (teacher, `#/class/challenge/<id>`): what to make, a starter game (empty,
   an example, or one of the teacher's own), steps with optional automatic checks (uses a
   loop / an if / a memory box, reacts to a key, has 2+ characters…) and hints, and
   optionally only some block categories for beginners. Sent as a link (`#/join/…`, the
   challenge compressed after the `#`), a QR code, or a small challenge `.html` file.
2. **Mission** (student): joining makes the student's own copy. In Game Lab a mission card
   beside the scene lists the steps; checked steps tick themselves as the blocks change.
3. **Hand in:** the game's own app file (it plays when opened) with the hand-in inside,
   sent through the phone's share sheet (WhatsApp, email, Classroom…) or downloaded.
4. **Review** (teacher, Class → Hand-ins): drop in the files, play each game, open its
   blocks, give stars, "approved" or "try again" and a comment. The feedback goes back as
   a short link (`#/feedback/…`); opening it adds it to the student's mission.
5. **Class gallery:** approved games in one offline `.html` page (the game player stored
   once), shared with the class.

## Creating a game from a file (no AI)

On **Create a game**, **Upload your lesson file or a pre-existing HTML game file** turns a
file into a game straight away, with the phone preview beside it and one-click Android
app, offline file and link.

- **An HTML game** (`.html`, or its folder as a `.zip`) is kept exactly as it is
  (`src/studio/lesson/htmlGame.ts`). From a `.zip`, scripts, styles, pictures, sounds and
  fonts are folded into the page, and files the game fetches at run time (a `content.json`)
  are answered from memory, so it plays offline and inside the APK. Files that weren't
  uploaded and anything loaded from the internet are pointed out.
- **A lesson plan or worksheet** (`.docx`, `.pdf`, `.odt`, `.txt`, `.md`, or a plain `.html`
  page) is read without AI (`src/studio/lesson/detect.ts`) and made into the template it fits
  best, with a one-tap switch to the others:

| Kind | What it looks for |
| --- | --- |
| Story to read | the longest run of prose paragraphs (objectives and notes around it are left out); questions and word lists beside it become comprehension questions and a glossary |
| Quiz | numbered questions with a) b) c) options, answers marked with `*`, "Answer: b" or an answer key ("1. a 2. c"); "True or false: … – True"; "Q: … A: …" |
| Maths | sums such as `6 × 7 =`, `48 ÷ 6 = ___` (answers worked out), and the topics named (times tables, fractions, percentages, area, time…) with the numbers used, for fresh problems each round |
| Grammar | gap sentences with choices, "She ___ (go / goes*) …"; "Incorrect: … / Correct: …" pairs become "tap the mistake and fix it" |
| Vocabulary | "word – meaning" lists, with examples after "e.g." |

  The language (English, French, Spanish, Hindi) sets the player's buttons and voice.
  Questions without a marked answer are counted, so the teacher can tick them in the editor.

## Creating a game with AI (optional)

Teachers press **Create a game** (`#/new`), describe the game or add a lesson file, and
press **Connect & create**. The first time, they sign in or sign up at OpenRouter and come
straight back; the idea is sent on its own. The assistant writes the game in the studio's
own format (or as one HTML file for "your own game"), it appears in a phone preview, and the
bar above the chat makes the **Android app**, the **offline file** or the **link** in one
click. Every question stays editable in the editor, and asking for changes updates the same
game, so a rebuilt app installs as an update.

- **Sign-in:** OpenRouter's OAuth with PKCE and a `state` check, straight from the browser
  (`src/studio/ai/openrouter.ts`). No app registration, client id or secret is needed: the
  callback is the studio's own address. The key is stored only in that teacher's browser.
- **Models:** by default the studio ranks OpenRouter's free models itself (big general chat
  models first) and sends the top three, so OpenRouter falls back if one is busy. It doesn't
  use `openrouter/free`, which picks at random and can land on non-chat models such as a
  safety classifier (replies like "User Safety: safe"). Classifier, music and embedding
  models are left out of the model list, and a classifier's verdict is reported as an error.
  Teachers can pick a model in Settings, or paste a key they made at openrouter.ai.
- **Limits:** OpenRouter's free models allow 20 requests a minute and 50 a day per account,
  or 1000 a day once the account has bought at least 10 credits. Paid models use the
  teacher's own credits.

## Exports

| What | Formats |
| --- | --- |
| Quick games | link, offline `.html`, Android `.apk`, QR code, game `.json`, spreadsheet `.csv`, Moodle GIFT |
| Game Lab projects | app `.html`, link, `.apk`, web project `.zip`, Scratch `.sb3`, `.json`, mind map `.svg`/`.png` |
| Zo's models | app `.html`, `.apk` |
| Library games | single-file `.html`, or a copy as any quick game above |
| Class | challenge links and `.html`, hand-in files, feedback links, class gallery `.html` |
| Everything | studio backup `.json` (Settings) |

## Offline first and privacy

- The studio registers a service worker (`dist/sw.js`, made by `vite.config.ts` at build time)
  that stores every built file and library game on the first visit; after that the studio,
  the Game Lab, Zo and the library open with no connection.
- Teachers' games, class work, Zo's models and the app-signing key live in the browser's
  IndexedDB. Nothing is sent to a server.
- The studio needs a signed-in account (Google; Microsoft once its secrets are set). Mission,
  Privacy, Terms, the players at `/p/` and `/c/`, downloads and APKs stay open. The gate is
  in the browser (`PUBLIC` in `App.tsx`): there is nothing on the server to protect, since
  games stay on the device. The server keeps a name, an email, the provider account id
  and session tokens; photos, provider access tokens, IP addresses and user agents are
  dropped before they reach the database (`databaseHooks` in `worker/auth.ts`). Keep
  `src/studio/pages/PrivacyPage.tsx` in step with that file.
- A game link looks like `https://decentralschool.org/p/#g1.…`: the game is compressed into
  the part after `#`, which browsers never send to a server. Student pages have a
  Content-Security-Policy that blocks every network request.
- The only network calls the studio makes are the ones a teacher asks for: the randomizer's
  sources, the optional AI assistant (OpenRouter, signed in with OAuth/PKCE from the
  browser, each teacher's own key in `localStorage`), and, on a device that has signed in,
  a session check against `/api/auth`.

## Run it

```bash
cd DecentralSchool
npm install
npm run dev          # http://localhost:5173, student player at /p/, Game Lab player at /c/
npm run build        # dist/: studio, /p/, /c/, sw.js, library
npm run dev:api      # the sign-in Worker on :8787 (Vite proxies /api to it); needs .dev.vars
npm run deploy       # build + D1 migrations + wrangler deploy to decentralschool.org (needs `npx wrangler login` once)
```

## Accounts (Better Auth on Cloudflare)

Sign-in runs in the same Worker that serves the site, with [Better Auth](https://better-auth.com)
(MIT) and a D1 database called `decentralschool`, all on Cloudflare's free plan. The Worker
only runs for `/api/*`; every other path is a static file. Sign-in is Google (Microsoft is
wired up and switches on when its two secrets exist; add it back to `PROVIDERS` in
`SignIn.tsx`)
only: there are no passwords, so nothing needs a "forgot password" email (Cloudflare's free
plan can't send email to arbitrary addresses).

| File | What |
| --- | --- |
| `worker/auth.ts` | Better Auth options: providers, sessions (30 days, 5-minute cookie cache), what is dropped |
| `worker/index.ts` | `/api/auth/*` handler; a daily cron deletes expired sessions |
| `migrations/` | D1 schema. After changing `worker/auth.ts`, run `npm run auth:schema` and save new SQL as the next migration |
| `src/studio/account.ts` | Client: sign in/out, delete, the account cached in `localStorage` for offline |
| `src/studio/components/SignIn.tsx` | Provider buttons and `#/signin` |

### Google

1. [console.cloud.google.com](https://console.cloud.google.com): create a project.
2. **Google Auth Platform → Branding**: app name, support email, home page
   `https://decentralschool.org`, privacy policy `https://decentralschool.org/privacy`, terms
   `https://decentralschool.org/terms`,
   authorised domain `decentralschool.org`.
3. **Audience**: External, then **Publish app**. While it says "Testing", only listed test
   users (at most 100) can sign in. Only `openid`, `email` and `profile` are requested, so
   Google doesn't need to review the app.
4. **Clients → Create client → Web application**:
   - Authorised JavaScript origins: `https://decentralschool.org`, `http://localhost:5173`
   - Authorised redirect URIs: `https://decentralschool.org/api/auth/callback/google`,
     `http://localhost:5173/api/auth/callback/google`
5. Keep the client ID and secret for the secrets below.

### Microsoft

1. [entra.microsoft.com](https://entra.microsoft.com) → **App registrations → New registration**.
2. Supported account types: **any organizational directory and personal Microsoft accounts**.
3. Redirect URI, platform **Web**: `https://decentralschool.org/api/auth/callback/microsoft`.
   Then under **Authentication** add `http://localhost:5173/api/auth/callback/microsoft`.
4. **Certificates & secrets → New client secret**. Copy the *Value* (not the secret ID).
   It expires (24 months at most): renew it before then or Microsoft sign-in stops.
5. **Branding & properties**: home page and privacy statement URL as for Google. Without
   publisher verification the consent screen says "unverified", and some school tenants
   don't let users approve such apps; Google sign-in still works for them.
6. Keep the **Application (client) ID** from the Overview page.

### Cloudflare (all from the terminal)

```bash
openssl rand -base64 32 | npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put MICROSOFT_CLIENT_ID
npx wrangler secret put MICROSOFT_CLIENT_SECRET
npm run deploy                                   # or push to main if Workers Builds is connected
npx wrangler deploy -c wrangler.www.jsonc        # www → bare domain, once
```

- **www**: `wrangler.www.jsonc` is a separate one-file Worker that answers
  `www.decentralschool.org` with a 301 to `decentralschool.org`. Sign-in cookies belong to
  the bare domain, so a sign-in started on `www.` couldn't finish.
- **Privacy contact** (`privacy@decentralschool.org` on the privacy page), receiving only:
  ```bash
  npx wrangler email routing enable decentralschool.org
  npx wrangler email routing addresses create you@example.com   # click the link it emails you
  npx wrangler email routing rules create decentralschool.org --name privacy \
    --match-type literal --match-field to --match-value privacy@decentralschool.org \
    --action-type forward --action-value you@example.com
  ```
- **Local dev**: copy `.dev.vars.example` to `.dev.vars` and fill it in, then run
  `npm run dev:api` beside `npm run dev`.

### Seeing who has signed up

```bash
npx wrangler d1 execute decentralschool --remote \
  --command 'select name, email, createdAt from "user" order by createdAt desc'
```

or the dashboard: **Storage & Databases → D1 → decentralschool → Console**.

Free plan limits: 500 MB per database, 5 million rows read and 100,000 rows written per day
(reset at 00:00 UTC), 100,000 Worker requests per day (static files don't count).

## Layout

```
src/shared/     game format (types.ts), normalising, round builder, maths, link codec, pages
src/player/     the student page for quick games
src/code/       Game Lab core: project format, compiler, runtime, art, sounds, .sb3 in/out;
                web/ is the HTML/CSS/JavaScript translation
src/codeplayer/ the student page for Game Lab projects
src/learn/      Zo's models; src/learnplayer/ the exported Zo app
worker/         the Cloudflare Worker: sign-in (Better Auth), session cleanup
migrations/     D1 schema
src/studio/     the studio (React)
  play/         Play page and the library
  random/       the randomizer (sources.ts) and its buttons
  code/         Game Lab editor, mind map (mindmap.ts, MapTab.tsx)
  learn/        Zo Wants to Learn
  class/        challenges, hand-ins, feedback, gallery
  pages/        home, mission, privacy, terms, quick games, assistant, settings
  apk/          zip, binary manifest, v2 signing, keys
public/library/ games that play without installing (scripts/import-games.mjs)
shell/          Android WebView shell; build_shell.sh makes shell-template.apk
```

## The Android app

`src/studio/apk/build.ts` takes `public/shell-template.apk`, rewrites the compiled
`AndroidManifest.xml` (placeholders `org.decentralschool.shell`, `SHELL_APP_LABEL`,
`SHELL_VERSION_NAME`, and `versionCode`), draws a launcher icon from the game's emoji,
adds the game page, aligns the zip and signs it with APK Signature Scheme v2 using
WebCrypto. It is a TypeScript port of the CAEB games' `tools/build_game.py` and
`tools/sign_apk.py`. Output passes `apksigner verify` and `zipalign -c` and installs on
Android 7+ (tested on an Android 16 emulator).

Each teacher's signing key is made in their browser on the first build. Updates only
install over an app signed with the same key, so Settings has **Back up key** /
**Restore**.

To change the shell (Java, manifest or `shell/res/`), install a JDK 17+ and the Android
SDK (`platforms;android-36`, `build-tools;36.1.0`), then run `npm run shell`. That
rebuilds `shell/shell-template.apk` and copies it into `public/`. Keep the manifest
placeholders and the fully qualified class names.

## Game format

`src/shared/types.ts` is the format; `src/studio/ai/prompts.ts` describes it to the
model. `src/shared/normalize.ts` turns anything roughly game-shaped (an assistant
reply, an old link, a hand-edited file) into a valid game and drops broken questions
instead of failing.

## License

DecentralSchool is free software: you can redistribute it and/or modify it under the terms
of the **GNU Affero General Public License v3.0** or later (see `LICENSE`), the same license
as Scratch's editor, virtual machine and renderer.

The Game Lab is based on Scratch, created by the Lifelong Kindergarten Group at the MIT Media
Lab and maintained by the Scratch Foundation. Scratch is a trademark of the Scratch
Foundation; DecentralSchool is an independent project and is not endorsed by it. Other
parts: Blockly (Apache-2.0), Leopard (MIT), CodeMirror (MIT), pdf.js (Apache-2.0), fflate
(MIT), Fredoka, Nunito and Atkinson Hyperlegible fonts (SIL OFL 1.1), world-countries data
(ODbL-1.0), Open Trivia Database questions (CC BY-SA 4.0). The CAEB games in
`public/library/` are included as templates.
