import { useState } from "react";
import type { TemplatePill } from "../../../defaults/templates";
import profileIcon from "../../../assets/icons/profile.svg";
import calendarIcon from "../../../assets/icons/calendar.svg";
import boxIcon from "../../../assets/icons/box.svg";
import bodyShapeIcon from "../../../assets/icons/body-shape.svg";
import mailboxIcon from "../../../assets/icons/mailbox.svg";
import documentIcon from "../../../assets/icons/document.svg";
import crossIcon from "../../../assets/icons/cross.svg";

// Maps pill keys to contextual icons
const PILL_ICON_MAP: Record<string, string> = {
  patient_first_name: profileIcon,
  doctors_name: profileIcon,
  ps_name: profileIcon,
  body_part: bodyShapeIcon,
  device: boxIcon,
  delivered_date: calendarIcon,
  sx_date: calendarIcon,
  insurance_type: mailboxIcon,
  address: mailboxIcon,
};

const PILL_PLACEHOLDER_MAP: Record<string, string> = {
  patient_name: "John Doe",
  patient_first_name: "John",
  doctors_name: "Dr. Smith",
  body_part: "Right Foot",
  device: "Ice Pack",
  delivered_date: "Jan 15, 2025",
  sx_date: "Feb 3, 2025",
  insurance_type: "Medicare",
  ps_name: "Jane Rivera",
  address: "123 Main St",
};

function getPillIcon(key: string): string {
  return PILL_ICON_MAP[key] ?? documentIcon;
}

interface PillGridProps {
  pills: TemplatePill[];
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
    const key = label.toLowerCase().replace(/\s+/g, "_");
    onAddPill({ key, label });
    setNewLabel("");
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-3 justify-center font-sans">
      {/* Pills — 2-col grid */}
      {pills.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {pills.map((pill) => (
            <div key={pill.key} className="flex flex-col gap-1">
              {/* Label + delete button */}
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  {pill.label}
                </label>
                {customPillKeys.has(pill.key) && (
                  <button
                    data-testid={`delete-pill-${pill.key}`}
                    onClick={() => onDeletePill(pill.key)}
                    className="text-gray-300 hover:text-red-400 cursor-pointer group text-xs transition-colors leading-none"
                    aria-label={`Remove ${pill.label}`}
                  >
                    <img
                      src={crossIcon}
                      alt=""
                      className="w-4 h-4 group-hover:opacity-60 rotate-90"
                    />
                  </button>
                )}
              </div>

              {/* Input with icon */}
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="pl-2.5 shrink-0">
                  <img
                    src={getPillIcon(pill.key)}
                    alt=""
                    className="w-3.5 h-3.5"
                    style={{
                      filter:
                        "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                    }}
                  />
                </div>
                <input
                  data-testid={`pill-input-${pill.key}`}
                  type="text"
                  value={pillValues[pill.key] ?? ""}
                  onChange={(e) => onValueChange(pill.key, e.target.value)}
                  placeholder={PILL_PLACEHOLDER_MAP[pill.key] ?? pill.label}
                  className="flex-1 py-2 px-2 text-sm bg-transparent focus:outline-none text-gray-800 placeholder:text-gray-300 min-w-0"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pill */}
      {isAdding ? (
        <div className="flex gap-2">
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
            className="flex-1 border border-dashed border-brand/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 text-gray-800 placeholder:text-gray-300"
            autoFocus
          />
          <button
            onClick={handleAdd}
            className="bg-brand cursor-pointer hover:bg-brand-alt text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          data-testid="add-pill-btn"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 justify-center w-full py-2.5 cursor-pointer border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:border-brand hover:text-brand font-medium transition-colors"
        >
          <span>Add Pill</span>
        </button>
      )}
    </div>
  );
}
