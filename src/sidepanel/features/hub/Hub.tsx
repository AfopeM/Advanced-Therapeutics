import { useState, useEffect, useRef } from "react";
import { usePatientStore } from "../../shared/store/usePatientStore";
import { useSessionStore } from "../../shared/store/useSessionStore";
import { PatientCard } from "./PatientCard";
import type { Patient } from "../../shared/schemas/patient.schema";

interface HubProps {
  userName: string;
  onOpenSettings: () => void;
  onPatientClick: (patientId: string) => void;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export function Hub({ userName, onOpenSettings, onPatientClick }: HubProps) {
  const { patients, addPatient, renamePatient, deletePatient } =
    usePatientStore();
  const { getSessionsByPatient, deleteSessionsByPatient } = useSessionStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "az">("recent");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientError, setNewPatientError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const newPatientInputRef = useRef<HTMLInputElement>(null);

  // Close any open meatball menu when the user clicks anywhere else on the page
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (isAddingPatient) newPatientInputRef.current?.focus();
  }, [isAddingPatient]);

  // --- New patient form ---

  const handleNewPatientClick = () => {
    if (!userName.trim()) {
      onOpenSettings();
    } else {
      setIsAddingPatient(true);
      setNewPatientName("");
      setNewPatientError(null);
    }
  };

  const submitNewPatient = async () => {
    const trimmed = newPatientName.trim();
    if (!trimmed) return;

    const exists = Object.values(patients).some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setNewPatientError("A patient with this name already exists.");
      return;
    }

    await addPatient(trimmed);
    setIsAddingPatient(false);
    setNewPatientName("");
    setNewPatientError(null);
  };

  const handleNewPatientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submitNewPatient();
    if (e.key === "Escape") {
      setIsAddingPatient(false);
      setNewPatientError(null);
    }
  };

  // --- Rename / Delete ---

  const handleRename =
    (patient: Patient) =>
    (newName: string): string | null => {
      const exists = Object.values(patients).some(
        (p) =>
          p.id !== patient.id && p.name.toLowerCase() === newName.toLowerCase(),
      );
      if (exists) return "A patient with this name already exists.";
      renamePatient(patient.id, newName);
      return null;
    };

  const handleDelete = (patient: Patient) => {
    const count = getSessionsByPatient(patient.id).length;
    setConfirmState({
      message: `Delete "${patient.name}"? This will also remove ${count} ${count === 1 ? "script" : "scripts"}.`,
      onConfirm: async () => {
        await deleteSessionsByPatient(patient.id);
        await deletePatient(patient.id);
      },
    });
  };

  // --- Filter + sort ---

  const allPatients = Object.values(patients);

  const filtered = allPatients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) =>
    sortOrder === "az"
      ? a.name.localeCompare(b.name)
      : b.createdAt - a.createdAt,
  );

  const showEmpty =
    allPatients.length === 0 ||
    (searchQuery.length > 0 && filtered.length === 0);

  return (
    <div data-testid="hub-view" className="flex flex-col h-full">
      {/* Search + sort */}
      <div className="flex gap-2 p-3 border-b">
        <input
          data-testid="search-input"
          type="text"
          placeholder="Search patients…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 border rounded px-3 py-1.5 text-sm"
        />
        <select
          data-testid="sort-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "recent" | "az")}
          className="border rounded px-2 py-1.5 text-sm"
        >
          <option value="recent">Recent</option>
          <option value="az">A–Z</option>
        </select>
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {showEmpty ? (
          <p
            data-testid="hub-empty-state"
            className="text-sm text-gray-400 text-center mt-10"
          >
            {allPatients.length === 0
              ? "No patients yet. Add your first patient below."
              : "No patients match your search."}
          </p>
        ) : (
          sorted.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              scriptCount={getSessionsByPatient(patient.id).length}
              isMenuOpen={openMenuId === patient.id}
              onMeatballClick={(e) => {
                e.stopPropagation();
                setOpenMenuId((prev) =>
                  prev === patient.id ? null : patient.id,
                );
              }}
              onCloseMenu={() => setOpenMenuId(null)}
              onRename={handleRename(patient)}
              onDelete={() => handleDelete(patient)}
              onClick={() => onPatientClick(patient.id)}
            />
          ))
        )}
      </div>

      {/* Add patient area */}
      <div className="p-3 border-t">
        {isAddingPatient ? (
          <div data-testid="new-patient-form">
            <input
              ref={newPatientInputRef}
              data-testid="new-patient-input"
              type="text"
              placeholder="Patient name"
              value={newPatientName}
              onChange={(e) => {
                setNewPatientName(e.target.value);
                setNewPatientError(null);
              }}
              onKeyDown={handleNewPatientKeyDown}
              className="w-full border rounded px-3 py-2 text-sm mb-2"
            />
            {newPatientError && (
              <p
                data-testid="new-patient-error"
                className="text-xs text-red-500 mb-2"
              >
                {newPatientError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                data-testid="new-patient-submit"
                onClick={submitNewPatient}
                className="bg-purple-600 text-white rounded px-4 py-1.5 text-sm"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingPatient(false);
                  setNewPatientError(null);
                }}
                className="border rounded px-4 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            data-testid="new-patient-btn"
            onClick={handleNewPatientClick}
            className="text-sm text-purple-600 underline"
          >
            + New Patient
          </button>
        )}
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
