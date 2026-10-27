import { useEffect, useState } from "react";
import { Icon } from "./ui";

type Theme = "light" | "dark";

const current = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#28221a" : "#ffffff");
}

function saved(): string | null {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

/** Light/dark switch. Follows the device setting until someone picks one, then remembers it here. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(current);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (saved()) return;
      const next = media.matches ? "dark" : "light";
      apply(next);
      setTheme(next);
    };
    media.addEventListener("change", follow);
    // Two toggles are mounted (phone bar, laptop corner); keep them in step.
    const sync = () => setTheme(current());
    window.addEventListener("themechange", sync);
    return () => {
      media.removeEventListener("change", follow);
      window.removeEventListener("themechange", sync);
    };
  }, []);

  const dark = theme === "dark";
  return (
    <button
      className={`icon-btn theme-toggle ${className}`}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      aria-pressed={dark}
      onClick={() => {
        const next: Theme = dark ? "light" : "dark";
        apply(next);
        try {
          localStorage.setItem("theme", next);
        } catch {
          /* private mode: the choice just won't be remembered */
        }
        setTheme(next);
        window.dispatchEvent(new Event("themechange"));
      }}
    >
      <Icon name={dark ? "sun" : "moon"} size={21} />
    </button>
  );
}
