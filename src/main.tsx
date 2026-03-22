import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/app.css";
import "./styles/markdown.css";
import "./styles/settings.css";
import "./styles/themes/light.css";
import "./styles/themes/dark.css";
import "katex/dist/katex.min.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
