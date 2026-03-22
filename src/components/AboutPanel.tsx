type AboutPanelProps = {
  version: string;
  licenseName: string;
  licenseText: string;
  onClose: () => void;
};

export function AboutPanel({ version, licenseName, licenseText, onClose }: AboutPanelProps) {
  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />

      <aside className="settings-panel about-panel" aria-label="MkViewerについて">
        <div className="settings-header">
          <span className="settings-title">MkViewerについて</span>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Close about panel"
          >
            ✕
          </button>
        </div>

        <div className="settings-body about-body">
          <section className="settings-section">
            <h3 className="settings-section-title">Application</h3>
            <dl className="about-list">
              <div className="about-row">
                <dt>App</dt>
                <dd>MkViewer</dd>
              </div>
              <div className="about-row">
                <dt>Version</dt>
                <dd>{version}</dd>
              </div>
              <div className="about-row">
                <dt>License</dt>
                <dd>{licenseName}</dd>
              </div>
            </dl>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">LICENSE</h3>
            <pre className="about-license-text">{licenseText}</pre>
          </section>
        </div>
      </aside>
    </>
  );
}
