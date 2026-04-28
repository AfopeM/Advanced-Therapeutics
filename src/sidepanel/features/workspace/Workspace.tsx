import { useState, useRef } from "react";
import { usePatientStore } from "../../shared/store/usePatientStore";
import { useSessionStore } from "../../shared/store/useSessionStore";
import { useUserStore } from "../../shared/store/useUserStore";
import {
  TEMPLATES,
  getTemplate,
  type TemplatePill,
} from "../../../defaults/templates";
import { getUniqueSessionName, generateId } from "../../shared/utils";
import { Canvas } from "./Canvas";
import { PillGrid } from "./PillGrid";
import { downloadRtf, buildRtfFilename } from "./export";
import type { Session } from "../../shared/schemas/session.schema";

interface WorkspaceProps {
  patientId: string;
  /** null = new session; string = edit existing */
  sessionId: string | null;
  onBack: () => void;
}

export function Workspace({ patientId, sessionId, onBack }: WorkspaceProps) {
  const { patients } = usePatientStore();
  const { sessions, addSession, updateSession, getSessionsByPatient } =
    useSessionStore();
  const { name: userName } = useUserStore();

  const patient = patients[patientId];
  const existingSession = sessionId ? sessions[sessionId] : null;

  // --- Local state ---
  const [templateId, setTemplateId] = useState(
    existingSession?.templateId ?? TEMPLATES[0].id,
  );
  const [pillValues, setPillValues] = useState<Record<string, string>>(
    existingSession?.pillValues ?? {},
  );
  const [customPills, setCustomPills] = useState<TemplatePill[]>([]);
  const [isSaved, setIsSaved] = useState(!!existingSession);

  // Track the session id we're working with (may be generated on first save)
  const workingSessionId = useRef<string>(sessionId ?? generateId());

  const template = getTemplate(templateId);

  // All pills = template pills + any custom pills added by the user
  const allPills = [...template.pills, ...customPills];

  // --- Pill handlers ---
  const handleValueChange = (key: string, value: string) => {
    setPillValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddPill = (pill: TemplatePill) => {
    setCustomPills((prev) => [...prev, pill]);
  };

  const handleDeletePill = (key: string) => {
    setCustomPills((prev) => prev.filter((p) => p.key !== key));
    setPillValues((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // --- Save ---
  const buildSession = (name: string): Session => ({
    id: workingSessionId.current,
    patientId,
    name,
    templateId,
    pillValues,
    savedAt: Date.now(),
  });

  const saveSession = async () => {
    const patientSessions = getSessionsByPatient(patientId);

    if (!isSaved) {
      // New session — generate a deduplicated name
      const others = patientSessions.reduce<Record<string, { name: string }>>(
        (acc, s) => {
          acc[s.id] = { name: s.name };
          return acc;
        },
        {},
      );
      const name = getUniqueSessionName(template.name, others);
      await addSession(buildSession(name));
      setIsSaved(true);
    } else {
      // Existing session — update in place
      await updateSession(workingSessionId.current, {
        pillValues,
        savedAt: Date.now(),
      });
    }
  };

  // --- Auto-save on back ---
  const handleBack = async () => {
    await saveSession();
    onBack();
  };

  // --- RTF download ---
  const handleDownload = () => {
    // Build the filled script text
    let filled = template.script_text;
    filled = filled.replace(/\[User\]/g, userName);
    for (const [key, value] of Object.entries(pillValues)) {
      if (value.trim()) {
        filled = filled.replace(new RegExp(`\\[${key}\\]`, "g"), value);
      }
    }
    const sessionName = sessionId
      ? (sessions[sessionId]?.name ?? template.name)
      : template.name;
    downloadRtf(
      filled,
      buildRtfFilename(patient?.name ?? "Patient", sessionName),
    );
  };

  return (
    <div data-testid="workspace-view" className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b">
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

      {/* Template selector */}
      <div className="px-3 py-2 border-b">
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

      {/* Body: pill grid + canvas side by side (or stacked on narrow screens) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pill grid — left column */}
        <div className="w-48 flex-shrink-0 border-r overflow-y-auto p-3">
          <PillGrid
            pills={allPills}
            pillValues={pillValues}
            onValueChange={handleValueChange}
            onAddPill={handleAddPill}
            onDeletePill={handleDeletePill}
          />
        </div>

        {/* Canvas — right column */}
        <div className="flex-1 overflow-hidden p-3">
          <Canvas
            scriptText={template.script_text}
            pillValues={pillValues}
            userName={userName}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t flex justify-end">
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
