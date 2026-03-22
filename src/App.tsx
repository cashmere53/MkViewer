import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import appPackage from "../package.json";
import licenseText from "../LICENSE?raw";
import { AboutPanel } from "./components/AboutPanel";
import { MarkdownRenderer } from "./components/MarkdownRenderer";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusBar } from "./components/StatusBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useFileWatcher, type FileMissingPayload, type FilePayload } from "./hooks/useFileWatcher";
import { useSettings } from "./hooks/useSettings";
import { useTheme } from "./hooks/useTheme";

type WatchStatus = "watching" | "missing" | "idle";

function App() {
  const [path, setPath] = useState("");
  const [content, setContent] = useState("# MkViewer\n\nOpen a markdown file to start.");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<WatchStatus>("idle");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSettings } = useSettings();

  // ── Apply user CSS variables ──────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--user-font-family", settings.fontFamily);
    root.style.setProperty("--user-mono-font-family", settings.monoFontFamily);
    root.style.setProperty("--user-font-size", `${settings.fontSize}px`);
  }, [settings.fontFamily, settings.monoFontFamily, settings.fontSize]);

  // ── Inject / remove custom CSS override ──────────────────────────────────
  useEffect(() => {
    const id = "custom-css-override";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (settings.customCssContent) {
      if (!el) {
        el = document.createElement("style");
        el.id = id;
        document.head.appendChild(el);
      }
      el.textContent = settings.customCssContent;
    } else if (el) {
      el.remove();
    }
  }, [settings.customCssContent]);

  // ── Ctrl+Scroll zoom ──────────────────────────────────────────────────────
  const zoomRef = useRef(settings.zoom);
  zoomRef.current = settings.zoom;

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const next = Math.round(Math.max(0.5, Math.min(3.0, zoomRef.current + delta)) * 100) / 100;
      updateSettings({ zoom: next });
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [updateSettings]);

  // ── Ctrl+, shortcut for settings ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Debounce: push change to Rust backend ────────────────────────────────
  const prevDebounceRef = useRef(settings.debounceMs);
  const handleDebounceApply = useCallback(
    (ms: number) => {
      if (ms === prevDebounceRef.current) return;
      prevDebounceRef.current = ms;
      void invoke("set_debounce", { ms });
    },
    [],
  );

  const applyPayload = useCallback((payload: FilePayload) => {
    setPath(payload.path);
    setContent(payload.content);
    setUpdatedAt(payload.updated_at);
    setWatchStatus("watching");
    setError("");
  }, []);

  const applyMissing = useCallback((payload: FileMissingPayload) => {
    setWatchStatus("missing");
    setUpdatedAt(payload.updated_at);
    setError(payload.message);
  }, []);

  useFileWatcher({ onChanged: applyPayload, onMissing: applyMissing });

  const openFromPath = useCallback(async (targetPath: string) => {
    try {
      const payload = await invoke<FilePayload>("open_and_watch", { path: targetPath });
      applyPayload(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [applyPayload]);

  const openWithDialog = useCallback(async () => {
    try {
      const payload = await invoke<FilePayload>("open_file_dialog_and_watch");
      applyPayload(payload);
    } catch (e) {
      if (String(e).includes("canceled")) {
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [applyPayload]);

  useEffect(() => {
    const unlistenPromise = listen<{ path: string }>("cli-open-file", (event) => {
      void openFromPath(event.payload.path);
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [openFromPath]);

  useEffect(() => {
    const win = getCurrentWindow();
    const unlistenPromise = win.onDragDropEvent((event) => {
      const payload = event.payload as { type?: string; paths?: string[] };
      if (payload.type === "drop" && payload.paths && payload.paths.length > 0) {
        const droppedPath = payload.paths[0];
        if (droppedPath) {
          void openFromPath(droppedPath);
        }
      }
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [openFromPath]);

  const title = useMemo(() => {
    if (!path) {
      return "MkViewer";
    }
    const chunks = path.split(/[\\/]/);
    return chunks[chunks.length - 1] ?? "MkViewer";
  }, [path]);

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="top-bar">
        <strong className="app-title">{title}</strong>
        <div className="toolbar">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            type="button"
            className="settings-button"
            onClick={() => {
              setSettingsOpen((v) => {
                const next = !v;
                if (next) {
                  setAboutOpen(false);
                }
                return next;
              });
            }}
            aria-label="Open settings (Ctrl+,)"
            title="Settings (Ctrl+,)"
          >
            ⚙
          </button>
          <button
            type="button"
            className="about-button"
            onClick={() => {
              setAboutOpen((v) => {
                const next = !v;
                if (next) {
                  setSettingsOpen(false);
                }
                return next;
              });
            }}
            aria-label="Open MkViewer about panel"
          >
            MkViewerについて
          </button>
          <button type="button" className="open-button" onClick={() => void openWithDialog()}>
            Open
          </button>
        </div>
      </header>

      <main className="content-area">
        {error ? <div className="error-overlay">{error}</div> : null}
        {/* zoom applied via CSS zoom property which respects layout */}
        <div className="content-scaler" style={{ zoom: settings.zoom } as React.CSSProperties}>
          <MarkdownRenderer content={content} />
        </div>
      </main>

      <StatusBar path={path} updatedAt={updatedAt} watchStatus={watchStatus} />

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
          onDebounceApply={handleDebounceApply}
        />
      )}

      {aboutOpen && (
        <AboutPanel
          version={appPackage.version}
          licenseName={appPackage.license}
          licenseText={licenseText}
          onClose={() => setAboutOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
