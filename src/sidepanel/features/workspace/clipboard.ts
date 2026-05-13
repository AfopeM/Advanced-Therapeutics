// What this file does in plain English:
// Take the raw HTML string from the canvas and produce two clean outputs:
//   1. HTML safe to paste into Gmail — chips keep their colors, divs become <p> tags
//   2. Plain text — filled chips show their value, empty chips show [Label]

// ─── HTML path ────────────────────────────────────────────────────────────────

/**
 * Recursively copies a DOM node, stripping every non-visual attribute
 * (contenteditable, draggable, data-token, data-filled) while keeping
 * inline styles so chip colours survive the paste into Gmail.
 */
function cleanNode(node: Node, doc: Document): Node {
  // Text node — copy it as-is
  if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(true);

  const el = node as HTMLElement;

  // <br> — just return a fresh one
  if (el.tagName === "BR") return doc.createElement("br");

  // Shallow clone (no children yet), then strip the editing-only attributes
  const clone = el.cloneNode(false) as HTMLElement;
  clone.removeAttribute("contenteditable");
  clone.removeAttribute("draggable");
  clone.removeAttribute("data-token");
  clone.removeAttribute("data-filled");

  // Recurse into children
  el.childNodes.forEach((child) => clone.appendChild(cleanNode(child, doc)));

  return clone;
}

/**
 * Converts the canvas innerHTML into paste-ready HTML.
 * Each `.sl` div (one line of the script) becomes a <p> tag.
 * Chip inline styles are preserved — Gmail honours them.
 */
export function buildClipboardHtml(rawInnerHtml: string): string {
  const doc = new DOMParser().parseFromString(
    `<body>${rawInnerHtml}</body>`,
    "text/html",
  );

  const paragraphs: string[] = [];

  doc.querySelectorAll<HTMLElement>(".sl").forEach((div) => {
    const p = doc.createElement("p");
    // Reset browser default <p> margin so line spacing matches the canvas
    p.style.cssText = "margin:0;padding:0;line-height:1.6;";

    div.childNodes.forEach((child) => p.appendChild(cleanNode(child, doc)));
    paragraphs.push(p.outerHTML);
  });

  return paragraphs.join("\n");
}

// ─── Plain-text path ──────────────────────────────────────────────────────────

/**
 * Walks a single DOM node and returns its plain-text representation.
 * Filled token chips  → their current value   e.g. "Alice Watts"
 * Empty  token chips  → bracketed label        e.g. "[Body Part]"
 */
function extractText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";

  const el = node as HTMLElement;

  if (el.tagName === "BR") return "";

  // Token chip — data-filled tells us which branch to take
  if (el.dataset.token !== undefined) {
    return el.dataset.filled === "true"
      ? (el.textContent ?? "") // value already rendered as textContent
      : `[${el.textContent ?? el.dataset.token}]`; // label, wrapped in brackets
  }

  // Any other element (strong, u, div…) — recurse
  let text = "";
  el.childNodes.forEach((child) => (text += extractText(child)));
  return text;
}

/**
 * Converts the canvas innerHTML to plain text.
 * One `.sl` div = one line. Token chips resolved as described above.
 */
export function buildClipboardText(rawInnerHtml: string): string {
  const doc = new DOMParser().parseFromString(
    `<body>${rawInnerHtml}</body>`,
    "text/html",
  );

  const lines: string[] = [];
  doc
    .querySelectorAll<HTMLElement>(".sl")
    .forEach((div) => lines.push(extractText(div)));
  return lines.join("\n");
}
