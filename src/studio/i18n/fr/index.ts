import ai from "./ai";
import art from "./art";
import blocks from "./blocks";
import classes from "./class";
import editor from "./editor";
import editors from "./editors";
import fame from "./fame";
import games from "./games";
import home from "./home";
import lab from "./lab";
import pages from "./pages";
import learn from "./learn";
import play from "./play";
import settings from "./settings";
import share from "./share";
import shell from "./shell";

export default { ...shell, ...home, ...games, ...editor, ...editors, ...share, ...ai, ...settings, ...play, ...blocks, ...lab, ...art, ...classes, ...learn, ...fame, ...pages } as Record<string, string>;
