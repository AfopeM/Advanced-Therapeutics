import { useState, useEffect } from "react";
import profileIcon from "../../../assets/icons/profile.svg";
import calendarIcon from "../../../assets/icons/calendar.svg";
import boxIcon from "../../../assets/icons/box.svg";
import bodyShapeIcon from "../../../assets/icons/body-shape.svg";
import mailboxIcon from "../../../assets/icons/mailbox.svg";
import penIcon from "../../../assets/icons/pen.svg";
import documentIcon from "../../../assets/icons/document.svg";

interface PatientInfoCardProps {
  sharedPillValues: Record<string, string>;
  onSave: (pillValues: Record<string, string>) => void;
}

// Maps pill keys to their icons — falls back to document for custom fields
const PILL_ICON_MAP: Record<string, string> = {
  patient_name: profileIcon,
  patient_first_name: profileIcon,
  doctors_name: profileIcon,
  ps_name: profileIcon,
  body_part: bodyShapeIcon,
  device: boxIcon,
  delivered_date: calendarIcon,
  sx_date: calendarIcon,
  insurance_type: mailboxIcon,
};

// Human-readable labels for known pill keys
const PILL_LABEL_MAP: Record<string, string> = {
  patient_name: "Full Name",
  patient_first_name: "First Name",
  doctors_name: "Doctor's Name",
  ps_name: "PS Name",
  body_part: "Body Part",
  device: "Device",
  delivered_date: "Delivered Date",
  sx_date: "SX Date",
  insurance_type: "Insurance Type",
  address: "Address",
};

const FIELD_ORDER = [
  "patient_name",
  "doctors_name",
  "body_part",
  "device",
  "address",
  "insurance_type",
  "sx_date",
  "ps_name",
];

function getPillIcon(key: string): string {
  return PILL_ICON_MAP[key] ?? documentIcon;
}

function getPillLabel(key: string): string {
  return (
    PILL_LABEL_MAP[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function PatientInfoCard({
  sharedPillValues,
  onSave,
}: PatientInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const pillKeys = Object.keys(sharedPillValues)
    .filter((k) => k !== "patient_first_name")
    .sort((a, b) => {
      const ai = FIELD_ORDER.indexOf(a);
      const bi = FIELD_ORDER.indexOf(b);
      // Both known → sort by canonical position
      if (ai !== -1 && bi !== -1) return ai - bi;
      // Only a is known → a comes first
      if (ai !== -1) return -1;
      // Only b is known → b comes first
      if (bi !== -1) return 1;
      // Both custom → preserve insertion order (chronological)
      return 0;
    });

  useEffect(() => {
    if (isEditing) setDraftValues({ ...sharedPillValues });
  }, [isEditing]);

  const handleSave = () => {
    onSave(draftValues);
    setIsEditing(false);
  };

  return (
    <div
      data-testid="patient-info-card"
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      {/* ── Card header ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 uppercase text-sm font-semibold text-gray-800">
          Patient Information
        </span>
        {!isEditing ? (
          <button
            data-testid="info-card-edit"
            onClick={() => setIsEditing(true)}
            className="flex items-center cursor-pointer gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <img src={penIcon} alt="" className="w-3.5 h-3.5 opacity-50" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              data-testid="info-card-save"
              onClick={handleSave}
              className="cursor-pointer bg-brand text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-brand-alt"
            >
              Save
            </button>
            <button
              data-testid="info-card-cancel"
              onClick={() => setIsEditing(false)}
              className="cursor-pointer border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ── Fields grid ── */}
      {pillKeys.length === 0 ? (
        <p className="text-xs text-gray-400 px-4 py-4">
          No info recorded yet. Fill a script to see it here.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 overflow-y-auto scrollbar-thin px-3 pb-3">
          {pillKeys.map((key) => (
            <div key={key} className="flex flex-col gap-1 px-2 py-1">
              {/* Label */}
              <label className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                {getPillLabel(key)}
              </label>

              {/* Input / Display */}
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                {/* Icon */}
                <div className="pl-2.5 flex-shrink-0">
                  <img
                    src={getPillIcon(key)}
                    alt=""
                    className="w-3.5 h-3.5"
                    style={{
                      filter:
                        "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                    }}
                  />
                </div>

                {isEditing ? (
                  <input
                    data-testid={`info-pill-input-${key}`}
                    type="text"
                    value={draftValues[key] ?? ""}
                    onChange={(e) =>
                      setDraftValues((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={getPillLabel(key)}
                    className="flex-1 py-2 px-2 text-sm bg-transparent focus:outline-none text-gray-800 placeholder:text-gray-300 min-w-0"
                  />
                ) : (
                  <div
                    data-testid={`info-pill-value-${key}`}
                    className="flex-1 py-2 px-2 text-sm text-gray-800 truncate min-w-0"
                  >
                    {sharedPillValues[key] ? (
                      sharedPillValues[key]
                    ) : (
                      <span className="text-gray-300 italic text-xs">
                        {getPillLabel(key)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
