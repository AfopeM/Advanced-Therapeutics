import { useState } from "react";
import type { TemplatePill } from "../../../defaults/templates";

interface PillGridProps {
  pills: TemplatePill[];
  /**
   * Keys that were created by the user via "+ Add field".
   * Only these pills show the × delete button.
   */
  customPillKeys: Set<string>;
  pillValues: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  onAddPill: (pill: TemplatePill) => void;
  onDeletePill: (key: string) => void;
}

export function PillGrid({
  pills,
  customPillKeys,
  pillValues,
  onValueChange,
  onAddPill,
  onDeletePill,
}: PillGridProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    // "Patient Full Name" → "patient_full_name"
    const key = label.toLowerCase().replace(/\s+/g, "_");
    onAddPill({ key, label });
    setNewLabel("");
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {pills.map((pill) => (
        <div key={pill.key} className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">
              {pill.label}
            </label>

            {/* Delete button only visible for custom (user-created) pills */}
            {customPillKeys.has(pill.key) && (
              <button
                data-testid={`delete-pill-${pill.key}`}
                onClick={() => onDeletePill(pill.key)}
                className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                aria-label={`Remove ${pill.label}`}
              >
                ✕
              </button>
            )}
          </div>

          <input
            data-testid={`pill-input-${pill.key}`}
            type="text"
            value={pillValues[pill.key] ?? ""}
            onChange={(e) => onValueChange(pill.key, e.target.value)}
            className="border border-dashed rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-400"
            placeholder={pill.label}
          />
        </div>
      ))}

      {/* "+ Add field" form */}
      {isAdding ? (
        <div className="flex gap-2 mt-1">
          <input
            data-testid="new-pill-label-input"
            type="text"
            placeholder="Field label (e.g. Referral Date)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setIsAdding(false);
            }}
            className="flex-1 border border-dashed rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-400"
            autoFocus
          />
          <button
            onClick={handleAdd}
            className="bg-purple-600 text-white rounded px-3 py-1 text-sm"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          data-testid="add-pill-btn"
          onClick={() => setIsAdding(true)}
          className="text-xs text-purple-600 underline text-left mt-1"
        >
          + Add field
        </button>
      )}
    </div>
  );
}
