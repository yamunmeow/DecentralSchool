import { useEffect, useState } from "react";

/**
 * Who is using this browser: a student (making games, doing challenges) or a teacher
 * (setting challenges, reviewing hand-ins). It only changes what's in front; nothing
 * is locked away. Kept on this device with the name used on hand-ins and feedback.
 */

export type Role = "student" | "teacher";

const ROLE = "ds-role";
const NAME = "ds-name";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: it lasts until the tab closes */
  }
  window.dispatchEvent(new Event("rolechange"));
};

export const getRole = (): Role | null => {
  const r = read(ROLE);
  return r === "student" || r === "teacher" ? r : null;
};
export const setRole = (r: Role) => write(ROLE, r);
export const getName = () => read(NAME) || "";
export const setName = (n: string) => write(NAME, n.trim());

export function useRole(): { role: Role | null; name: string } {
  const [state, setState] = useState(() => ({ role: getRole(), name: getName() }));
  useEffect(() => {
    const on = () => setState({ role: getRole(), name: getName() });
    window.addEventListener("rolechange", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("rolechange", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return state;
}
