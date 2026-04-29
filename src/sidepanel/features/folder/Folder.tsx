import { useState, useEffect, useMemo } from "react";
import { usePatientStore } from "../../shared/store/usePatientStore";
import { useSessionStore } from "../../shared/store/useSessionStore";
import { SessionCard } from "./SessionCard";
import { PatientInfoCard } from "./PatientInfoCard";
import { getUniqueSessionName } from "../../shared/utils";
import type { Session } from "../../shared/schemas/session.schema";
import plusIcon from "../../../assets/icons/plus.svg";
import shieldCheckIcon from "../../../assets/icons/shield-check.svg";

interface FolderProps {
  patientId: string;
  onBack: () => void;
  onPatientDeleted: () => void;
  onOpenWorkspace: (sessionId: string | null) => void;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export function Folder({
  patientId,
  onBack,
  onPatientDeleted,
  onOpenWorkspace,
}: FolderProps) {
  const { patients, deletePatient, updateSharedPillValues } = usePatientStore();
  const {
    getSessionsByPatient,
    deleteSession,
    updateSession,
    deleteSessionsByPatient,
  } = useSessionStore();

  const patient = patients[patientId];
  const sessions = getSessionsByPatient(patientId);

  const aggregatedPillValues = useMemo(() => {
    const fromSessions = [...sessions]
      .sort((a, b) => b.savedAt - a.savedAt)
      .reduce<Record<string, string>>((acc, s) => {
        for (const [key, value] of Object.entries(s.pillValues)) {
          if (!(key in acc) && value.trim()) acc[key] = value;
        }
        return acc;
      }, {});
    return { ...fromSessions, ...(patient?.sharedPillValues ?? {}) };
  }, [sessions, patient?.sharedPillValues]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setOpenMenuId(null);
      setHeaderMenuOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleRenameSession = (session: Session) => (rawName: string) => {
    const otherSessions = sessions
      .filter((s) => s.id !== session.id)
      .reduce<Record<string, { name: string }>>((acc, s) => {
        acc[s.id] = { name: s.name };
        return acc;
      }, {});
    const finalName = getUniqueSessionName(rawName, otherSessions);
    updateSession(session.id, { name: finalName, savedAt: Date.now() });
  };

  const handleDeleteSession = (session: Session) => {
    setConfirmState({
      message: `Delete "${session.name}"? This cannot be undone.`,
      onConfirm: () => deleteSession(session.id),
    });
  };

  const handleDeletePatient = () => {
    const count = sessions.length;
    setConfirmState({
      message: `Delete "${patient?.name}"? This will also remove ${count} ${count === 1 ? "script" : "scripts"}.`,
      onConfirm: async () => {
        await deleteSessionsByPatient(patientId);
        await deletePatient(patientId);
        onPatientDeleted();
      },
    });
  };

  const sorted = [...sessions].sort((a, b) => b.savedAt - a.savedAt);

  if (!patient) {
    return (
      <div
        data-testid="folder-view"
        className="flex flex-col h-screen bg-gray-100"
      >
        <div className="bg-[#7A9E2E] px-4 py-3 flex items-center gap-3">
          <button
            data-testid="folder-back"
            onClick={onBack}
            className="text-white text-2xl font-bold"
          >
            ‹
          </button>
          <h1 className="flex-1 text-white font-bold text-lg">
            Patient not found
          </h1>
        </div>
        <p className="p-4 text-sm text-gray-400">
          This patient's record could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="folder-view"
      className="flex flex-col h-screen bg-gray-100"
    >
      {/* ── Green header ── */}
      <div className="bg-[#7A9E2E] px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          data-testid="folder-back"
          onClick={onBack}
          className="text-white text-2xl font-bold leading-none p-1 -ml-1"
          aria-label="Back to Hub"
        >
          ‹
        </button>
        <h1
          data-testid="folder-patient-name"
          className="flex-1 text-white font-bold text-lg truncate"
        >
          {patient.name}
        </h1>

        {/* Header meatball — contains delete patient */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            data-testid="folder-header-menu"
            className="text-white/80 text-2xl leading-none p-1"
            onClick={() => setHeaderMenuOpen((prev) => !prev)}
            aria-label="Patient options"
          >
            ⋮
          </button>
          {headerMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                data-testid="folder-delete-patient"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  handleDeletePatient();
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 font-medium"
              >
                Delete Patient
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Patient Info Card */}
        <div className="px-4 pt-4">
          <PatientInfoCard
            sharedPillValues={aggregatedPillValues}
            onSave={(values) => updateSharedPillValues(patientId, values)}
          />
        </div>

        {/* New Script button */}
        <div className="px-4 py-4">
          <button
            data-testid="new-script-btn"
            onClick={() => onOpenWorkspace(null)}
            className="w-full bg-[#7A9E2E] hover:bg-[#6B8D28] active:bg-[#5F7D25] text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2.5 shadow-sm transition-colors"
          >
            <img
              src={plusIcon}
              alt=""
              className="w-5 h-5 brightness-0 invert"
            />
            New Script
          </button>
        </div>

        {/* Scripts section */}
        <div className="px-4 pb-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Scripts</p>

          {sorted.length === 0 ? (
            <p
              data-testid="folder-empty-state"
              className="text-sm text-gray-400 text-center py-8"
            >
              No scripts yet. Tap "New Script" to create one.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isMenuOpen={openMenuId === session.id}
                  onMeatballClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId((prev) =>
                      prev === session.id ? null : session.id,
                    );
                  }}
                  onCloseMenu={() => setOpenMenuId(null)}
                  onRename={handleRenameSession(session)}
                  onDelete={() => handleDeleteSession(session)}
                  onClick={() => onOpenWorkspace(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-center gap-2 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        <img src={shieldCheckIcon} alt="" className="w-3.5 h-3.5 opacity-40" />
        <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          All data is stored locally on this device.
        </span>
      </div>

      {/* ── Confirm dialog ── */}
      {confirmState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            data-testid="confirm-dialog"
            className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
          >
            <p className="text-sm text-gray-700 mb-6">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                data-testid="confirm-cancel"
                onClick={() => setConfirmState(null)}
                className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-ok"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(null);
                }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
