import { useEffect, useMemo, useState } from "react";
import mermaid from "mermaid";

type MermaidBlockProps = {
  source: string;
};

let lastTheme: string | null = null;
let renderQueue: Promise<void> = Promise.resolve();

function useMermaidTheme(): string {
  const [theme, setTheme] = useState<string>(
    () => document.documentElement.dataset.theme ?? "light",
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme ?? "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function MermaidBlock({ source }: MermaidBlockProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const appTheme = useMermaidTheme();

  const id = useMemo(() => `mmd-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    const mermaidTheme = appTheme === "dark" ? "dark" : "default";
    if (lastTheme !== mermaidTheme) {
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: mermaidTheme });
      lastTheme = mermaidTheme;
    }

    let disposed = false;

    const render = async () => {
      const run = async () => {
        try {
          const rendered = await mermaid.render(id, source);
          const nextSvg = rendered.svg.trim();
          if (disposed) {
            return;
          }

          if (!nextSvg) {
            setSvg("");
            setError("Mermaid produced empty SVG");
            return;
          }

          setSvg(nextSvg);
          setError("");
        } catch (e) {
          if (disposed) {
            return;
          }
          setSvg("");
          setError(e instanceof Error ? e.message : "Mermaid rendering failed");
        }
      };

      renderQueue = renderQueue.then(run, run);
      await renderQueue;
    };

    void render();

    return () => {
      disposed = true;
    };
  }, [id, source, appTheme]);

  if (error) {
    return (
      <pre className="mermaid-error">
        Mermaid error: {error}
      </pre>
    );
  }

  if (!svg) {
    return <div className="mermaid-loading">Rendering diagram...</div>;
  }

  return <div className="mermaid-block" dangerouslySetInnerHTML={{ __html: svg }} />;
}
