import { useEffect, useRef, useState } from "react";
import { costumeSvg, svgUrl } from "../../code/art";
import { newProject } from "../../code/project";
import type { CodeProject } from "../../code/types";
import { uid } from "../../shared/random";
import { Critter } from "../Critter";
import { projects as table } from "../db";
import { go, useApp } from "../store";
import { Empty, Icon, Modal } from "../ui";
import { GameCard } from "../components/GameCard";
import { projectFromFile } from "./files";
import { STARTERS } from "./starters";
import "./code.css";

/** Game Lab: projects students (and teachers) make with blocks. */
export function CodeHome() {
  const { toast } = useApp();
  const [list, setList] = useState<CodeProject[] | null>(null);
  const [deleting, setDeleting] = useState<CodeProject | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    table.all().then((all) => setList(all.sort((a, b) => b.updated - a.updated)), () => setList([]));
  }, []);

  const [report, setReport] = useState<{ project: CodeProject; skipped: [string, number][] } | null>(null);

  /** A Scratch 3 project: converted here, opened as a Game Lab game. */
  const importScratch = async (f: File) => {
    try {
      const [{ sb3ToProject }, { knownOpcodes }] = await Promise.all([import("../../code/sb3"), import("./blocks")]);
      const known = knownOpcodes();
      const { project, skipped } = sb3ToProject(new Uint8Array(await f.arrayBuffer()), f.name.replace(/\.sb3$/i, ""), (op) => known.has(op), uid());
      await table.put(project);
      if (skipped.size) setReport({ project, skipped: [...skipped] });
      else go(`code/${project.id}`);
    } catch (e) {
      toast((e as Error).message || "Couldn't open that Scratch project.", "error");
    }
  };

  const open = async (p: CodeProject) => {
    await table.put(p);
    go(`code/${p.id}`);
  };

  return (
    <div className="page">
      <section className="hero code-hero">
        <div className="hero-critters" aria-hidden>
          <img src={svgUrl(costumeSvg({ id: "", name: "", ref: { lib: "zo", id: "zo", pose: "wave" }, cx: 0, cy: 0 }))} alt="" width={96} height={120} />
        </div>
        <div className="hero-text">
          <h1>Game Lab</h1>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => open(newProject("Untitled"))}>
              <Icon name="plus" size={18} /> New game
            </button>
            <button className="btn btn-ghost" onClick={() => file.current?.click()}>
              <Icon name="upload" size={18} /> Open a file
            </button>
            <input
              ref={file}
              type="file"
              accept=".html,.htm,.json,.sb3"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (f.name.toLowerCase().endsWith(".sb3")) return importScratch(f);
                try {
                  const p = await projectFromFile(f);
                  const taken = list?.some((x) => x.id === p.id);
                  await open(taken ? { ...p, id: uid(), title: `${p.title} (copy)` } : p);
                } catch {
                  toast("That file isn't a Game Lab game.", "error");
                }
              }}
            />
          </div>
        </div>
      </section>

      <div className="page-head">
        <h2 className="section-title">Start from an example</h2>
      </div>
      <div className="play-grid">
        {STARTERS.map((s) => (
          <GameCard key={s.id} title={s.title} blurb={s.blurb} tags={["Example"]} cover={{ img: s.thumb(), framed: true }} tint="mint" badge={{ label: "Open", icon: "edit" }} onOpen={() => open(s.make())} />
        ))}
      </div>

      <div className="page-head">
        <h2 className="section-title">My games</h2>
      </div>
      {list && list.length ? (
        <div className="play-grid">
          {list.map((p) => {
            const sprite = p.sprites[0];
            const thumb = sprite?.costumes[sprite.costume] || p.stage.costumes[p.stage.costume];
            return (
              <GameCard
                key={p.id}
                title={p.title}
                blurb={`${p.sprites.length} sprite${p.sprites.length === 1 ? "" : "s"} · ${new Date(p.updated).toLocaleDateString()}`}
                tags={["Game Lab"]}
                cover={thumb ? { img: svgUrl(costumeSvg(thumb)), framed: true } : { emoji: "🎮" }}
                tint="mint"
                href={`#/code/${p.id}`}
                badge={{ label: "Open", icon: "edit" }}
                actions={
                  <>
                    <span className="spacer" />
                    <button className="icon-btn icon-btn-sm danger-hover" aria-label={`Delete ${p.title}`} onClick={() => setDeleting(p)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </>
                }
              />
            );
          })}
        </div>
      ) : list ? (
        <div className="card is-quiet">
          <Empty critter={<Critter kind="dino" color="mint" size={84} mood="happy" />}>No games yet.</Empty>
        </div>
      ) : null}

      {report && (
        <Modal
          title="Opened, with some blocks left out"
          onClose={() => go(`code/${report.project.id}`)}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-primary" onClick={() => go(`code/${report.project.id}`)}>
                Open it
              </button>
            </>
          }
        >
          <p>Game Lab doesn't have these Scratch blocks yet, so they were left out:</p>
          <ul className="skipped-list">
            {report.skipped.map(([op, n]) => (
              <li key={op}>
                <code>{op}</code> × {n}
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {deleting && (
        <Modal
          title={`Delete “${deleting.title}”?`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>
                Keep it
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  await table.remove(deleting.id);
                  setList((l) => (l || []).filter((x) => x.id !== deleting.id));
                  setDeleting(null);
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p>Files and apps you already shared keep working.</p>
        </Modal>
      )}
    </div>
  );
}
