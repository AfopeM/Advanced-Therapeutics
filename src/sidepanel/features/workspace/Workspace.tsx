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

interface WorkspaceProps {
  patientId: string;
  /** null = new unsaved session; string = editing an existing session */
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
    <div data-testid="workspace-view" className="flex flex-col h-screen">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 p-3 border-b flex-shrink-0">
        <button
          data-testid="workspace-back"
          onClick={handleBack}
          className="text-xl font-bold"
          aria-label="Back to folder"
        >
          ←
        </button>
        <span
          data-testid="workspace-patient-name"
          className="flex-1 text-sm font-semibold truncate"
        >
          {patient?.name ?? "Unknown Patient"}
        </span>
        <button
          data-testid="download-rtf-btn"
          onClick={handleDownload}
          className="text-xs text-purple-600 underline"
        >
          Export RTF
        </button>
      </div>

      {/* ── Template selector ── */}
      <div className="px-3 py-2 border-b flex-shrink-0">
        <select
          data-testid="template-select"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          disabled={isSaved}
          className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400"
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── VERTICAL SPLIT: pill grid on top, canvas below ── */}

      {/* Pill grid — scrollable, capped height so canvas always has room */}
      <div className="border-b overflow-y-auto p-3 flex-shrink-0 max-h-60">
        <PillGrid
          pills={allPills}
          customPillKeys={customPillKeys}
          pillValues={pillValues}
          onValueChange={handleValueChange}
          onAddPill={handleAddPill}
          onDeletePill={handleDeletePill}
        />
      </div>

      {/* Canvas — takes all remaining height */}
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

      {/* ── Footer: Save button ── */}
      <div className="p-3 border-t flex justify-end flex-shrink-0">
        <button
          data-testid="save-session-btn"
          onClick={saveSession}
          className="bg-purple-600 text-white rounded px-4 py-2 text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}
