import { useState, useRef, useEffect } from "react";
import { usePatientStore } from "../../shared/store/usePatientStore";
import { useSessionStore } from "../../shared/store/useSessionStore";
import { useUserStore } from "../../shared/store/useUserStore";
import {
  TEMPLATES,
  getTemplate,
  type TemplatePill,
} from "../../../defaults/templates";
import { getUniqueSessionName, generateId } from "../../shared/utils";
import { Canvas, type CanvasHandle } from "./Canvas";
import { PillGrid } from "./PillGrid";
import { downloadRtfFromHtml, buildRtfFilename } from "./export";
import chevronDownIcon from "../../../assets/icons/chevron-down.svg";
import downloadIcon from "../../../assets/icons/download.svg";
import saveIcon from "../../../assets/icons/save.svg";
import profileIcon from "../../../assets/icons/profile.svg";
import documentIcon from "../../../assets/icons/document.svg";
import arrowIcon from "../../../assets/icons/arrow.svg";
import meatballIcon from "../../../assets/icons/meatball.svg";
import Footer from "../../shared/components/Footer";

interface WorkspaceProps {
  patientId: string;
  sessionId: string | null;
  onBack: () => void;
}

export function Workspace({ patientId, sessionId, onBack }: WorkspaceProps) {
  const { patients, renamePatient, updateSharedPillValues } = usePatientStore();
  const { sessions, addSession, updateSession, getSessionsByPatient } =
    useSessionStore();
  const { name: userName } = useUserStore();

  const patient = patients[patientId];
  const existingSession = sessionId ? sessions[sessionId] : null;

  // -------------------------------------------------------------------------
  // Build the initial pill values for this workspace.
  // New session: merge shared values from patient + override with patient name.
  // Existing session: restore saved pill values.
  // -------------------------------------------------------------------------
  const buildInitialPillValues = (): Record<string, string> => {
    if (existingSession) {
      // sharedPillValues = the latest cross-session state; session values override them
      return {
        ...(patient?.sharedPillValues ?? {}),
        ...existingSession.pillValues,
      };
    }

    const shared: Record<string, string> = {
      ...(patient?.sharedPillValues ?? {}),
    };

    // Always seed patient_name from the patient record
    if (patient) {
      shared.patient_name = patient.name;
      // patient_first_name = first word of full name
      if (!shared.patient_first_name) {
        shared.patient_first_name = patient.name.split(" ")[0] ?? "";
      }
    }
    return shared;
  };

  const [templateId, setTemplateId] = useState(
    existingSession?.templateId ?? TEMPLATES[0].id,
  );
  const [pillValues, setPillValues] = useState<Record<string, string>>(
    buildInitialPillValues,
  );
  const [customPills, setCustomPills] = useState<TemplatePill[]>(
    existingSession?.customPills ?? [],
  );
  const [isSaved, setIsSaved] = useState(!!existingSession);

  const workingSessionId = useRef<string>(sessionId ?? generateId());
  const canvasRef = useRef<CanvasHandle>(null);

  const template = getTemplate(templateId);
  const allPills: TemplatePill[] = [...template.pills, ...customPills];
  const customPillKeys = new Set(customPills.map((p) => p.key));

  // Build the label map passed to Canvas so chips show human labels, not keys
  const pillLabels: Record<string, string> = {};
  allPills.forEach((p) => {
    pillLabels[p.key] = p.label;
  });

  /**
   * Changing this string triggers a full re-render of the Canvas.
   * It changes whenever the template is swapped OR custom pills are added/removed.
   */
  const renderKey = `${templateId}_${customPills.map((p) => p.key).join("_")}`;

  const [scriptText, setScriptText] = useState(
    existingSession?.scriptText ??
      (existingSession
        ? getTemplate(existingSession.templateId).script_text
        : template.script_text),
  );

  // When the template selector changes, reset the script to the new template text
  useEffect(() => {
    setScriptText(getTemplate(templateId).script_text);
  }, [templateId]);

  // -------------------------------------------------------------------------
  // Pill value changes
  // -------------------------------------------------------------------------
  const handleValueChange = (key: string, value: string) => {
    setPillValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "patient_name") {
        next.patient_first_name = value.split(" ")[0] ?? "";
      }
      return next;
    });

    if (key === "patient_name" && patient && value.trim()) {
      renamePatient(patientId, value.trim());
      // Sync both name variants to shared state so Patient Info stays current
      updateSharedPillValues(patientId, {
        patient_name: value,
        patient_first_name: value.split(" ")[0] ?? "",
      });
    } else {
      updateSharedPillValues(patientId, { [key]: value });
    }
  };

  // -------------------------------------------------------------------------
  // Custom pill add / delete
  // -------------------------------------------------------------------------
  const handleAddPill = (pill: TemplatePill) => {
    setCustomPills((prev) => [...prev, pill]);
    // Append the token into the canvas script so it actually renders
    setScriptText((prev) => `${prev}\n[${pill.key}]`);
    // renderKey will change on next render → Canvas full re-render picks it up
  };

  const handleDeletePill = (key: string) => {
    setCustomPills((prev) => prev.filter((p) => p.key !== key));
    setPillValues((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    // Also remove every token span for this key from the canvas DOM
    canvasRef.current?.removeToken(key);
  };

  /**
   * Called by Canvas after every user edit with the set of token keys present
   * in the canvas. If the user deleted a custom token span directly, we mirror
   * that deletion in the customPills list.
   */
  const handleCustomTokensPresent = (presentKeys: Set<string>) => {
    setCustomPills((prev) => prev.filter((p) => presentKeys.has(p.key)));
  };

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------
  const saveSession = async () => {
    const patientSessions = getSessionsByPatient(patientId);

    if (!isSaved) {
      // New session — generate a deduplicated name from the template name
      const existingNames = patientSessions.reduce<
        Record<string, { name: string }>
      >((acc, s) => {
        acc[s.id] = { name: s.name };
        return acc;
      }, {});
      const name = getUniqueSessionName(template.name, existingNames);
      await addSession({
        id: workingSessionId.current,
        patientId,
        name,
        templateId,
        pillValues,
        customPills,
        scriptText,
        savedAt: Date.now(),
      });
      setIsSaved(true);
    } else {
      await updateSession(workingSessionId.current, {
        pillValues,
        customPills,
        scriptText,
        savedAt: Date.now(),
      });
    }

    // Push current pill values into the patient's shared store so other
    // sessions can pre-fill from them next time they open
    await updateSharedPillValues(patientId, pillValues);
  };

  // Auto-save before navigating back to folder
  const handleBack = async () => {
    await saveSession();
    onBack();
  };

  // -------------------------------------------------------------------------
  // RTF export — reads the live canvas HTML so formatting is preserved
  // -------------------------------------------------------------------------
  const handleDownload = () => {
    const html = canvasRef.current?.getHtml() ?? "";
    const sessionName = sessionId
      ? (sessions[sessionId]?.name ?? template.name)
      : template.name;
    downloadRtfFromHtml(
      html,
      buildRtfFilename(patient?.name ?? "Patient", sessionName),
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      data-testid="workspace-view"
      className="flex flex-col h-screen bg-gray-100"
    >
      {/* ── Dark header ── */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          data-testid="workspace-back"
          onClick={handleBack}
          className="text-white cursor-pointer group text-2xl font-bold leading-none p-1 -ml-1"
          aria-label="Back to folder"
        >
          <img
            src={arrowIcon}
            alt=""
            className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-all flex-shrink-0 invert"
          />
        </button>
        <span
          data-testid="workspace-patient-name"
          className="flex-1 text-white font-bold text-lg truncate"
        >
          {patient?.name ?? "Unknown Patient"}
        </span>
        <button
          className="text-white/60 cursor-pointer group text-2xl leading-none p-1"
          aria-label="More options"
        >
          <img
            src={meatballIcon}
            alt=""
            className="w-5 h-5 group-hover:opacity-80 rotate-90 invert"
          />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">
        {/* ── Pills section ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-4">
          {/* Row 1: Script Type (template) + Patient Full Name */}
          <div className="grid grid-cols-2 gap-3">
            {/* Script Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Script Type
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <div className="pl-2.5 flex-shrink-0">
                  <img
                    src={documentIcon}
                    alt=""
                    className="w-3.5 h-3.5 opacity-40"
                  />
                </div>
                <select
                  data-testid="template-select"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={isSaved}
                  className="flex-1 py-2 px-2 text-sm bg-transparent focus:outline-none appearance-none cursor-pointer text-gray-800 disabled:text-gray-400 min-w-0"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="pr-2.5 flex-shrink-0">
                  <img
                    src={chevronDownIcon}
                    alt=""
                    className="w-3 h-3 opacity-40 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Patient Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Patient Full Name
              </label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <div className="pl-2.5 flex-shrink-0">
                  <img
                    src={profileIcon}
                    alt=""
                    className="w-3.5 h-3.5"
                    style={{
                      filter:
                        "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                    }}
                  />
                </div>
                <input
                  data-testid="pill-input-patient_name"
                  type="text"
                  value={pillValues["patient_name"] ?? ""}
                  onChange={(e) =>
                    handleValueChange("patient_name", e.target.value)
                  }
                  placeholder="Full Name"
                  className="flex-1 py-2 px-2 text-sm bg-transparent focus:outline-none text-gray-800 placeholder:text-gray-300 min-w-0"
                />
              </div>
            </div>
          </div>

          {/* Remaining pills + Add Pill button */}
          <PillGrid
            pills={allPills.filter((p) => p.key !== "patient_name")}
            customPillKeys={customPillKeys}
            pillValues={pillValues}
            onValueChange={handleValueChange}
            onAddPill={handleAddPill}
            onDeletePill={handleDeletePill}
          />
        </div>

        {/* ── Canvas section ── */}
        <div className="bg-white rounded-2xl shadow-sm flex flex-col flex-1 min-h-72 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
              Script
            </p>
          </div>
          <div className="flex-1 overflow-hidden p-3">
            <Canvas
              ref={canvasRef}
              scriptText={scriptText}
              pillValues={pillValues}
              userName={userName}
              pillLabels={pillLabels}
              renderKey={renderKey}
              onScriptChange={setScriptText}
              onCustomTokensPresent={handleCustomTokensPresent}
            />
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-3">
        <div className="flex gap-3 mb-2.5">
          {/* Save Draft */}
          <button
            data-testid="save-session-btn"
            onClick={saveSession}
            className="flex-1 flex cursor-pointer items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <img src={saveIcon} alt="" className="w-5 h-5 opacity-50" />
            Save Draft
          </button>

          {/* Download .rtf */}
          <button
            data-testid="download-rtf-btn"
            onClick={handleDownload}
            className="flex-1 flex cursor-pointer items-center justify-center gap-2 bg-brand hover:bg-brand-alt text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            <img
              src={downloadIcon}
              alt=""
              className="w-4 h-4 brightness-0 invert"
            />
            Download .rtf
          </button>
        </div>

        <Footer />
      </div>
    </div>
  );
}
