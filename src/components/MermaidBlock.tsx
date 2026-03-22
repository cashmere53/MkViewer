import { useEffect, useMemo, useState } from "react";
import mermaid from "mermaid";

type MermaidBlockProps = {
  source: string;
};

let initialized = false;
let renderQueue: Promise<void> = Promise.resolve();

export function MermaidBlock({ source }: MermaidBlockProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  const id = useMemo(() => `mmd-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
      initialized = true;
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
  }, [id, source]);

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
