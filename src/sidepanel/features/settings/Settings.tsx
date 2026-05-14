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
import chevronRightIcon from "../../../assets/icons/chevron-down.svg"; // reuse, rotated -90
import Footer from "../../shared/components/Footer";
import arrowIcon from "../../../assets/icons/arrow.svg";
import { TemplateList } from "./templates/TemplateList";
import { TemplateEditor } from "./templates/TemplateEditor";
import type { UserTemplate } from "../../shared/schemas/userTemplate.schema";

// ── View state machine ────────────────────────────────────────────────────────
type SettingsView = "main" | "template-list" | "template-editor";

interface SettingsProps {
  onClose: () => void;
  guardrailMessage?: string;
}

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
  const { sessions, getSessionsByPatient, deleteSession, deleteSessionsByPatient } =
    useSessionStore();
  // ── FIX: hook must live at component level, never inside a loop ──
  const { resolveTemplate, userTemplates } = useTemplateStore();

  const [settingsView, setSettingsView] = useState<SettingsView>("main");
  // Which template is being edited (null = creating new)
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null);

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

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const allPatientIds = Object.keys(patients);
      for (const id of allPatientIds) {
        await deleteSessionsByPatient(id);
        await deletePatient(id);
      }
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const allPatientList = Object.values(patients);

      if (allPatientList.length === 0) {
        alert("No data to export yet.");
        return;
      }

      const rows: Record<string, string>[] = [];

      for (const patient of allPatientList) {
        const patientSessions = getSessionsByPatient(patient.id);

        if (patientSessions.length === 0) {
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

        for (const session of patientSessions) {
          const pv = session.pillValues ?? {};
          // resolveTemplate is now safely called from component scope above
          const template = resolveTemplate(session.templateId);

          const customEntries = Object.entries(pv)
            .filter(([key]) => !STANDARD_KEYS.has(key))
            .map(([key, value]) => {
              const label = key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              return `${label}: ${value}`;
            })
            .join(" | ");

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

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 16 },
        { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 28 },
        { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 40 },
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

  // ── Sub-view routing ──────────────────────────────────────────────────────

  if (settingsView === "template-list") {
    return (
      <TemplateList
        onBack={() => setSettingsView("main")}
        onNew={() => {
          setEditingTemplate(null);
          setSettingsView("template-editor");
        }}
        onEdit={(template) => {
          setEditingTemplate(template);
          setSettingsView("template-editor");
        }}
      />
    );
  }

  if (settingsView === "template-editor") {
    return (
      <TemplateEditor
        template={editingTemplate}
        onBack={() => setSettingsView("template-list")}
        onSaved={() => setSettingsView("template-list")}
      />
    );
  }

  // ── Main settings view ────────────────────────────────────────────────────
  const userTemplateCount = Object.keys(userTemplates).length;

  return (
    <div
      data-testid="settings-overlay"
      className="flex flex-col h-screen bg-gray-100 font-sans"
    >
      {/* Header */}
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

      {/* Scrollable body */}
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

        {/* YOUR NAME */}
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            Your Name
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-1">
              <img src={profileIcon} alt="" className="w-5 h-5 opacity-40 flex-shrink-0" />
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

        {/* TEMPLATES */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            Templates
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              data-testid="manage-templates-btn"
              onClick={() => setSettingsView("template-list")}
              className="w-full flex items-center cursor-pointer gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
                {/* Simple template/document icon using inline SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A9E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="7" y1="8" x2="17" y2="8" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="7" y1="16" x2="12" y2="16" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  Manage Templates
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {userTemplateCount === 0
                    ? "No custom templates yet"
                    : `${userTemplateCount} custom ${userTemplateCount === 1 ? "template" : "templates"}`}
                </p>
              </div>
              <img
                src={chevronRightIcon}
                alt=""
                className="w-4 h-4 opacity-30 -rotate-90"
              />
            </button>
          </div>
        </div>

        {/* DATA */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            Data
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center cursor-pointer gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
                <img src={downloadIcon} alt="" className="w-4 h-4" style={{ filter: "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)" }} />
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

            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
              className="w-full flex items-center cursor-pointer gap-3.5 px-4 py-3.5 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <img src={trashIcon} alt="" className="w-4 h-4" style={{ filter: "invert(30%) sepia(80%) saturate(500%) hue-rotate(330deg)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-500">
                  {isClearing ? "Clearing…" : "Clear All Data"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          </div>
        </div>

        {/* ABOUT */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
                <img src={infoIcon} alt="" className="w-4 h-4" style={{ filter: "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">About Advanced Therapeutics</p>
                <p className="text-xs text-gray-400 mt-0.5">Version 1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Clear confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <p className="text-sm font-semibold text-gray-800 mb-1">Clear all data?</p>
            <p className="text-sm text-gray-500 mb-6">
              Every patient and script will be permanently deleted. This cannot be undone.
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
