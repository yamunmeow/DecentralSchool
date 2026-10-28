import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { docToSvg, emptyDoc, svgSize, type PaintDoc } from "../../code/paint";
import { BACKDROP_LIBRARY, costumeChoices, costumeSvg, SPRITE_LIBRARY, svgUrl } from "../../code/art";
import { POSE_NAMES } from "../../code/art/zo";
import { SOUND_IDS, SOUNDS, soundUrl } from "../../code/sounds";
import type { CostumeAsset, SoundAsset, Target } from "../../code/types";
import { uid } from "../../shared/random";
import { useApp } from "../store";
import { t, tc } from "../i18n";
import { Icon, Modal } from "../ui";

// The paint editor loads the first time someone draws.
const PaintEditor = lazy(() => import("./Paint").then((m) => ({ default: m.PaintEditor })));

/** An outfit or background on the paint board: its own shapes, or the picture as one shape. */
function docFor(c: CostumeAsset | null, stage: boolean): PaintDoc {
  if (!c) return emptyDoc();
  if (c.paint) return c.paint;
  const doc = emptyDoc();
  const svg = costumeSvg(c);
  const { w, h } = stage ? { w: doc.w, h: doc.h } : svgSize(svg);
  doc.shapes.push({ id: uid(), kind: "image", x: stage ? 0 : doc.cx - c.cx, y: stage ? 0 : doc.cy - c.cy, w, h, href: svgUrl(svg) });
  return doc;
}

/* ---------- pickers ---------- */

export function LibraryModal<T>({ title, items, onPick, onClose }: { title: string; items: { key: string; name: string; thumb: string; group?: string; value: () => T }[]; onPick: (v: T) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const shown = items.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal title={title} wide onClose={onClose}>
      <input className="lib-search" placeholder={t("Search")} aria-label={t("Search")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="lib-grid">
        {shown.map((i) => (
          <button
            key={i.key}
            className="lib-item"
            onClick={() => {
              onPick(i.value());
              onClose();
            }}
          >
            <img src={i.thumb} alt="" loading="lazy" />
            <span>{i.name}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/** A library picture's name in the studio's language: "Zo Chef wave" is an outfit and a pose. */
const artName = (name: string) => {
  const pose = Object.values(POSE_NAMES).find((p) => name.endsWith(` ${p}`));
  return pose ? `${t(name.slice(0, -pose.length - 1))} ${t(pose)}` : t(name);
};

// Library names are English; pictures added while the studio is in French get French names.
export const spriteItems = () =>
  SPRITE_LIBRARY.map((s) => ({ key: s.id, name: t(s.name), thumb: s.thumb, value: () => ({ ...s, name: t(s.name), costumes: () => s.costumes().map((c) => ({ ...c, name: artName(c.name) })) }) }));
export const backdropItems = () => BACKDROP_LIBRARY.map((b) => ({ key: b.id, name: t(b.name), thumb: b.thumb, value: () => ({ ...b.costume(), name: t(b.name) }) }));

/** An uploaded picture as a costume: SVG stays SVG, other images are wrapped in an SVG. */
export async function costumeFromFile(file: File): Promise<CostumeAsset> {
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "costume";
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    const svg = await file.text();
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    const vb = root.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
    const w = Number.parseFloat(root.getAttribute("width") || "") || vb?.[2] || 100;
    const h = Number.parseFloat(root.getAttribute("height") || "") || vb?.[3] || 100;
    return { id: uid(), name, svg, cx: w / 2, cy: h / 2 };
  }
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = new Image();
  img.src = data;
  await img.decode();
  // Big photos are shrunk to keep projects small enough to share.
  const k = Math.min(1, 480 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * k);
  const h = Math.round(img.naturalHeight * k);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const href = canvas.toDataURL(file.type === "image/png" || file.type === "image/gif" ? "image/png" : "image/jpeg", 0.85);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="${href}" xlink:href="${href}"/></svg>`;
  return { id: uid(), name, svg, cx: w / 2, cy: h / 2 };
}

/* ---------- costumes ---------- */

export function CostumesTab({ target, onChange }: { target: Target; onChange: (t: Target) => void }) {
  const { toast } = useApp();
  const [picking, setPicking] = useState(false);
  /** The paint editor: a new drawing, or the outfit at this index. */
  const [painting, setPainting] = useState<"new" | number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const choices = useMemo(() => (target.isStage ? backdropItems() : costumeChoices().map((c) => ({ key: c.name, name: artName(c.name), thumb: c.thumb, group: t(c.group), value: () => ({ ...c.costume(), name: artName(c.name) }) }))), [target.isStage]);
  const list = target.costumes;
  const current = list[target.costume];
  const kind = target.isStage ? "backdrop" : "costume";

  const setList = (costumes: CostumeAsset[], costume = target.costume) => onChange({ ...target, costumes, costume: Math.max(0, Math.min(costume, costumes.length - 1)) });
  const add = (c: CostumeAsset) => {
    let name = c.name;
    for (let i = 2; list.some((x) => x.name === name); i++) name = `${c.name}${i}`;
    setList([...list, { ...c, name }], list.length);
  };

  const i = target.costume;
  const word = target.isStage ? t("background") : t("outfit");
  const tools = (
    <div className="toolbar asset-bar">
      <button className="btn btn-primary btn-sm" onClick={() => setPicking(true)}>
        <Icon name="plus" size={16} /> {target.isStage ? t("Add a background") : t("Add an outfit")}
      </button>
      <button className="btn btn-soft btn-sm" onClick={() => setPainting("new")}>
        <Icon name="edit" size={16} /> {tc("paint", "Draw")}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>
        <Icon name="upload" size={16} /> {t("Upload a picture")}
      </button>
      <input
        ref={file}
        type="file"
        accept="image/*,.svg"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            add(await costumeFromFile(f));
          } catch {
            toast(t("Couldn't read that picture."), "error");
          }
        }}
      />
    </div>
  );

  return (
    <div className="assets">
      {tools}
      <ol className={`asset-grid${target.isStage ? " is-wide" : ""}`} aria-label={target.isStage ? t("Backgrounds") : t("Outfits")}>
        {list.map((c, n) => (
          <li key={c.id}>
            <button className={`asset-card${n === i ? " on" : ""}`} aria-pressed={n === i} onClick={() => onChange({ ...target, costume: n })}>
              <span className="asset-pic">
                <img src={svgUrl(costumeSvg(c))} alt="" />
                <span className="asset-n">{n + 1}</span>
              </span>
              <span className="asset-name">{c.name}</span>
            </button>
          </li>
        ))}
      </ol>
      {current && (
        <section className="asset-detail">
          <div className={`asset-preview${target.isStage ? " is-stage" : ""}`}>
            <img src={svgUrl(costumeSvg(current))} alt={current.name} />
          </div>
          <label className="field">
            <span className="field-label">{t("Name")}</span>
            <input
              value={current.name}
              onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              onBlur={(e) => !e.target.value.trim() && setList(list.map((x, j) => (j === i ? { ...x, name: `${kind}${j + 1}` } : x)))}
            />
          </label>
          <div className="toolbar">
            <button className="btn btn-soft btn-sm" onClick={() => setPainting(i)}>
              <Icon name="edit" size={16} /> {t("Change the drawing")}
            </button>
            <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => setList(list.map((x, j) => (j === i - 1 ? list[i] : j === i ? list[i - 1] : x)), i - 1)}>
              <Icon name="arrowL" size={16} /> {t("Earlier")}
            </button>
            <button className="btn btn-ghost btn-sm" disabled={i === list.length - 1} onClick={() => setList(list.map((x, j) => (j === i + 1 ? list[i] : j === i ? list[i + 1] : x)), i + 1)}>
              {t("Later")} <Icon name="arrowR" size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => add({ ...current, id: uid() })}>
              <Icon name="copy" size={16} /> {t("Copy")}
            </button>
            <button className="btn btn-ghost btn-sm danger-hover" disabled={list.length < 2} onClick={() => setList(list.filter((_, j) => j !== i), i > 0 ? i - 1 : 0)}>
              <Icon name="trash" size={16} /> {t("Delete")}
            </button>
          </div>
        </section>
      )}
      {picking && <LibraryModal title={target.isStage ? t("Add a background") : t("Add an outfit")} items={choices} onPick={add} onClose={() => setPicking(false)} />}
      {painting !== null && (
        <Suspense fallback={<div className="paint" aria-busy />}>
          <PaintEditor
            title={painting === "new" ? (target.isStage ? t("New background") : t("New outfit")) : `${list[painting]?.name ?? word}`}
            stage={target.isStage}
            initial={painting === "new" ? null : docFor(list[painting] ?? null, target.isStage)}
            onCancel={() => setPainting(null)}
            onDone={(doc) => {
              const { svg, cx, cy } = docToSvg(doc, !target.isStage);
              if (painting === "new") add({ id: uid(), name: t("drawing"), svg, cx, cy, paint: doc });
              else setList(list.map((x, j) => (j === painting ? { id: x.id, name: x.name, svg, cx, cy, paint: doc } : x)), painting);
              setPainting(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

/* ---------- sounds ---------- */

const play = (s: SoundAsset) => {
  const audio = new Audio(s.data || soundUrl(s.synth || "pop"));
  audio.play().catch(() => undefined);
};

export function SoundsTab({ target, onChange }: { target: Target; onChange: (t: Target) => void }) {
  const { toast } = useApp();
  const [picking, setPicking] = useState(false);
  const [recording, setRecording] = useState<MediaRecorder | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const list = target.sounds;
  const setList = (sounds: SoundAsset[]) => onChange({ ...target, sounds });
  const add = (s: SoundAsset) => {
    let name = s.name;
    for (let i = 2; list.some((x) => x.name === name); i++) name = `${s.name}${i}`;
    setList([...list, { ...s, name }]);
  };
  const toData = (blob: Blob) =>
    new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(blob);
    });

  const record = async () => {
    if (recording) {
      recording.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(null);
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size > 2_000_000) return toast(t("That recording is too long. Keep it under about a minute."), "error");
        add({ id: uid(), name: t("recording"), data: await toData(blob) });
      };
      rec.start();
      setRecording(rec);
      setTimeout(() => rec.state === "recording" && rec.stop(), 30000);
    } catch {
      toast(t("The microphone isn't available."), "error");
    }
  };

  return (
    <div className="assets is-sounds">
      <div className="toolbar asset-bar">
        <button className="btn btn-primary btn-sm" onClick={() => setPicking(true)}>
          <Icon name="plus" size={16} /> {t("Add a sound")}
        </button>
        <button className={`btn btn-sm ${recording ? "btn-danger" : "btn-ghost"}`} onClick={record}>
          {recording ? `■ ${t("Stop recording")}` : `● ${t("Record")}`}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>
          <Icon name="upload" size={16} /> {t("Upload a sound")}
        </button>
        <input
          ref={file}
          type="file"
          accept="audio/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 2_000_000) return toast(t("That sound file is too big (2 MB at most)."), "error");
            add({ id: uid(), name: f.name.replace(/\.[^.]+$/, "").slice(0, 40), data: await toData(f) });
          }}
        />
      </div>
      <ol className="sound-list" aria-label={t("Sounds")}>
        {list.map((s, i) => (
          <li key={s.id} className="sound-tile">
            <button className="icon-btn" aria-label={t("Play {title}", { title: s.name })} onClick={() => play(s)}>
              <Icon name="play" size={18} />
            </button>
            <input className="sound-name" value={s.name} aria-label={t("Sound name")} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <button className="icon-btn icon-btn-sm danger-hover" aria-label={t("Delete")} onClick={() => setList(list.filter((_, j) => j !== i))}>
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ol>
      {picking && (
        <Modal title={t("Add a sound")} onClose={() => setPicking(false)}>
          <ul className="sound-lib">
            {SOUND_IDS.map((id) => (
              <li key={id}>
                <button className="icon-btn" aria-label={t("Listen to {name}", { name: t(SOUNDS[id].name) })} onClick={() => play({ id, name: id, synth: id })}>
                  <Icon name="play" size={18} />
                </button>
                <span className="grow">{t(SOUNDS[id].name)}</span>
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => {
                    add({ id: uid(), name: t(SOUNDS[id].name), synth: id });
                    setPicking(false);
                  }}
                >
                  {t("Add")}
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}
