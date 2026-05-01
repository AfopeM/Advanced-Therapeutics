// ---------------------------------------------------------------------------
// RTF escape
// ---------------------------------------------------------------------------
function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}");
}

// ---------------------------------------------------------------------------
// RTF document header
// ---------------------------------------------------------------------------
const RTF_HEADER =
  "{\\rtf1\\ansi\\deff0" +
  "{\\fonttbl{\\f0 Merriweather;}}" +
  "{\\colortbl ;" +
  "\\red21\\green128\\blue61;" + // 1 = green text  (#15803d)
  "\\red232\\green242\\blue236;" + // 2 = green bg    (10% of text on white)
  "\\red180\\green83\\blue9;" + // 3 = amber text  (#b45309)
  "\\red248\\green238\\blue230;" + // 4 = amber bg    (10% of text on white)
  "}" +
  "\\f0\\fs24\\sl360\\slmult1 ";

// ---------------------------------------------------------------------------
// Convert a DOM Node (from the canvas innerHTML) to an RTF fragment.
// We use DOMParser so we can work with real Element/Text nodes.
// ---------------------------------------------------------------------------
function nodeToRtf(node: Node): string {
  // Plain text
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeRtf(node.textContent ?? "");
  }

  const el = node as HTMLElement;

  // Recurse into children first
  let inner = "";
  el.childNodes.forEach((child) => {
    inner += nodeToRtf(child);
  });

  const tag = el.tagName?.toUpperCase();

  // Token chip spans — detect fill state via inline style colour hex
  if (tag === "SPAN" && el.dataset?.token) {
    const isFilled = el.dataset.filled === "true";
    if (isFilled) {
      return `{\\b\\cf1\\highlight2 ${inner}}`;
    } else {
      return `{\\b\\cf3\\highlight4 ${inner}}`;
    }
  }

  // Bold
  if (tag === "STRONG" || tag === "B") {
    return `{\\b ${inner}}`;
  }

  // Underline
  if (tag === "U") {
    return `{\\ul ${inner}}`;
  }

  // Line break
  if (tag === "BR") {
    return "";
  }

  return inner;
}

// ---------------------------------------------------------------------------
// Convert the full canvas innerHTML to an RTF body string.
// Each .sl div becomes a paragraph separated by \par.
// ---------------------------------------------------------------------------
function htmlToRtfBody(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, "text/html");
  const slDivs = doc.querySelectorAll<HTMLElement>(".sl");

  if (slDivs.length === 0) {
    // Fallback for unexpected DOM shape
    return escapeRtf(doc.body.textContent ?? "");
  }

  const lines: string[] = [];
  slDivs.forEach((div) => {
    let line = "";
    div.childNodes.forEach((child) => {
      line += nodeToRtf(child);
    });
    lines.push(line);
  });

  return lines.join("\\par\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Triggers a file download of the canvas content as a formatted RTF document.
 *
 * @param html      The innerHTML string from the Canvas component.
 * @param filename  e.g. "John Doe - Device Confirmation.rtf"
 */
export function downloadRtfFromHtml(html: string, filename: string): void {
  const body = htmlToRtfBody(html);
  const rtf = RTF_HEADER + body + "}";

  const blob = new Blob([rtf], { type: "application/rtf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Legacy plain-text RTF download — kept so existing tests don't break.
 */
export function downloadRtf(scriptText: string, filename: string): void {
  const escaped = escapeRtf(scriptText).split("\n").join("\\par\n");
  const rtf = RTF_HEADER + escaped + "}";
  const blob = new Blob([rtf], { type: "application/rtf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Builds the RTF filename from the patient name and session name.
 * e.g. "John Doe - Call Script.rtf"
 */
export function buildRtfFilename(
  patientName: string,
  sessionName: string,
): string {
  const safe = (s: string) => s.replace(/[/\\?%*:|"<>]/g, "-");
  return `${safe(patientName)} - ${safe(sessionName)}.rtf`;
}
