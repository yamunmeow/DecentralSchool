import { BACKDROP_LIBRARY, costumeSvg, svgUrl } from "../../code/art";
import { blk, colour, menu, num, put, script, sub, txt, v, workspace } from "../../code/dsl";
import { newProject, spriteFromLibrary } from "../../code/project";
import type { CodeProject } from "../../code/types";
import { uid } from "../../shared/random";

/** Small finished projects to open, play and take apart. */

const backdrop = (id: string) => BACKDROP_LIBRARY.find((b) => b.id === id)!.costume();

function base(title: string, backdropId: string): CodeProject {
  const p = newProject(title);
  p.stage = { ...p.stage, costumes: [backdrop(backdropId)], variables: [] };
  p.sprites = [];
  p.broadcasts = [];
  return p;
}

function hello(): CodeProject {
  const p = base("Zo says hello", "park");
  const zo = spriteFromLibrary("zo", [], { x: -150, y: -60, size: 80 });
  zo.name = "Zo";
  zo.sounds = [{ id: uid(), name: "pop", synth: "pop" }, { id: uid(), name: "Trumpet (Zo)", synth: "trumpet" }];
  zo.blocks = workspace(
    script(40, 40,
      blk("event_whenflagclicked"),
      blk("motion_gotoxy", { X: num(-150), Y: num(-60) }),
      blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo stand") }),
      blk("control_repeat", { TIMES: num(15, "math_whole_number"), SUBSTACK: sub(
        blk("motion_movesteps", { STEPS: num(10) }),
        blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo walk 1") }),
        blk("control_wait", { DURATION: num(0.1, "math_positive_number") }),
        blk("motion_movesteps", { STEPS: num(10) }),
        blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo walk 2") }),
        blk("control_wait", { DURATION: num(0.1, "math_positive_number") }),
      ) }),
      blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo wave") }),
      blk("looks_sayforsecs", { MESSAGE: txt("Hello! I'm Zo. Click me!"), SECS: num(3) }),
      blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo stand") }),
    ),
    script(40, 520,
      blk("event_whenthisspriteclicked"),
      blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo cheer") }),
      blk("sound_play", { SOUND_MENU: menu("sound_sounds_menu", "SOUND_MENU", "Trumpet (Zo)") }),
      blk("looks_sayforsecs", { MESSAGE: txt("Yay!"), SECS: num(1) }),
      blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo stand") }),
    ),
  );
  p.sprites = [zo];
  return p;
}

function catcher(): CodeProject {
  const p = base("Catch the mangoes", "park");
  const score = uid();
  p.stage.variables = [{ id: score, name: "score", value: 0 }];
  p.stage.watchers = { [score]: { visible: true, x: -232, y: 172 } };
  const zo = spriteFromLibrary("footballer", [], { x: 0, y: -120, size: 60 });
  zo.name = "Zo";
  zo.blocks = workspace(
    script(40, 40,
      blk("event_whenflagclicked"),
      blk("motion_gotoxy", { X: num(0), Y: num(-120) }),
      blk("control_forever", { SUBSTACK: sub(
        blk("control_if", { CONDITION: { block: blk("sensing_keypressed", { KEY_OPTION: menu("sensing_keyoptions", "KEY_OPTION", "left arrow") }) }, SUBSTACK: sub(blk("motion_changexby", { DX: num(-10) })) }),
        blk("control_if", { CONDITION: { block: blk("sensing_keypressed", { KEY_OPTION: menu("sensing_keyoptions", "KEY_OPTION", "right arrow") }) }, SUBSTACK: sub(blk("motion_changexby", { DX: num(10) })) }),
        blk("control_if", { CONDITION: { block: blk("sensing_mousedown") }, SUBSTACK: sub(blk("motion_setx", { X: put(blk("sensing_mousex"), num(0)) })) }),
      ) }),
    ),
  );
  const mango = spriteFromLibrary("mango", ["Zo"], { x: 0, y: 170, size: 80 });
  mango.sounds = [{ id: uid(), name: "Coin", synth: "coin" }];
  const randomX = () => put(blk("operator_random", { FROM: num(-220), TO: num(220) }), num(0));
  mango.blocks = workspace(
    script(40, 40,
      blk("event_whenflagclicked"),
      blk("data_setvariableto", { VALUE: txt("0") }, { VARIABLE: v(score) }),
      blk("motion_gotoxy", { X: randomX(), Y: num(170) }),
      blk("control_forever", { SUBSTACK: sub(
        blk("motion_changeyby", { DY: num(-6) }),
        blk("control_if", { CONDITION: { block: blk("sensing_touchingobject", { TOUCHINGOBJECTMENU: menu("sensing_touchingobjectmenu", "TOUCHINGOBJECTMENU", "Zo") }) }, SUBSTACK: sub(
          blk("data_changevariableby", { VALUE: num(1) }, { VARIABLE: v(score) }),
          blk("sound_play", { SOUND_MENU: menu("sound_sounds_menu", "SOUND_MENU", "Coin") }),
          blk("motion_gotoxy", { X: randomX(), Y: num(170) }),
        ) }),
        blk("control_if", { CONDITION: { block: blk("operator_lt", { OPERAND1: put(blk("motion_yposition")), OPERAND2: txt("-170") }) }, SUBSTACK: sub(
          blk("motion_gotoxy", { X: randomX(), Y: num(170) }),
        ) }),
      ) }),
    ),
  );
  p.sprites = [zo, mango];
  return p;
}

function spiral(): CodeProject {
  const p = base("Pen spiral", "white");
  const step = uid();
  const zo = spriteFromLibrary("artist", [], { size: 40 });
  zo.name = "Zo";
  zo.variables = [{ id: step, name: "step", value: 1 }];
  zo.blocks = workspace(
    script(40, 40,
      blk("event_whenflagclicked"),
      blk("pen_clear"),
      blk("motion_gotoxy", { X: num(0), Y: num(0) }),
      blk("motion_pointindirection", { DIRECTION: num(90, "math_angle") }),
      blk("data_setvariableto", { VALUE: txt("1") }, { VARIABLE: v(step) }),
      blk("pen_setPenColorToColor", { COLOR: colour("#6c5fcf") }),
      blk("pen_setPenSizeTo", { SIZE: num(3) }),
      blk("pen_penDown"),
      blk("control_repeat", { TIMES: num(140, "math_whole_number"), SUBSTACK: sub(
        blk("motion_movesteps", { STEPS: put(blk("data_variable", {}, { VARIABLE: v(step) }), num(10)) }),
        blk("motion_turnright", { DEGREES: num(91) }),
        blk("data_changevariableby", { VALUE: num(2) }, { VARIABLE: v(step) }),
        blk("pen_changePenColorParamBy", { COLOR_PARAM: menu("pen_menu_colorParam", "COLOR_PARAM", "color"), VALUE: num(2) }),
      ) }),
      blk("pen_penUp"),
    ),
  );
  p.sprites = [zo];
  return p;
}

function quiz(): CodeProject {
  const p = base("Quiz bot", "classroom");
  const zo = spriteFromLibrary("teacher", [], { x: 120, y: -40, size: 90 });
  zo.name = "Zo";
  zo.blocks = workspace(
    script(40, 40,
      blk("event_whenflagclicked"),
      blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo Teacher stand") }),
      blk("sensing_askandwait", { QUESTION: txt("What is 7 × 8?") }),
      blk("control_if_else", {
        CONDITION: { block: blk("operator_equals", { OPERAND1: put(blk("sensing_answer")), OPERAND2: txt("56") }) },
        SUBSTACK: sub(
          blk("looks_switchcostumeto", { COSTUME: menu("looks_costume", "COSTUME", "Zo Teacher cheer") }),
          blk("looks_sayforsecs", { MESSAGE: txt("Correct! 🎉"), SECS: num(2) }),
        ),
        SUBSTACK2: sub(blk("looks_sayforsecs", { MESSAGE: put(blk("operator_join", { STRING1: txt("Not quite. It is "), STRING2: txt("56") })), SECS: num(2) })),
      }),
    ),
  );
  p.sprites = [zo];
  return p;
}

const thumbOf = (make: () => CodeProject) => () => {
  const p = make();
  const s = p.sprites[0];
  return svgUrl(costumeSvg(s.costumes[s.costume]));
};

export const STARTERS = [
  { id: "hello", title: "Zo says hello", blurb: "Walk, talk and react to clicks", make: hello },
  { id: "catch", title: "Catch the mangoes", blurb: "A game with a score", make: catcher },
  { id: "spiral", title: "Pen spiral", blurb: "Draw with maths", make: spiral },
  { id: "quiz", title: "Quiz bot", blurb: "Ask a question, check the answer", make: quiz },
].map((s) => ({ ...s, thumb: thumbOf(s.make) }));
