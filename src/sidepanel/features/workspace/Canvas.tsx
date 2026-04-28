import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

// ---------------------------------------------------------------------------
// Token chip styles — dashed borders per design spec
// ---------------------------------------------------------------------------
const EMPTY_CHIP =
  "display:inline-block;border:1.5px dashed #3b82f6;background:#eff6ff;" +
  "color:#1d4ed8;border-radius:5px;padding:0 5px;line-height:1.5;" +
  "font-family:inherit;font-size:inherit;cursor:default;white-space:nowrap;" +
  "user-select:none;vertical-align:baseline;";

const FILLED_CHIP =
  "display:inline-block;border:1.5px dashed #16a34a;background:#f0fdf4;" +
  "color:#15803d;border-radius:5px;padding:0 5px;line-height:1.5;" +
  "font-family:inherit;font-size:inherit;font-weight:600;" +
  "cursor:default;white-space:nowrap;user-select:none;vertical-align:baseline;";

// ---------------------------------------------------------------------------
// Line classification (drives bold / underline headings)
// ---------------------------------------------------------------------------
type LineType = "major" | "sub" | "normal";

function classifyLine(line: string): LineType {
  const t = line.trim();
  if (!t) return "normal";
  if (/^[A-Z][A-Z\s/\-]+:$/.test(t)) return "major";
  if (/^If\s+.+:$/.test(t)) return "sub";
  return "normal";
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds one token <span>.
 * Empty state shows the human-readable label (no square brackets).
 */
function tokenSpan(key: string, value: string, label: string): string {
  const filled = value.trim().length > 0;
  const display = filled ? escHtml(value) : escHtml(label || key);
  const style = filled ? FILLED_CHIP : EMPTY_CHIP;
  return (
    `<span data-token="${escHtml(key)}" contenteditable="false" style="${style}">` +
    `${display}</span>`
  );
}

function renderLineHTML(
  line: string,
  pillValues: Record<string, string>,
  userName: string,
  pillLabels: Record<string, string>,
): string {
  const parts = line.split(/(\[[^\]]+\])/g);
  return parts
    .map((part) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const key = part.slice(1, -1);
        const value = key === "User" ? userName : (pillValues[key] ?? "");
        const label = key === "User" ? "User" : (pillLabels[key] ?? key);
        return tokenSpan(key, value, label);
      }
      return escHtml(part);
    })
    .join("");
}

function buildHTML(
  scriptText: string,
  pillValues: Record<string, string>,
  userName: string,
  pillLabels: Record<string, string>,
): string {
  return scriptText
    .split("\n")
    .map((line) => {
      const type = classifyLine(line);
      const content = renderLineHTML(line, pillValues, userName, pillLabels);
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
// DOM → raw script text (tokens become [key])
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
  if (lines.length === 0) return container.textContent ?? "";
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Public handle (exposed via ref to parent)
// ---------------------------------------------------------------------------
export interface CanvasHandle {
  /** Returns the raw innerHTML of the canvas for RTF export */
  getHtml: () => string;
  /** Removes all token spans for the given key and updates scriptText */
  removeToken: (key: string) => void;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------
interface CanvasProps {
  scriptText: string;
  pillValues: Record<string, string>;
  userName: string;
  /** Maps pill key → human label so empty chips show the label, not the key */
  pillLabels: Record<string, string>;
  /**
   * Changing this prop triggers a full re-render of the canvas.
   * Pass a value that changes when the template or custom-pill list changes.
   */
  renderKey: string;
  onScriptChange: (text: string) => void;
  /**
   * Called after every user edit with the set of token keys still present
   * in the canvas. Parent uses this to keep customPills in sync when the
   * user deletes a token span directly from the canvas.
   */
  onCustomTokensPresent?: (keys: Set<string>) => void;
}

// ---------------------------------------------------------------------------
// Canvas component
// ---------------------------------------------------------------------------
export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    scriptText,
    pillValues,
    userName,
    pillLabels,
    renderKey,
    onScriptChange,
    onCustomTokensPresent,
  },
  ref,
) {
  const divRef = useRef<HTMLDivElement>(null);

  // Expose imperative methods to Workspace
  useImperativeHandle(ref, () => ({
    getHtml: () => divRef.current?.innerHTML ?? "",
    removeToken: (key: string) => {
      if (!divRef.current) return;
      divRef.current
        .querySelectorAll<HTMLElement>(`[data-token="${key}"]`)
        .forEach((span) => span.replaceWith(document.createTextNode("")));
      onScriptChange(extractScript(divRef.current));
    },
  }));

  // Full re-render when renderKey changes (template switch or custom pills added)
  useEffect(() => {
    if (!divRef.current) return;
    divRef.current.innerHTML = buildHTML(
      scriptText,
      pillValues,
      userName,
      pillLabels,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey]);

  // Surgical token update when pill values change — preserves cursor
  useEffect(() => {
    if (!divRef.current) return;
    const container = divRef.current;

    Object.entries(pillValues).forEach(([key, value]) => {
      container
        .querySelectorAll<HTMLElement>(`[data-token="${key}"]`)
        .forEach((span) => {
          const filled = value.trim().length > 0;
          span.textContent = filled ? value : (pillLabels[key] ?? key);
          span.style.cssText = filled ? FILLED_CHIP : EMPTY_CHIP;
        });
    });

    container
      .querySelectorAll<HTMLElement>(`[data-token="User"]`)
      .forEach((span) => {
        const filled = userName.trim().length > 0;
        span.textContent = filled ? userName : "User";
        span.style.cssText = filled ? FILLED_CHIP : EMPTY_CHIP;
      });
  }, [pillValues, userName, pillLabels]);

  // User edits → extract text and notify parent
  const handleInput = useCallback(() => {
    if (!divRef.current) return;
    onScriptChange(extractScript(divRef.current));

    if (onCustomTokensPresent) {
      const presentKeys = new Set<string>();
      divRef.current
        .querySelectorAll<HTMLElement>("[data-token]")
        .forEach((el) => {
          if (el.dataset.token) presentKeys.add(el.dataset.token);
        });
      onCustomTokensPresent(presentKeys);
    }
  }, [onScriptChange, onCustomTokensPresent]);

  /**
   * Strip all HTML from paste events.
   * Without this, pasting copied spans re-inserts them as block <div>s,
   * breaking inline text flow.
   */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  return (
    <div
      data-testid="canvas"
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      className="text-sm leading-relaxed p-4 bg-white border border-dashed rounded-lg h-full overflow-y-auto outline-none font-sans"
    />
  );
});
