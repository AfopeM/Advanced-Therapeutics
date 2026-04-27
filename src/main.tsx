import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return <div>Phase 1 — Extension loaded ✓</div>;
}

const root = document.getElementById("root")!;
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
