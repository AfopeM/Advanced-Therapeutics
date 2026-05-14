import { useState, useEffect } from "react";
import { useUserStore } from "../../shared/store/useUserStore";
import { usePatientStore } from "../../shared/store/usePatientStore";
import { useSessionStore } from "../../shared/store/useSessionStore";
import { useTemplateStore } from "../../shared/store/useTemplateStore";
import { formatScriptDate } from "../../shared/utils";
import profileIcon from "../../../assets/icons/profile.svg";
import downloadIcon from "../../../assets/icons/download.svg";
import trashIcon from "../../../assets/icons/trash.svg";
import infoIcon from "../../../assets/icons/info.svg";
import Footer from "../../shared/components/Footer";
import arrowIcon from "../../../assets/icons/arrow.svg";

interface SettingsProps {
  onClose: () => void;
  guardrailMessage?: string;
}

// ---------------------------------------------------------------------------
// These are the "known" structured fields. Anything in a session's pillValues
// that is NOT in this set is treated as a custom pill → goes into Other Fields.
// ---------------------------------------------------------------------------
const STANDARD_KEYS = new Set([
  "patient_name",
  "patient_first_name",
  "doctors_name",
  "body_part",
  "device",
  "delivered_date",
  "sx_date",
  "insurance_type",
  "ps_name",
  "address",
]);

export function Settings({ onClose, guardrailMessage }: SettingsProps) {
  const { name, setName } = useUserStore();
  const { patients, deletePatient } = usePatientStore();
  const { getSessionsByPatient, deleteSessionsByPatient } = useSessionStore();

  const [input, setInput] = useState(name);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setInput(name);
  }, [name]);

  const handleSave = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    await setName(trimmed);
    onClose();
  };

  // -------------------------------------------------------------------------
  // Clear All Data
  // Deletes every patient and all their sessions, then resets UI state.
  // -------------------------------------------------------------------------
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const allPatientIds = Object.keys(patients);
      // Delete sessions first (foreign key order), then the patient record
      for (const id of allPatientIds) {
        await deleteSessionsByPatient(id);
        await deletePatient(id);
      }
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  // -------------------------------------------------------------------------
  // Export All Data as XLSX
  // Loaded on demand — xlsx is NOT in the main bundle.
  // -------------------------------------------------------------------------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Dynamic import — only downloads SheetJS when the user actually clicks
      const XLSX = await import("xlsx");

      const allPatientList = Object.values(patients);

      if (allPatientList.length === 0) {
        alert("No data to export yet.");
        return;
      }

      // ------------------------------------------------------------------
      // Build rows — one row per session
      // ------------------------------------------------------------------
      const rows: Record<string, string>[] = [];

      for (const patient of allPatientList) {
        const sessions = getSessionsByPatient(patient.id);

        // A patient with no sessions still gets one row so their info isn't lost
        if (sessions.length === 0) {
          rows.push({
            "Patient Name": patient.name,
            "Doctor's Name": "",
            "Body Part": "",
            Device: "",
            "Delivered Date": "",
            "SX Date": "",
            "Insurance Type": "",
            "PS Name": "",
            Address: "",
            "Script Name": "",
            "Script Type": "",
            "Created On": "",
            "Last Updated": formatScriptDate(patient.createdAt),
            "Other Fields": "",
          });
          continue;
        }

        for (const session of sessions) {
          const pv = session.pillValues ?? {};
          // inside Settings() function body, with the other store hooks:
          const { resolveTemplate } = useTemplateStore();
          // inside handleExport():
          const template = resolveTemplate(session.templateId);

          // Collect custom pill entries not in the standard key set
          const customEntries = Object.entries(pv)
            .filter(([key]) => !STANDARD_KEYS.has(key))
            .map(([key, value]) => {
              // Convert snake_case key back to a readable label
              const label = key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              return `${label}: ${value}`;
            })
            .join(" | ");

          // createdAt was added in a previous session — fall back to savedAt
          // for any sessions created before that field existed
          const createdAt = (session as any).createdAt ?? session.savedAt;

          rows.push({
            "Patient Name": pv["patient_name"] ?? patient.name,
            "Doctor's Name": pv["doctors_name"] ?? "",
            "Body Part": pv["body_part"] ?? "",
            Device: pv["device"] ?? "",
            "Delivered Date": pv["delivered_date"] ?? "",
            "SX Date": pv["sx_date"] ?? "",
            "Insurance Type": pv["insurance_type"] ?? "",
            "PS Name": pv["ps_name"] ?? "",
            Address: pv["address"] ?? "",
            "Script Name": session.name,
            "Script Type": template.name,
            "Created On": formatScriptDate(createdAt),
            "Last Updated": formatScriptDate(session.savedAt),
            "Other Fields": customEntries,
          });
        }
      }

      // ------------------------------------------------------------------
      // Build the workbook and trigger download
      // ------------------------------------------------------------------
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set a sensible minimum column width so headers aren't clipped
      worksheet["!cols"] = [
        { wch: 20 }, // Patient Name
        { wch: 20 }, // Doctor's Name
        { wch: 15 }, // Body Part
        { wch: 15 }, // Device
        { wch: 16 }, // Delivered Date
        { wch: 14 }, // SX Date
        { wch: 16 }, // Insurance Type
        { wch: 16 }, // PS Name
        { wch: 22 }, // Address
        { wch: 28 }, // Script Name
        { wch: 20 }, // Script Type
        { wch: 22 }, // Created On
        { wch: 22 }, // Last Updated
        { wch: 40 }, // Other Fields
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Scripts");

      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `patient-data-${today}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      data-testid="settings-overlay"
      className="flex flex-col h-screen bg-gray-100 font-sans"
    >
      {/* ── Dark header ── */}
      <div className="bg-dark px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          data-testid="settings-back"
          onClick={onClose}
          className="text-white cursor-pointer text-xl group font-bold leading-none p-1 -ml-1"
          aria-label="Back"
        >
          <img
            src={arrowIcon}
            alt=""
            className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-all flex-shrink-0 invert"
          />
        </button>
        <h1 className="flex-1 text-white font-bold text-lg tracking-wide">
          Settings
        </h1>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        {guardrailMessage && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p
              data-testid="guardrail-message"
              className="text-sm text-amber-700 font-medium"
            >
              {guardrailMessage}
            </p>
          </div>
        )}

        {/* ── YOUR NAME ── */}
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            Your Name
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-1">
              <img
                src={profileIcon}
                alt=""
                className="w-5 h-5 opacity-40 flex-shrink-0"
              />
              <input
                data-testid="name-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 py-3 text-sm text-gray-800 bg-transparent focus:outline-none placeholder:text-gray-300"
                placeholder="Enter your name"
              />
            </div>
          </div>
        </div>

        <button
          data-testid="save-name"
          onClick={handleSave}
          className="w-full bg-brand hover:bg-brand/90 cursor-pointer text-white font-bold rounded-xl py-4 flex items-center justify-center text-sm gap-2 shadow-sm transition-colors"
        >
          Save
        </button>

        {/* ── DATA ── */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            Data
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {/* Export All Data */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center cursor-pointer gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
                <img
                  src={downloadIcon}
                  alt=""
                  className="w-4 h-4"
                  style={{
                    filter:
                      "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {isExporting ? "Exporting…" : "Export All Data"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Download a .xlsx spreadsheet of all scripts
                </p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>

            {/* Clear All Data */}
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
              className="w-full flex items-center cursor-pointer gap-3.5 px-4 py-3.5 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <img
                  src={trashIcon}
                  alt=""
                  className="w-4 h-4"
                  style={{
                    filter:
                      "invert(30%) sepia(80%) saturate(500%) hue-rotate(330deg)",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-500">
                  {isClearing ? "Clearing…" : "Clear All Data"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  This action cannot be undone
                </p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          </div>
        </div>

        {/* ── ABOUT ── */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
                <img
                  src={infoIcon}
                  alt=""
                  className="w-4 h-4"
                  style={{
                    filter:
                      "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                  }}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  About Advanced Therapeutics
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Version 1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* ── Clear confirmation dialog ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Clear all data?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Every patient and script will be permanently deleted. This cannot
              be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="border cursor-pointer border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="bg-red-500 cursor-pointer hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Yes, Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
