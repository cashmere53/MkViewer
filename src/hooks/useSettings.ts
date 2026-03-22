import { useCallback, useEffect, useState } from "react";

const SETTINGS_KEY = "mkviewer:settings";

export type AppSettings = {
  fontFamily: string;
  monoFontFamily: string;
  fontSize: number;
  customCssPath: string;
  customCssContent: string;
  debounceMs: number;
  zoom: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  fontFamily: '"Segoe UI", "Noto Sans JP", sans-serif',
  monoFontFamily: '"Cascadia Code", Consolas, monospace',
  fontSize: 16,
  customCssPath: "",
  customCssContent: "",
  debounceMs: 300,
  zoom: 1.0,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore parse errors
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, updateSettings };
}
