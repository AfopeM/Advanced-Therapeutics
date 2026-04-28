import { useState, useEffect } from "react";
import { usePatientStore } from "../../shared/store/usePatientStore";
import { useSessionStore } from "../../shared/store/useSessionStore";
import { SessionCard } from "./SessionCard";
import { PatientInfoCard } from "./PatientInfoCard";
import { getUniqueSessionName } from "../../shared/utils";
import type { Session } from "../../shared/schemas/session.schema";

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
  const { patients, deletePatient } = usePatientStore();
  const {
    getSessionsByPatient,
    deleteSession,
    updateSession,
    deleteSessionsByPatient,
  } = useSessionStore();

  const patient = patients[patientId];
  const sessions = getSessionsByPatient(patientId);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
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

  const handleInfoCardSave = (pillValues: Record<string, string>) => {
    for (const session of sessions) {
      updateSession(session.id, {
        pillValues: { ...session.pillValues, ...pillValues },
      });
    }
  };

  const sorted = [...sessions].sort((a, b) => b.savedAt - a.savedAt);

  // Guard: patient not found (should not happen in normal flow).
  // Still renders folder-view testid so Playwright can at least see the component.
  if (!patient) {
    return (
      <div data-testid="folder-view" className="flex flex-col h-screen">
        <div className="flex items-center gap-3 p-4 border-b">
          <button
            data-testid="folder-back"
            onClick={onBack}
            className="text-xl font-bold"
          >
            ←
          </button>
          <h1 className="flex-1 text-base font-semibold text-gray-400">
            Patient not found
          </h1>
        </div>
        <p className="p-4 text-sm text-gray-400">
          This patient's record could not be loaded. Please go back and try
          again.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="folder-view" className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <button
          data-testid="folder-back"
          onClick={onBack}
          className="text-xl font-bold"
          aria-label="Back to Hub"
        >
          ←
        </button>
        <h1
          data-testid="folder-patient-name"
          className="flex-1 text-base font-semibold truncate"
        >
          {patient.name}
        </h1>
        <button
          data-testid="folder-delete-patient"
          onClick={handleDeletePatient}
          className="text-xs text-red-500 underline"
          aria-label="Delete patient"
        >
          Delete patient
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {sorted.length === 0 ? (
          <p
            data-testid="folder-empty-state"
            className="text-sm text-gray-400 text-center mt-10"
          >
            No scripts yet. Open the workspace to create one.
          </p>
        ) : (
          sorted.map((session) => (
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
          ))
        )}
      </div>

      {/* New script button */}
      <div className="px-3 pt-2">
        <button
          data-testid="new-script-btn"
          onClick={() => onOpenWorkspace(null)}
          className="text-sm text-purple-600 underline"
        >
          + New Script
        </button>
      </div>

      {/* Patient Info Card */}
      <div className="p-3 border-t">
        <PatientInfoCard sessions={sessions} onSave={handleInfoCardSave} />
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            data-testid="confirm-dialog"
            className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full shadow-xl"
          >
            <p className="text-sm mb-6">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                data-testid="confirm-cancel"
                onClick={() => setConfirmState(null)}
                className="border rounded px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-ok"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(null);
                }}
                className="bg-red-600 text-white rounded px-4 py-2 text-sm"
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
