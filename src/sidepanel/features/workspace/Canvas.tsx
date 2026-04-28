interface Segment {
  type: "text" | "token";
  content: string; // for text: the literal string. for token: the key (e.g. "patient_name")
}

/**
 * Splits a script string into alternating text and token segments.
 * "[User]" → { type: "token", content: "User" }
 */
function parseScript(scriptText: string): Segment[] {
  const parts = scriptText.split(/(\[[^\]]+\])/g);
  return parts.map((part) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      return { type: "token", content: part.slice(1, -1) };
    }
    return { type: "text", content: part };
  });
}

interface CanvasProps {
  scriptText: string;
  /** All current pill values, keyed by pill key */
  pillValues: Record<string, string>;
  /** The logged-in user's name — replaces the [User] token */
  userName: string;
}

export function Canvas({ scriptText, pillValues, userName }: CanvasProps) {
  const segments = parseScript(scriptText);

  return (
    <div
      data-testid="canvas"
      className="font-mono text-sm whitespace-pre-wrap leading-relaxed p-4 bg-white border rounded-lg h-full overflow-y-auto"
    >
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.content}</span>;
        }

        // Token: look up the value
        const key = seg.content;
        let value: string;

        if (key === "User") {
          value = userName;
        } else {
          value = pillValues[key] ?? "";
        }

        const isFilled = value.trim().length > 0;

        return (
          <span
            key={i}
            data-testid={`token-${key}`}
            className={
              isFilled
                ? "bg-green-100 text-green-800 rounded px-0.5 font-semibold"
                : "bg-amber-100 text-amber-700 rounded px-0.5"
            }
          >
            {isFilled ? value : `[${key}]`}
          </span>
        );
      })}
    </div>
  );
}
