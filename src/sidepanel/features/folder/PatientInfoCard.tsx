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

  const pillKeys = Object.keys(sharedPillValues);

  useEffect(() => {
    if (isEditing) setDraftValues({ ...sharedPillValues });
  }, [isEditing]);

  const handleSave = () => {
    onSave(draftValues);
    setIsEditing(false);
  };

  // Split keys into two columns
  const leftKeys = pillKeys.filter((_, i) => i % 2 === 0);
  const rightKeys = pillKeys.filter((_, i) => i % 2 !== 0);

  return (
    <div
      data-testid="patient-info-card"
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      {/* ── Card header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="w-9 h-9 rounded-full bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
          <img
            src={profileIcon}
            alt=""
            className="w-5 h-5"
            style={{
              filter: "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
            }}
          />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800">
          Patient Information
        </span>
        {!isEditing ? (
          <button
            data-testid="info-card-edit"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <img src={penIcon} alt="" className="w-3.5 h-3.5 opacity-50" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              data-testid="info-card-cancel"
              onClick={() => setIsEditing(false)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              data-testid="info-card-save"
              onClick={handleSave}
              className="bg-[#7A9E2E] text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-[#6B8D28]"
            >
              Save
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
        <div className="flex divide-x divide-gray-100">
          {/* Left column */}
          <div className="flex-1 divide-y divide-gray-100">
            {leftKeys.map((key) => (
              <div key={key} className="flex items-start gap-2.5 px-3 py-3">
                <img
                  src={getPillIcon(key)}
                  alt=""
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{
                    filter:
                      "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-0.5">
                    {getPillLabel(key)}
                  </p>
                  {isEditing ? (
                    <input
                      data-testid={`info-pill-input-${key}`}
                      className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A9E2E]/30"
                      value={draftValues[key] ?? ""}
                      onChange={(e) =>
                        setDraftValues((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    <dd
                      data-testid={`info-pill-value-${key}`}
                      className="text-sm font-medium text-gray-800 truncate"
                    >
                      {sharedPillValues[key] || (
                        <span className="text-gray-300 italic font-normal text-xs">
                          e.g. {getPillLabel(key)}
                        </span>
                      )}
                    </dd>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right column */}
          <div className="flex-1 divide-y divide-gray-100">
            {rightKeys.map((key) => (
              <div key={key} className="flex items-start gap-2.5 px-3 py-3">
                <img
                  src={getPillIcon(key)}
                  alt=""
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{
                    filter:
                      "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-0.5">
                    {getPillLabel(key)}
                  </p>
                  {isEditing ? (
                    <input
                      data-testid={`info-pill-input-${key}`}
                      className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A9E2E]/30"
                      value={draftValues[key] ?? ""}
                      onChange={(e) =>
                        setDraftValues((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    <dd
                      data-testid={`info-pill-value-${key}`}
                      className="text-sm font-medium text-gray-800 truncate"
                    >
                      {sharedPillValues[key] || (
                        <span className="text-gray-300 italic font-normal text-xs">
                          e.g. {getPillLabel(key)}
                        </span>
                      )}
                    </dd>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
