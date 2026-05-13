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
import documentIcon from "../../../assets/icons/document.svg";
import arrowIcon from "../../../assets/icons/arrow.svg";
import Footer from "../../shared/components/Footer";
import { buildClipboardHtml, buildClipboardText } from "./clipboard";

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
  const [templateOpen, setTemplateOpen] = useState(false);

  const patient = patients[patientId];
  const existingSession = sessionId ? sessions[sessionId] : null;

  const [copySuccess, setCopySuccess] = useState<"html" | "text" | null>(null);

  // -------------------------------------------------------------------------
  // Build the initial pill values for this workspace.
  // New session: merge shared values from patient + override with patient name.
  // Existing session: restore saved pill values.
  // -------------------------------------------------------------------------
  const buildInitialPillValues = (): Record<string, string> => {
    // These keys are "patient-level" — Patient Info card is their source of truth.
    // Session values for these should NEVER override a newer Patient Info edit.
    const patientLevelKeys = new Set(["patient_name", "patient_first_name"]);

    if (existingSession) {
      const merged = {
        ...existingSession.pillValues,
        ...(patient?.sharedPillValues ?? {}),
      };
      // Re-apply patient-level shared values on top so Patient Info always wins
      patientLevelKeys.forEach((key) => {
        const sharedVal = patient?.sharedPillValues?.[key];
        if (sharedVal) merged[key] = sharedVal;
      });
      return merged;
    }

    const shared: Record<string, string> = {
      ...(patient?.sharedPillValues ?? {}),
    };
    if (patient) {
      shared.patient_name = patient.name;
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
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  const template = getTemplate(templateId);
  const allPills: TemplatePill[] = [
    ...template.pills.filter((p) => p.key !== "patient_first_name"),
    ...customPills,
  ];
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

  useEffect(() => {
    if (!templateOpen) return;
    const close = (e: MouseEvent) => {
      if (templateDropdownRef.current?.contains(e.target as Node)) return;
      setTemplateOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [templateOpen]);

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

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    setScriptText(getTemplate(id).script_text);
    setCustomPills([]);
    setTemplateOpen(false);
  };

  /**
   * Called by Canvas after every user edit with the set of token keys present
   * in the canvas. If the user deleted a custom token span directly, we mirror
   * that deletion in the customPills list.
   */
  const handleCustomTokensPresent = (presentKeys: Set<string>) => {
    setCustomPills((prev) => prev.filter((p) => presentKeys.has(p.key)));
  };

  const handleCopy = async () => {
    const raw = canvasRef.current?.getHtml() ?? "";
    const html = buildClipboardHtml(raw);
    const text = buildClipboardText(raw);

    try {
      // Write both flavours at once. Apps that understand HTML (Gmail, Notion)
      // will pick the HTML blob. Plain-text editors pick the text blob.
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      setCopySuccess("html");
    } catch {
      // Focus was lost or the browser blocked the rich-text write.
      // Fall back to plain text — at least the content gets through.
      try {
        await navigator.clipboard.writeText(text);
        setCopySuccess("text");
      } catch {
        // Both paths failed — nothing useful to do silently.
        console.error("Clipboard write failed");
      }
    }

    // Auto-reset the toast after 2 seconds regardless of which path succeeded
    setTimeout(() => setCopySuccess(null), 2000);
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
      const baseName = `${patient?.name ?? "Patient"} Call Script`;
      const name = getUniqueSessionName(baseName, existingNames);
      await addSession({
        id: workingSessionId.current,
        patientId,
        name,
        templateId,
        pillValues,
        customPills,
        scriptText,
        createdAt: Date.now(),
        savedAt: Date.now(),
      });
      setIsSaved(true);
    } else {
      await updateSession(workingSessionId.current, {
        templateId,
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

  const handleResetTemplate = () => {
    setScriptText(getTemplate(templateId).script_text);
    setPillValues(buildInitialPillValues());
    setCustomPills([]);
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
      className="flex flex-col h-screen bg-gray-100 font-sans"
    >
      {/* ── Dark header ── */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          data-testid="workspace-back"
          onClick={handleBack}
          className="text-white cursor-pointer group text-2xl font-bold leading-none p-1 -ml-1"
          aria-label="Back to folder"
        >
          <img
            src={arrowIcon}
            alt=""
            className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-all shrink-0 invert"
          />
        </button>
        <div className="relative flex-1" ref={templateDropdownRef}>
          <button
            data-testid="template-select"
            type="button"
            disabled={false}
            onClick={() => setTemplateOpen((prev) => !prev)}
            className="w-full flex items-center border border-gray-600 rounded-lg overflow-hidden disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <div className="pl-2.5 shrink-0">
              <img
                src={documentIcon}
                alt=""
                className="w-4 h-4 opacity-40 invert"
              />
            </div>
            <span className="flex-1 py-2 px-2 text-sm text-white text-left truncate">
              {template.name}
            </span>
            <div className="pr-2.5 shrink-0">
              <img
                src={chevronDownIcon}
                alt=""
                className={`w-4 h-4 opacity-40 invert transition-transform ${templateOpen && !isSaved ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {templateOpen && !isSaved && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTemplateChange(t.id)}
                  className={`w-full text-left px-4 cursor-pointer py-2.5 text-sm transition-colors ${
                    t.id === templateId
                      ? "bg-[#EEF6DC] text-brand font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          data-testid="reset-template-btn"
          onClick={handleResetTemplate}
          className="shrink-0 cursor-pointer border border-gray-600 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-50 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-hidden flex flex-col gap-2 p-2">
        {/* ── Pills section ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {/* pills + Add Pill button */}
          <PillGrid
            pills={allPills}
            customPillKeys={customPillKeys}
            pillValues={pillValues}
            onValueChange={handleValueChange}
            onAddPill={handleAddPill}
            onDeletePill={handleDeletePill}
          />
        </div>

        {/* ── Canvas section ── */}
        <div className="bg-white rounded-2xl shadow-sm flex flex-col flex-3 min-h-0 overflow-hidden">
          <div className="px-4 pt-3 pb-2 shrink-0">
            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
              Script
            </p>
          </div>
          <div className="flex-1 overflow-hidden px-3 pb-3">
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
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-3">
        {/* ── Row 1: secondary actions ── */}
        <div className="flex gap-3 mb-2">
          {/* Save Draft */}
          <button
            data-testid="save-session-btn"
            onClick={saveSession}
            className="flex-1 flex cursor-pointer items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <img src={saveIcon} alt="" className="w-5 h-5 opacity-50" />
            Save Draft
          </button>

          {/* Copy Script */}
          <button
            data-testid="copy-script-btn"
            onClick={handleCopy}
            className="flex-1 flex cursor-pointer items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copySuccess === "html" ? (
              <span className="text-green-600">Copied ✓</span>
            ) : copySuccess === "text" ? (
              <span className="text-amber-600">Copied as plain text</span>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Script
              </>
            )}
          </button>
        </div>

        {/* ── Row 2: primary action ── */}
        <button
          data-testid="download-rtf-btn"
          onClick={handleDownload}
          className="w-full flex cursor-pointer items-center justify-center gap-2 bg-brand hover:bg-brand-alt text-white rounded-xl py-3 text-sm font-semibold transition-colors mb-2.5"
        >
          <img
            src={downloadIcon}
            alt=""
            className="w-4 h-4 brightness-0 invert"
          />
          Download .rtf
        </button>

        <Footer />
      </div>
    </div>
  );
}
