type Kid = Node | string | number | false | null | undefined | Kid[];
type Props = {
  class?: string;
  style?: string;
  [attr: string]: unknown;
};

/** Tiny element builder: h("button", { class: "btn", onclick }, "Play"). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props)
    for (const key in props) {
      const value = props[key];
      if (value === undefined || value === null || value === false) continue;
      if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value as EventListener);
      else if (key === "class") el.className = String(value);
      else if (value === true) el.setAttribute(key, "");
      else el.setAttribute(key, String(value));
    }
  append(el, kids);
  return el;
}

function append(el: Node, kids: Kid[]) {
  for (const kid of kids) {
    if (kid === null || kid === undefined || kid === false) continue;
    if (Array.isArray(kid)) append(el, kid);
    else el.appendChild(typeof kid === "object" ? kid : document.createTextNode(String(kid)));
  }
}

export function mount(root: HTMLElement, ...kids: Kid[]) {
  root.textContent = "";
  append(root, kids);
  root.scrollTop = 0;
  window.scrollTo(0, 0);
}

/** Text with line breaks kept. */
export const lines = (text: string) => text.split("\n").flatMap((line, i) => (i ? [h("br"), line] : [line]));
