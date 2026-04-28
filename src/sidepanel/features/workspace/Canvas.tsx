// src/sidepanel/features/workspace/Canvas.tsx
import { useRef, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Token chip styles (inline — safe from Tailwind purge since they're dynamic)
// ---------------------------------------------------------------------------
const EMPTY_CHIP =
  "display:inline-block;border:1.5px solid #3b82f6;background:#eff6ff;" +
  "color:#1d4ed8;border-radius:5px;padding:0 5px;line-height:1.5;" +
  "font-family:inherit;font-size:inherit;cursor:default;white-space:nowrap;";

const FILLED_CHIP =
  "display:inline-block;border:1.5px solid #16a34a;background:#f0fdf4;" +
  "color:#15803d;border-radius:5px;padding:0 5px;line-height:1.5;" +
  "font-family:inherit;font-size:inherit;font-weight:600;" +
  "cursor:default;white-space:nowrap;";

// ---------------------------------------------------------------------------
// Line classification
// ---------------------------------------------------------------------------
type LineType = "major" | "sub" | "normal";

function classifyLine(line: string): LineType {
  const t = line.trim();
  if (!t) return "normal";
  // SPIEL:  /  TEXT TEMPLATE:  /  TEXT/VM:
  if (/^[A-Z][A-Z\s\/\-]+:$/.test(t)) return "major";
  // If still working:  /  If no longer available:
  if (/^If\s+.+:$/.test(t)) return "sub";
  return "normal";
}

// ---------------------------------------------------------------------------
// HTML builder
// ---------------------------------------------------------------------------
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokenSpan(key: string, value: string): string {
  const filled = value.trim().length > 0;
  const display = filled ? escHtml(value) : escHtml(`[${key}]`);
  const style = filled ? FILLED_CHIP : EMPTY_CHIP;
  return (
    `<span data-token="${key}" contenteditable="false" style="${style}">` +
    `${display}</span>`
  );
}

function renderLineHTML(
  line: string,
  pillValues: Record<string, string>,
  userName: string,
): string {
  const parts = line.split(/(\[[^\]]+\])/g);
  const inner = parts
    .map((part) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const key = part.slice(1, -1);
        const value = key === "User" ? userName : (pillValues[key] ?? "");
        return tokenSpan(key, value);
      }
      return escHtml(part);
    })
    .join("");
  return inner;
}

function buildHTML(
  scriptText: string,
  pillValues: Record<string, string>,
  userName: string,
): string {
  return scriptText
    .split("\n")
    .map((line) => {
      const type = classifyLine(line);
      const content = renderLineHTML(line, pillValues, userName);
      const safe = content || "<br>";

      if (type === "major")
        return `<div class="sl"><strong><u>${safe}</u></strong></div>`;
      if (type === "sub")
        return `<div class="sl"><strong>${safe}</strong></div>`;
      return `<div class="sl">${safe}</div>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// DOM → raw script text extraction
// ---------------------------------------------------------------------------
function extractNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  const el = node as HTMLElement;
  if (el.dataset?.token) return `[${el.dataset.token}]`;
  if (el.tagName === "BR") return "";
  let out = "";
  el.childNodes.forEach((c) => (out += extractNode(c)));
  return out;
}

function extractScript(container: HTMLElement): string {
  const lines: string[] = [];
  container.querySelectorAll<HTMLElement>(".sl").forEach((div) => {
    let line = "";
    div.childNodes.forEach((n) => (line += extractNode(n)));
    lines.push(line);
  });
  // Fallback if div structure is lost (shouldn't happen in Chrome)
  if (lines.length === 0) return container.textContent ?? "";
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface CanvasProps {
  scriptText: string;
  pillValues: Record<string, string>;
  userName: string;
  templateKey: string; // changing this triggers a full re-render
  onScriptChange: (text: string) => void;
}

export function Canvas({
  scriptText,
  pillValues,
  userName,
  templateKey,
  onScriptChange,
}: CanvasProps) {
  const divRef = useRef<HTMLDivElement>(null);

  // Full re-render when the template changes (cursor reset is acceptable here)
  useEffect(() => {
    if (!divRef.current) return;
    divRef.current.innerHTML = buildHTML(scriptText, pillValues, userName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateKey]);

  // Selective token update when pill values change — no cursor disruption
  useEffect(() => {
    if (!divRef.current) return;
    const container = divRef.current;

    Object.entries(pillValues).forEach(([key, value]) => {
      container
        .querySelectorAll<HTMLElement>(`[data-token="${key}"]`)
        .forEach((span) => {
          const filled = value.trim().length > 0;
          span.textContent = filled ? value : `[${key}]`;
          span.style.cssText = filled ? FILLED_CHIP : EMPTY_CHIP;
        });
    });

    // Also handle [User] token
    container
      .querySelectorAll<HTMLElement>(`[data-token="User"]`)
      .forEach((span) => {
        const filled = userName.trim().length > 0;
        span.textContent = filled ? userName : "[User]";
        span.style.cssText = filled ? FILLED_CHIP : EMPTY_CHIP;
      });
  }, [pillValues, userName]);

  // User typing → extract text, notify Workspace (no re-render)
  const handleInput = useCallback(() => {
    if (!divRef.current) return;
    onScriptChange(extractScript(divRef.current));
  }, [onScriptChange]);

  return (
    <div
      data-testid="canvas"
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      className="text-sm leading-relaxed p-4 bg-white border border-dashed rounded-lg h-full overflow-y-auto outline-none font-sans"
    />
  );
}
