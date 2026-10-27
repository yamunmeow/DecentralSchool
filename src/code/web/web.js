// web.js: the small library behind script.js.
// It turns ideas from the blocks (sprites, x and y, costumes, "when flag clicked")
// into plain web page code: sprites are <img> elements and moving one changes its CSS.
// Read it to see how each block works on the web.

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;
const stage = document.querySelector("#stage");

/* ---------- running and stopping ---------- */

// Every script runs as an async function. Stopping makes the next "await" throw,
// which ends the script.
let generation = 0;
const STOP = new Error("stopped");
const flagHandlers = [];
const messageHandlers = {};
const keyHandlers = [];

function run(handler, me) {
  Promise.resolve()
    .then(() => handler(me))
    .catch((error) => {
      if (error !== STOP) console.error(error);
    });
}

// Wait for the next screen update (about 60 times a second).
function nextFrame() {
  const started = generation;
  return new Promise((resolve, reject) => {
    requestAnimationFrame(() => (started === generation ? resolve() : reject(STOP)));
  });
}

// Wait some seconds.
async function wait(seconds) {
  const end = performance.now() + Number(seconds) * 1000;
  do await nextFrame();
  while (performance.now() < end);
}

// Wait until a condition becomes true.
async function waitUntil(condition) {
  while (!condition()) await nextFrame();
}

function whenFlagClicked(handler) {
  flagHandlers.push({ handler, me: null });
}

function whenStageClicked(handler) {
  stage.addEventListener("pointerdown", (event) => {
    if (!event.target.classList.contains("sprite")) run(handler, null);
  });
}

// "when timer > 10": checked on every screen update.
function whenTimerGreaterThan(seconds, handler, me = null) {
  let was = false;
  const check = () => {
    const now = timer() > seconds;
    if (now && !was) run(handler, me);
    was = now;
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

function stopAll() {
  generation++;
  stopAllSounds();
  for (const s of Sprite.all.slice()) {
    if (s.isClone) s.deleteClone();
    else s.say("");
  }
  closeAsk();
}

function startAll() {
  stopAll();
  resetTimer();
  for (const { handler, me } of flagHandlers) run(handler, me);
}

/* ---------- messages ---------- */

function whenIReceive(message, handler, me = null) {
  const key = String(message).toLowerCase();
  (messageHandlers[key] = messageHandlers[key] || []).push({ handler, me });
}

function broadcast(message) {
  const list = messageHandlers[String(message).toLowerCase()] || [];
  return Promise.all(list.map(({ handler, me }) => Promise.resolve().then(() => handler(me)).catch((e) => e !== STOP && console.error(e))));
}

async function broadcastAndWait(message) {
  const started = generation;
  await broadcast(message);
  if (started !== generation) throw STOP;
}

/* ---------- keyboard and mouse ---------- */

const KEY_NAMES = { " ": "space", ArrowUp: "up arrow", ArrowDown: "down arrow", ArrowLeft: "left arrow", ArrowRight: "right arrow", Enter: "enter" };
const keysDown = new Set();
const keyName = (event) => KEY_NAMES[event.key] || event.key.toLowerCase();

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const key = keyName(event);
  if (key === "space" || key.endsWith("arrow")) event.preventDefault();
  keysDown.add(key);
  for (const { key: wanted, handler, me } of keyHandlers) if (wanted === key || wanted === "any") run(handler, me);
});
document.addEventListener("keyup", (event) => keysDown.delete(keyName(event)));

function keyPressed(key) {
  return key === "any" ? keysDown.size > 0 : keysDown.has(key);
}

function whenKeyPressed(key, handler, me = null) {
  keyHandlers.push({ key, handler, me });
}

// The mouse in stage units: x from -240 to 240, y from -180 to 180.
const mouse = { x: 0, y: 0, down: false };
function updateMouse(event) {
  const box = stage.getBoundingClientRect();
  mouse.x = Math.round(((event.clientX - box.left) / box.width) * STAGE_WIDTH - STAGE_WIDTH / 2);
  mouse.y = Math.round(STAGE_HEIGHT / 2 - ((event.clientY - box.top) / box.height) * STAGE_HEIGHT);
}
stage.addEventListener("pointermove", updateMouse);
stage.addEventListener("pointerdown", (event) => {
  updateMouse(event);
  mouse.down = true;
});
document.addEventListener("pointerup", () => (mouse.down = false));

/* ---------- variables ---------- */

// Variables for all sprites. Changing one updates its watcher on the stage.
const vars = watchedVariables(stage);

function watchedVariables(owner) {
  return new Proxy(
    {},
    {
      set(target, name, value) {
        target[name] = value;
        for (const out of owner.querySelectorAll(`.watcher[data-var="${String(name)}"] output`)) out.textContent = Array.isArray(value) ? value.join(" ") : value;
        return true;
      },
    },
  );
}

function showVariable(name, visible = true) {
  for (const w of stage.querySelectorAll(`.watcher[data-var="${name}"]`)) w.hidden = !visible;
}

/* ---------- maths that works like Scratch ---------- */

// pick random 1 to 10: whole numbers if both ends are whole.
function random(from, to) {
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  if (Number.isInteger(Number(from)) && Number.isInteger(Number(to))) return low + Math.floor(Math.random() * (high - low + 1));
  return low + Math.random() * (high - low);
}

// Scratch's mod is never negative for a positive divisor; JavaScript's % can be.
function mod(a, b) {
  const result = Number(a) % Number(b);
  return result / Number(b) < 0 ? result + Number(b) : result;
}

function contains(text, part) {
  return String(text).toLowerCase().includes(String(part).toLowerCase());
}

// Scratch's sin, cos and tan use degrees; JavaScript's Math uses radians.
const degrees = {
  sin: (d) => Math.round(Math.sin((d * Math.PI) / 180) * 1e10) / 1e10,
  cos: (d) => Math.round(Math.cos((d * Math.PI) / 180) * 1e10) / 1e10,
  tan: (d) => Math.round(Math.tan((d * Math.PI) / 180) * 1e10) / 1e10,
  asin: (n) => (Math.asin(n) * 180) / Math.PI,
  acos: (n) => (Math.acos(n) * 180) / Math.PI,
  atan: (n) => (Math.atan(n) * 180) / Math.PI,
};

let timerStart = performance.now();
const timer = () => (performance.now() - timerStart) / 1000;
const resetTimer = () => (timerStart = performance.now());

function daysSince2000() {
  return (Date.now() - new Date(2000, 0, 1).getTime()) / 86400000;
}

/* ---------- ask and answer ---------- */

let lastAnswer = "";
let askBox = null;
const answer = () => lastAnswer;

function ask(question) {
  closeAsk();
  return new Promise((resolve, reject) => {
    const started = generation;
    askBox = document.createElement("form");
    askBox.className = "ask";
    askBox.innerHTML = `<label></label><input autocomplete="off"><button aria-label="Answer">✓</button>`;
    askBox.querySelector("label").textContent = question;
    askBox.addEventListener("submit", (event) => {
      event.preventDefault();
      lastAnswer = askBox.querySelector("input").value;
      closeAsk();
      started === generation ? resolve(lastAnswer) : reject(STOP);
    });
    stage.append(askBox);
    askBox.querySelector("input").focus();
  });
}

function closeAsk() {
  if (askBox) askBox.remove();
  askBox = null;
}

/* ---------- sounds ---------- */

const playing = new Set();

function playFile(path, volume = 100) {
  const audio = new Audio(path);
  audio.volume = Math.max(0, Math.min(1, volume / 100));
  playing.add(audio);
  audio.addEventListener("ended", () => playing.delete(audio));
  audio.play().catch(() => playing.delete(audio));
  return audio;
}

function stopAllSounds() {
  for (const audio of playing) audio.pause();
  playing.clear();
}

/* ---------- the pen: a canvas under the sprites ---------- */

const penCanvas = document.createElement("canvas");
penCanvas.width = STAGE_WIDTH * 2;
penCanvas.height = STAGE_HEIGHT * 2;
penCanvas.className = "pen";
stage.prepend(penCanvas);
const pen = penCanvas.getContext("2d");
pen.scale(2, 2);
pen.lineCap = "round";

function eraseAll() {
  pen.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
}

/* ---------- backdrops ---------- */

class Backdrop {
  constructor(names) {
    this.names = names;
    this.number = 1;
    this.handlers = [];
  }
  get name() {
    return this.names[this.number - 1];
  }
  switchTo(name) {
    const index = typeof name === "number" ? name - 1 : this.names.indexOf(name);
    if (name === "next backdrop") this.number = (this.number % this.names.length) + 1;
    else if (name === "previous backdrop") this.number = ((this.number - 2 + this.names.length) % this.names.length) + 1;
    else if (name === "random backdrop") this.number = 1 + Math.floor(Math.random() * this.names.length);
    else if (index >= 0) this.number = (((index % this.names.length) + this.names.length) % this.names.length) + 1;
    stage.style.backgroundImage = `url("backdrops/${this.name}.svg")`;
    for (const { name: wanted, handler, me } of this.handlers) if (wanted === this.name) run(handler, me);
  }
  next() {
    this.switchTo("next backdrop");
  }
  whenSwitchesTo(name, handler, me = null) {
    this.handlers.push({ name, handler, me });
  }
}

/* ---------- sprites ---------- */

// A sprite is an <img> on the stage. Its x and y are kept here and written to the
// image's CSS left and top whenever they change.
class Sprite {
  static all = [];

  constructor(selector, { costumes = [], sounds = [] } = {}) {
    this.element = typeof selector === "string" ? document.querySelector(selector) : selector;
    this.name = this.element.id;
    this.costumes = costumes;
    this.sounds = sounds;
    this.vars = watchedVariables(stage);
    this.handlers = { flag: [], click: [], clone: [], keys: [], messages: [] };
    this.isClone = false;
    this.volume = 100;
    this.rotationStyle = "all around";
    this.effects = { ghost: 0, brightness: 0, color: 0 };
    this.penIsDown = false;
    this.penColor = "#0fbd8c";
    this.penSize = 1;
    this.bubble = null;
    this.readStartFromCss();
    this.element.addEventListener("pointerdown", () => this.handlers.click.forEach((h) => run(h, this)));
    Sprite.all.push(this);
  }

  // Where style.css puts the sprite at the start.
  readStartFromCss() {
    const css = getComputedStyle(this.element);
    this._x = parseFloat(css.left) - STAGE_WIDTH / 2;
    this._y = STAGE_HEIGHT / 2 - parseFloat(css.top);
    this._direction = 90 + (parseFloat(css.rotate) || 0);
    const natural = this.element.naturalWidth || parseFloat(css.width);
    this._size = natural ? (parseFloat(css.width) / natural) * 100 : 100;
    this.costume = this.costumes.findIndex((c) => this.element.getAttribute("src").endsWith(`/${c}.svg`)) + 1 || 1;
  }

  /* motion */
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get direction() {
    return this._direction;
  }
  goTo(x, y) {
    if (typeof x === "object") return this.goTo(x.x, x.y);
    const fromX = this._x;
    const fromY = this._y;
    // Like Scratch, keep the sprite's middle on the stage so it can't get lost.
    this._x = Math.max(-STAGE_WIDTH / 2, Math.min(STAGE_WIDTH / 2, Number(x)));
    this._y = Math.max(-STAGE_HEIGHT / 2, Math.min(STAGE_HEIGHT / 2, Number(y)));
    if (this.penIsDown) this.drawLine(fromX, fromY, this._x, this._y);
    this.draw();
  }
  goToRandomPosition() {
    this.goTo(random(-240, 240), random(-180, 180));
  }
  move(steps) {
    const radians = ((90 - this._direction) * Math.PI) / 180;
    this.goTo(this._x + steps * Math.cos(radians), this._y + steps * Math.sin(radians));
  }
  changeXBy(dx) {
    this.goTo(this._x + Number(dx), this._y);
  }
  changeYBy(dy) {
    this.goTo(this._x, this._y + Number(dy));
  }
  setX(x) {
    this.goTo(x, this._y);
  }
  setY(y) {
    this.goTo(this._x, y);
  }
  async glideTo(seconds, x, y) {
    if (typeof x === "object") return this.glideTo(seconds, x.x, x.y);
    const fromX = this._x;
    const fromY = this._y;
    const start = performance.now();
    for (;;) {
      await nextFrame();
      const t = Math.min(1, (performance.now() - start) / (seconds * 1000));
      this.goTo(fromX + (x - fromX) * t, fromY + (y - fromY) * t);
      if (t >= 1) return;
    }
  }
  pointInDirection(direction) {
    this._direction = ((((Number(direction) + 179) % 360) + 360) % 360) - 179;
    this.draw();
  }
  turnRight(degrees) {
    this.pointInDirection(this._direction + Number(degrees));
  }
  turnLeft(degrees) {
    this.pointInDirection(this._direction - Number(degrees));
  }
  pointTowards(target) {
    const t = target === "mouse" ? mouse : target;
    this.pointInDirection(90 - (Math.atan2(t.y - this._y, t.x - this._x) * 180) / Math.PI);
  }
  ifOnEdgeBounce() {
    const box = this.element.getBoundingClientRect();
    const edge = stage.getBoundingClientRect();
    if (box.left < edge.left || box.right > edge.right) this.pointInDirection(-this._direction);
    if (box.top < edge.top || box.bottom > edge.bottom) this.pointInDirection(180 - this._direction);
    this.goTo(Math.max(-240, Math.min(240, this._x)), Math.max(-180, Math.min(180, this._y)));
  }
  setRotationStyle(style) {
    this.rotationStyle = style;
    this.draw();
  }

  /* looks */
  say(text) {
    if (!this.bubble) {
      this.bubble = document.createElement("div");
      this.bubble.className = "bubble";
      stage.append(this.bubble);
    }
    this.bubble.textContent = text;
    this.bubble.hidden = text === "" || !this.visible;
    this.bubble.classList.remove("think");
    this.draw();
  }
  think(text) {
    this.say(text);
    this.bubble.classList.add("think");
  }
  async sayFor(text, seconds) {
    this.say(text);
    await wait(seconds);
    this.say("");
  }
  async thinkFor(text, seconds) {
    this.think(text);
    await wait(seconds);
    this.say("");
  }
  switchCostume(name) {
    const count = this.costumes.length;
    if (typeof name === "number") this.costume = (((Math.round(name) - 1) % count) + count) % count + 1;
    else if (this.costumes.includes(name)) this.costume = this.costumes.indexOf(name) + 1;
    else return;
    this.element.src = `costumes/${this.name}/${this.costumes[this.costume - 1]}.svg`;
  }
  nextCostume() {
    this.switchCostume(this.costume + 1);
  }
  get costumeName() {
    return this.costumes[this.costume - 1];
  }
  get size() {
    return this._size;
  }
  setSize(percent) {
    this._size = Math.max(5, Number(percent));
    this.draw();
  }
  changeSizeBy(change) {
    this.setSize(this._size + Number(change));
  }
  setEffect(name, value) {
    if (name in this.effects) this.effects[name] = Number(value);
    this.draw();
  }
  changeEffect(name, change) {
    if (name in this.effects) this.setEffect(name, this.effects[name] + Number(change));
  }
  clearEffects() {
    this.effects = { ghost: 0, brightness: 0, color: 0 };
    this.draw();
  }
  get visible() {
    return !this.element.hidden;
  }
  show() {
    this.element.hidden = false;
    this.draw();
  }
  hide() {
    this.element.hidden = true;
    this.draw();
  }
  goToFront() {
    stage.append(this.element);
  }
  goToBack() {
    penCanvas.after(this.element);
  }
  goForward(layers) {
    for (let i = 0; i < layers && this.element.nextElementSibling?.classList.contains("sprite"); i++) this.element.nextElementSibling.after(this.element);
  }
  goBackward(layers) {
    for (let i = 0; i < layers && this.element.previousElementSibling?.classList.contains("sprite"); i++) this.element.previousElementSibling.before(this.element);
  }

  // Write x, y, size, direction and effects to the image's CSS.
  draw() {
    const style = this.element.style;
    style.left = `${STAGE_WIDTH / 2 + this._x}px`;
    style.top = `${STAGE_HEIGHT / 2 - this._y}px`;
    if (this.element.naturalWidth) style.width = `${(this.element.naturalWidth * this._size) / 100}px`;
    const flip = this.rotationStyle === "left-right" && this._direction < 0;
    style.rotate = this.rotationStyle === "all around" ? `${this._direction - 90}deg` : "0deg";
    style.scale = flip ? "-1 1" : "1 1";
    style.opacity = String(1 - Math.min(100, Math.max(0, this.effects.ghost)) / 100);
    style.filter = `brightness(${1 + this.effects.brightness / 100}) hue-rotate(${this.effects.color * 1.8}deg)`;
    if (this.bubble) {
      const box = this.element.getBoundingClientRect();
      const stageBox = stage.getBoundingClientRect();
      const scale = stageBox.width / STAGE_WIDTH;
      // Beside the sprite's top right; on its left if there is no room on the right.
      const right = (box.right - stageBox.left) / scale - 10;
      const room = right + this.bubble.offsetWidth <= STAGE_WIDTH;
      this.bubble.style.left = `${room ? right : Math.max(0, (box.left - stageBox.left) / scale + 10 - this.bubble.offsetWidth)}px`;
      this.bubble.style.top = `${Math.max(this.bubble.offsetHeight, (box.top - stageBox.top) / scale - 8)}px`;
      this.bubble.hidden = this.bubble.textContent === "" || !this.visible;
    }
  }

  /* sensing */
  touching(target) {
    if (!this.visible) return false;
    const box = this.element.getBoundingClientRect();
    if (target === "edge") {
      const edge = stage.getBoundingClientRect();
      return box.left < edge.left || box.right > edge.right || box.top < edge.top || box.bottom > edge.bottom;
    }
    if (target === "mouse") {
      const s = stage.getBoundingClientRect();
      const px = s.left + ((mouse.x + 240) / STAGE_WIDTH) * s.width;
      const py = s.top + ((180 - mouse.y) / STAGE_HEIGHT) * s.height;
      return px >= box.left && px <= box.right && py >= box.top && py <= box.bottom;
    }
    // Another sprite or any of its clones: do the boxes around the pictures overlap?
    return Sprite.all.some((other) => other !== this && other.visible && (other === target || other.original === target) && overlap(box, other.element.getBoundingClientRect()));
  }
  distanceTo(target) {
    const t = target === "mouse" ? mouse : target;
    return Math.hypot(t.x - this._x, t.y - this._y);
  }

  /* sound */
  playSound(name) {
    return playFile(`sounds/${this.name}/${name}`, this.volume);
  }
  playSoundUntilDone(name) {
    const audio = this.playSound(name);
    const started = generation;
    return new Promise((resolve, reject) => audio.addEventListener("ended", () => (started === generation ? resolve() : reject(STOP))));
  }
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, Number(volume)));
  }

  /* pen */
  drawLine(x1, y1, x2, y2) {
    pen.strokeStyle = this.penColor;
    pen.lineWidth = this.penSize;
    pen.beginPath();
    pen.moveTo(STAGE_WIDTH / 2 + x1, STAGE_HEIGHT / 2 - y1);
    pen.lineTo(STAGE_WIDTH / 2 + x2, STAGE_HEIGHT / 2 - y2);
    pen.stroke();
  }
  penDown() {
    this.penIsDown = true;
    this.drawLine(this._x, this._y, this._x, this._y);
  }
  penUp() {
    this.penIsDown = false;
  }
  setPenColor(color) {
    this.penColor = color;
  }
  setPenSize(size) {
    this.penSize = Math.max(1, Number(size));
  }
  stamp() {
    const w = this.element.width;
    const h = this.element.height;
    pen.save();
    pen.translate(STAGE_WIDTH / 2 + this._x, STAGE_HEIGHT / 2 - this._y);
    pen.rotate(((this._direction - 90) * Math.PI) / 180);
    pen.drawImage(this.element, -w / 2, -h / 2, w, h);
    pen.restore();
  }

  /* events */
  whenFlagClicked(handler) {
    this.handlers.flag.push(handler);
    flagHandlers.push({ handler, me: this });
  }
  whenClicked(handler) {
    this.handlers.click.push(handler);
  }
  whenKeyPressed(key, handler) {
    whenKeyPressed(key, handler, this);
  }
  whenIReceive(message, handler) {
    this.handlers.messages.push({ message, handler });
    whenIReceive(message, handler, this);
  }
  whenIStartAsAClone(handler) {
    this.handlers.clone.push(handler);
  }
  whenBackdropSwitchesTo(name, handler) {
    backdrop.whenSwitchesTo(name, handler, this);
  }
  whenTimerGreaterThan(seconds, handler) {
    whenTimerGreaterThan(seconds, handler, this);
  }

  /* clones: a copy of the image that runs this sprite's scripts too */
  createClone() {
    const original = this.original || this;
    const element = this.element.cloneNode(true);
    element.removeAttribute("id");
    this.element.before(element);
    const copy = Object.create(Sprite.prototype);
    Object.assign(copy, this, { element, isClone: true, original, bubble: null, vars: watchedVariables(stage) });
    Object.assign(copy.vars, this.vars);
    copy.element.addEventListener("pointerdown", () => original.handlers.click.forEach((h) => run(h, copy)));
    for (const { message, handler } of original.handlers.messages) whenIReceive(message, handler, copy);
    Sprite.all.push(copy);
    copy.draw();
    original.handlers.clone.forEach((h) => run(h, copy));
  }
  deleteClone() {
    if (!this.isClone) return;
    this.element.remove();
    if (this.bubble) this.bubble.remove();
    Sprite.all.splice(Sprite.all.indexOf(this), 1);
    for (const key of Object.keys(messageHandlers)) messageHandlers[key] = messageHandlers[key].filter((h) => h.me !== this);
  }
}

function overlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/* ---------- start ---------- */

// The ▶ and ■ buttons, and the stage scaled to fit the window.
document.querySelector("#go")?.addEventListener("click", startAll);
document.querySelector("#stop")?.addEventListener("click", stopAll);

function fitStage() {
  const room = Math.min(window.innerWidth / STAGE_WIDTH, (window.innerHeight - 70) / STAGE_HEIGHT);
  stage.style.scale = String(Math.max(0.3, Math.min(room, 3)));
}
window.addEventListener("resize", fitStage);
window.addEventListener("load", () => {
  fitStage();
  for (const s of Sprite.all) {
    s.readStartFromCss();
    s.draw();
  }
});
