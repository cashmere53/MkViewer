import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../hooks/useSettings";
import { DEFAULT_SETTINGS } from "../hooks/useSettings";

type CssPayload = {
  path: string;
  content: string;
};

type SettingsPanelProps = {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
  onDebounceApply: (ms: number) => void;
};

export function SettingsPanel({
  settings,
  onUpdate,
  onClose,
  onDebounceApply,
}: SettingsPanelProps) {
  const handlePickCss = useCallback(async () => {
    try {
      const payload = await invoke<CssPayload>("open_css_dialog_and_read");
      onUpdate({ customCssPath: payload.path, customCssContent: payload.content });
    } catch (e) {
      if (!String(e).includes("canceled")) {
        console.error("Failed to load CSS file:", e);
      }
    }
  }, [onUpdate]);

  const handleClearCss = useCallback(() => {
    onUpdate({ customCssPath: "", customCssContent: "" });
  }, [onUpdate]);

  const handleDebounceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const ms = Math.max(0, Math.min(5000, parseInt(e.target.value, 10) || 0));
      onUpdate({ debounceMs: ms });
      onDebounceApply(ms);
    },
    [onUpdate, onDebounceApply],
  );

  const handleReset = useCallback(() => {
    const patch: Partial<AppSettings> = {
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      monoFontFamily: DEFAULT_SETTINGS.monoFontFamily,
      fontSize: DEFAULT_SETTINGS.fontSize,
      debounceMs: DEFAULT_SETTINGS.debounceMs,
    };
    onUpdate(patch);
    onDebounceApply(DEFAULT_SETTINGS.debounceMs);
  }, [onUpdate, onDebounceApply]);

  return (
    <>
      {/* Backdrop closes panel on click */}
      <div className="settings-backdrop" onClick={onClose} />

      <aside className="settings-panel" aria-label="Settings">
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-body">
          {/* ── Font ── */}
          <section className="settings-section">
            <h3 className="settings-section-title">Font</h3>

            <label className="settings-label">
              <span>Body font</span>
              <input
                type="text"
                className="settings-input"
                value={settings.fontFamily}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                placeholder={DEFAULT_SETTINGS.fontFamily}
              />
            </label>

            <label className="settings-label">
              <span>Monospace font (code)</span>
              <input
                type="text"
                className="settings-input"
                value={settings.monoFontFamily}
                onChange={(e) => onUpdate({ monoFontFamily: e.target.value })}
                placeholder={DEFAULT_SETTINGS.monoFontFamily}
              />
            </label>

            <label className="settings-label">
              <span>Font size (px)</span>
              <input
                type="number"
                className="settings-input settings-input--short"
                value={settings.fontSize}
                min={8}
                max={32}
                onChange={(e) =>
                  onUpdate({
                    fontSize: Math.max(8, Math.min(32, parseInt(e.target.value, 10) || 16)),
                  })
                }
              />
            </label>
          </section>

          {/* ── Appearance / Custom CSS ── */}
          <section className="settings-section">
            <h3 className="settings-section-title">Appearance (CSS)</h3>
            <p className="settings-hint">
              Load a custom CSS file to override the default styles.
            </p>

            {settings.customCssPath ? (
              <div className="settings-css-current">
                <span className="settings-css-filename" title={settings.customCssPath}>
                  {settings.customCssPath.split(/[\\/]/).pop()}
                </span>
                <button type="button" className="settings-btn-sm" onClick={() => void handlePickCss()}>
                  Change
                </button>
                <button
                  type="button"
                  className="settings-btn-sm settings-btn-danger"
                  onClick={handleClearCss}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button type="button" className="settings-btn" onClick={() => void handlePickCss()}>
                Select CSS file…
              </button>
            )}
          </section>

          {/* ── File Watcher ── */}
          <section className="settings-section">
            <h3 className="settings-section-title">File Watcher</h3>
            <label className="settings-label">
              <span>Debounce time (ms)</span>
              <input
                type="number"
                className="settings-input settings-input--short"
                value={settings.debounceMs}
                min={0}
                max={5000}
                step={50}
                onChange={handleDebounceChange}
              />
            </label>
          </section>

          {/* ── Zoom ── */}
          <section className="settings-section">
            <h3 className="settings-section-title">Zoom</h3>
            <p className="settings-hint">Use Ctrl + Scroll to zoom in/out.</p>
            <div className="settings-zoom-row">
              <input
                type="range"
                className="settings-zoom-slider"
                min={0.5}
                max={3.0}
                step={0.05}
                value={settings.zoom}
                onChange={(e) => onUpdate({ zoom: parseFloat(e.target.value) })}
              />
              <span className="settings-zoom-value">
                {Math.round(settings.zoom * 100)}%
              </span>
              <button
                type="button"
                className="settings-btn-sm"
                onClick={() => onUpdate({ zoom: 1.0 })}
              >
                Reset
              </button>
            </div>
          </section>

          {/* ── Footer ── */}
          <div className="settings-footer">
            <button type="button" className="settings-btn" onClick={handleReset}>
              Reset all to defaults
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
