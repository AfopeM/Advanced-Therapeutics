import { useState, useEffect, useRef } from "react";
import { usePatientStore } from "../../shared/store/usePatientStore";
import { useSessionStore } from "../../shared/store/useSessionStore";
import { PatientCard } from "./PatientCard";
import type { Patient } from "../../shared/schemas/patient.schema";
import plusIcon from "../../../assets/icons/plus.svg";
import chevronDownIcon from "../../../assets/icons/chevron-down.svg";

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
      {/* ── Search + sort ── */}
      <div className="flex gap-2 px-3 pt-3 pb-2">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7A9E2E]/30 focus:border-[#7A9E2E]"
          />
        </div>
        <div className="relative">
          <select
            data-testid="sort-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "recent" | "az")}
            className="border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white shadow-sm focus:outline-none appearance-none cursor-pointer"
          >
            <option value="recent">Latest</option>
            <option value="az">A–Z</option>
          </select>
          <img
            src={chevronDownIcon}
            alt=""
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50 pointer-events-none"
          />
        </div>
      </div>

      {/* ── New Patient button or inline form ── */}
      <div className="px-3 pb-3">
        {isAddingPatient ? (
          <div
            data-testid="new-patient-form"
            className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm"
          >
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#7A9E2E]/30 focus:border-[#7A9E2E]"
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
                className="flex-1 bg-brand cursor-pointer hover:bg-brand/90 text-white rounded-lg px-4 py-2 text-sm font-bold transition-colors"
              >
                Add Patient
              </button>
              <button
                onClick={() => {
                  setIsAddingPatient(false);
                  setNewPatientError(null);
                }}
                className="border cursor-pointer border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            data-testid="new-patient-btn"
            onClick={handleNewPatientClick}
            className="w-full bg-brand hover:bg-brand/90 active:bg-brand/50 cursor-pointer text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <img
              src={plusIcon}
              alt=""
              className="w-5 h-5 brightness-0 invert"
            />
            New Patient
          </button>
        )}
      </div>

      {/* ── Patient list OR empty state ── */}
      <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-2">
        {showEmpty ? (
          <div
            data-testid="hub-empty-state"
            className="flex flex-col items-center justify-center flex-1 py-10 text-center"
          >
            {allPatients.length === 0 ? (
              <>
                {/* Folder illustration */}
                <div className="w-36 h-36 rounded-full bg-[#EEF6DC] flex items-center justify-center mb-5">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    {/* Folder body */}
                    <rect
                      x="8"
                      y="22"
                      width="48"
                      height="32"
                      rx="4"
                      fill="#C5DFA0"
                      stroke="#7A9E2E"
                      strokeWidth="2"
                    />
                    {/* Folder tab */}
                    <path
                      d="M8 22v-4a4 4 0 0 1 4-4h12l4 4h24a4 4 0 0 1 4 4"
                      fill="#DAEDB8"
                      stroke="#7A9E2E"
                      strokeWidth="2"
                    />
                    {/* Person icon */}
                    <circle cx="32" cy="32" r="6" fill="#7A9E2E" />
                    <path
                      d="M20 48c0-6.627 5.373-10 12-10s12 3.373 12 10"
                      stroke="#7A9E2E"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Plus badge */}
                    <circle cx="48" cy="46" r="8" fill="#7A9E2E" />
                    <line
                      x1="48"
                      y1="42"
                      x2="48"
                      y2="50"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="44"
                      y1="46"
                      x2="52"
                      y2="46"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-1">
                  No Patients Yet
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Click{" "}
                  <span className="text-[#7A9E2E] font-semibold">
                    "New Patient"
                  </span>{" "}
                  to get started.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                No patients match your search.
              </p>
            )}
          </div>
        ) : (
          sorted.map((patient) => {
            const patientSessions = getSessionsByPatient(patient.id);
            const lastActivityAt =
              patientSessions.length > 0
                ? Math.max(...patientSessions.map((s) => s.savedAt))
                : patient.createdAt;

            return (
              <PatientCard
                key={patient.id}
                patient={patient}
                scriptCount={getSessionsByPatient(patient.id).length}
                lastActivityAt={lastActivityAt}
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
            );
          })
        )}
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
