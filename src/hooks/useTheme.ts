import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "mkviewer:theme";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useMemo(() => {
    return () => setTheme((prev: ThemeMode) => (prev === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}
