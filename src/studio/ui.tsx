import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
  wide,
  footer,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal${wide ? " modal-wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="modal-inner">
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </dialog>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Empty({ children, critter }: { children: ReactNode; critter?: ReactNode }) {
  return (
    <div className="empty">
      {critter}
      <p>{children}</p>
    </div>
  );
}

export function Icon({ name, size = 20 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="icon">
      {ICONS[name]}
    </svg>
  );
}

const s = { stroke: "currentColor", strokeWidth: 2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONS = {
  plus: <path {...s} strokeWidth={2.4} d="M12 5v14M5 12h14" />,
  check: <path {...s} strokeWidth={2.6} d="M5 12.5l4.5 4.5L19 7.5" />,
  home: <path {...s} d="M4 11l8-6.5 8 6.5M6 10v9h12v-9" />,
  user: (
    <g {...s}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20.2c.9-3.9 3.7-6 7.2-6s6.3 2.1 7.2 6" />
    </g>
  ),
  list: <path {...s} d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />,
  gear: (
    <g {...s}>
      {/* A chunky wrench with a soft jaw and a little twinkle. */}
      <g transform="rotate(-45 12 12)">
        <path d="M10.4 1.7A4.6 4.6 0 0 0 9.8 10.04V19.8A2.2 2.2 0 0 0 14.2 19.8V10.04A4.6 4.6 0 0 0 13.6 1.7V4.2Q13.6 5.4 12.4 5.4H11.6Q10.4 5.4 10.4 4.2Z" />
      </g>
      <path d="M19.6 1.6Q20 3.9 22.3 4.3Q20 4.7 19.6 7Q19.2 4.7 16.9 4.3Q19.2 3.9 19.6 1.6Z" fill="currentColor" stroke="none" />
    </g>
  ),


  sparkle: (
    <g {...s}>
      <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1-5.1-1.9 5.1-1.9z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </g>
  ),
  play: <path {...s} d="M8 5.5v13l10.5-6.5z" />,
  share: (
    <g {...s}>
      <circle cx="17.5" cy="6" r="2.5" />
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="18" r="2.5" />
      <path d="M8.7 10.8l6.6-3.6M8.7 13.2l6.6 3.6" />
    </g>
  ),
  link: <path {...s} d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />,
  phone: (
    <g {...s}>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 17.5h2" />
    </g>
  ),
  android: (
    <g {...s}>
      <path d="M6 11a6 6 0 0112 0v6.5H6z" />
      <path d="M8 6.5L6.5 4.5M16 6.5l1.5-2M9.5 9.2h.01M14.5 9.2h.01M8.5 17.5v2.5M15.5 17.5v2.5" />
    </g>
  ),
  qr: (
    <g {...s}>
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <path d="M14 14h2.5v2.5H14zM18.5 18.5H20V20M14 20h2" />
    </g>
  ),
  file: <path {...s} d="M7 3.5h7l4 4v13H7zM14 3.5v4h4M9.5 13h6M9.5 16.5h6" />,
  send: <path {...s} d="M4.5 12L20 4.5 15 20l-3-6.5zM12 13.5L20 4.5" />,
  game: (
    <g {...s}>
      <path d="M7 8h10a4 4 0 014 4v1.5a3 3 0 01-5.4 1.8L14.5 14h-5l-1.1 1.3A3 3 0 013 13.5V12a4 4 0 014-4z" />
      <path d="M8 10.5v3M6.5 12h3M15.5 11h.01M17.5 13h.01" />
    </g>
  ),
  book: <path {...s} d="M4 5.5c2.5-1 5.5-1 8 .8 2.5-1.8 5.5-1.8 8-.8V19c-2.5-1-5.5-1-8 .8-2.5-1.8-5.5-1.8-8-.8zM12 6.3v13.5" />,
  shuffle: <path {...s} d="M4 7h3.5l9 10H20M4 17h3.5l2.5-2.8M13.8 9.8L16.5 7H20M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" />,
  undo: <path {...s} d="M9 7.5L5 11.5l4 4M5.5 11.5H15a4.5 4.5 0 010 9h-2" />,
  dots: <path {...s} strokeWidth={3} d="M6 12h.01M12 12h.01M18 12h.01" />,
  code: <path {...s} d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15" />,
  cap: <path {...s} d="M2.5 9.5L12 5l9.5 4.5L12 14zM6.5 11.5v4.5c3.5 2.5 7.5 2.5 11 0v-4.5M21.5 9.5v5" />,
  menu: <path {...s} strokeWidth={2.4} d="M4 7h16M4 12h16M4 17h16" />,
  trash: <path {...s} d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7" />,
  star: <path {...s} d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />,
  up: <path {...s} strokeWidth={2.4} d="M6 14l6-6 6 6" />,
  down: <path {...s} strokeWidth={2.4} d="M6 10l6 6 6-6" />,
  arrowL: <path {...s} strokeWidth={2.4} d="M14.5 6l-6 6 6 6" />,
  arrowR: <path {...s} strokeWidth={2.4} d="M9.5 6l6 6-6 6" />,
  download: <path {...s} d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />,
  edit: <path {...s} d="M5 19l1-4.5L15.5 5l3.5 3.5L9.5 18zM13.5 7l3.5 3.5" />,
  upload: <path {...s} d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9M5 19.5h14" />,
  eye: (
    <g {...s}>
      <path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </g>
  ),
  copy: (
    <g {...s}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6.5a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2h2" />
    </g>
  ),
  key: (
    <g {...s}>
      <circle cx="8" cy="15" r="3.8" />
      <path d="M10.8 12.3L19 4.5M15.5 8l2.5 2.5M17.5 6l2 2" />
    </g>
  ),
  sun: (
    <g {...s}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </g>
  ),
  moon: <path {...s} d="M19.5 14.5A7.5 7.5 0 019.5 4.5a7.5 7.5 0 1010 10z" />,
  search: (
    <g {...s}>
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5L20 20" />
    </g>
  ),
  checkCircle: (
    <g {...s}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.3 12.3l2.5 2.5 4.9-5.3" />
    </g>
  ),
  map: (
    <g {...s}>
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="4.5" cy="6" r="1.8" />
      <circle cx="19.5" cy="6" r="1.8" />
      <circle cx="4.5" cy="18" r="1.8" />
      <circle cx="19.5" cy="18" r="1.8" />
      <path d="M9.8 10.4L6 7.2M14.2 10.4L18 7.2M9.8 13.6L6 16.8M14.2 13.6L18 16.8" />
    </g>
  ),
  dice: (
    <g {...s}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" strokeWidth={2.8} />
    </g>
  ),
  heart: <path {...s} d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5c0 5.3-7.5 9.7-7.5 9.7z" />,
  wifiOff: <path {...s} d="M3.5 3.5l17 17M8.6 13.4a5 5 0 016.8 0M5.2 10a10 10 0 015-2.6M14.6 7.6A10 10 0 0118.8 10M12 17.5h.01" />,
  tidy: <path {...s} d="M4.5 5h6v5h-6zM13.5 5h6v8h-6zM4.5 13h6v6h-6zM13.5 16h6v3h-6z" />,
  close: <path {...s} strokeWidth={2.4} d="M6 6l12 12M18 6L6 18" />,
};
