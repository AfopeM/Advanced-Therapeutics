import { useState } from "react";
import type { TemplatePill } from "../../../../defaults/templates";

interface TemplatePillEditorProps {
  pills: TemplatePill[];
  onChange: (pills: TemplatePill[]) => void;
}

/** Derives a snake_case key from a human label. */
function deriveKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "_");
}

export function TemplatePillEditor({ pills, onChange }: TemplatePillEditorProps) {
  const [newLabel, setNewLabel] = useState("");

  const handleAddPill = () => {
    const label = newLabel.trim();
    if (!label) return;
    const key = deriveKey(label);
    // Prevent duplicate keys
    if (pills.some((p) => p.key === key)) {
      setNewLabel("");
      return;
    }
    onChange([...pills, { key, label }]);
    setNewLabel("");
  };

  const handleRemove = (index: number) => {
    onChange(pills.filter((_, i) => i !== index));
  };

  const handleLabelChange = (index: number, newLabel: string) => {
    const updated = pills.map((p, i) =>
      i === index
        ? { key: deriveKey(newLabel), label: newLabel }
        : p,
    );
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Pill list */}
      {pills.length === 0 ? (
        <p className="text-xs text-gray-400 italic px-1">
          No fields yet — add one below.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {pills.map((pill, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
            >
              {/* Label input */}
              <input
                type="text"
                value={pill.label}
                onChange={(e) => handleLabelChange(index, e.target.value)}
                placeholder="Field label"
                className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 placeholder:text-gray-300 min-w-0"
              />

              {/* Derived key — read-only, shown so user knows what to type in textarea */}
              <span className="text-[10px] font-mono text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 flex-shrink-0">
                [{pill.key}]
              </span>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 leading-none text-lg"
                aria-label={`Remove ${pill.label}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add pill row */}
      <div className="flex gap-2 mt-1">
        <input
          type="text"
          placeholder="New field label (e.g. Referral Date)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleAddPill(); }
          }}
          className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-gray-800 placeholder:text-gray-300"
        />
        <button
          type="button"
          onClick={handleAddPill}
          disabled={!newLabel.trim()}
          className="bg-brand hover:bg-brand-alt disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}
