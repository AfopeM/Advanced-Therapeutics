import { useState, useRef } from "react";
import type { Patient } from "../../shared/schemas/patient.schema";
import { formatRelativeDate } from "../../shared/utils";

const AVATAR_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[Math.abs(hash)];
}

interface PatientCardProps {
  patient: Patient;
  scriptCount: number;
  lastActivityAt: number;
  isMenuOpen: boolean;
  onMeatballClick: (e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onRename: (newName: string) => string | null; // returns error string or null on success
  onDelete: () => void;
  onClick: () => void;
}

export function PatientCard({
  patient,
  scriptCount,
  lastActivityAt,
  isMenuOpen,
  onMeatballClick,
  onCloseMenu,
  onRename,
  onDelete,
  onClick,
}: PatientCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(patient.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = () => {
    setRenameValue(patient.name);
    setRenameError(null);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === patient.name) {
      setIsRenaming(false);
      return;
    }
    const error = onRename(trimmed);
    if (error) {
      setRenameError(error);
    } else {
      setIsRenaming(false);
      setRenameError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submitRename();
    if (e.key === "Escape") {
      setIsRenaming(false);
      setRenameError(null);
    }
  };

  return (
    <div
      data-testid="patient-card"
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-gray-200 cursor-pointer transition-all"
      onClick={isRenaming ? undefined : onClick}
    >
      {/* Avatar */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getAvatarColor(patient.id)}`}
      >
        {patient.name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase()}
      </div>

      {/* Name + date / rename input */}
      <div
        className="flex-1 min-w-0"
        onClick={(e) => isRenaming && e.stopPropagation()}
      >
        <p
          data-testid="patient-name"
          className={`text-sm font-semibold text-gray-800 truncate ${isRenaming ? "hidden" : ""}`}
        >
          {patient.name}
        </p>

        {isRenaming ? (
          <div>
            <input
              ref={inputRef}
              data-testid="patient-rename-input"
              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9E2E]/30"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
            {renameError && (
              <p
                data-testid="patient-rename-error"
                className="text-xs text-red-500 mt-1"
              >
                {renameError}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">
            {formatRelativeDate(lastActivityAt)}
          </p>
        )}
      </div>

      {/* Script count badge */}
      {!isRenaming && (
        <span className="flex-shrink-0 text-xs font-semibold text-[#5C7D20] bg-[#EEF6DC] px-2.5 py-1 rounded-md">
          {scriptCount} {scriptCount === 1 ? "Script" : "Script"}
        </span>
      )}

      {/* Meatball menu */}
      <div
        className="relative flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          data-testid="patient-meatball"
          className="p-1 rounded-full cursor-pointer hover:bg-gray-100 text-gray-400 text-lg leading-none transition-colors"
          onClick={onMeatballClick}
          aria-label="Patient options"
        >
          ⋮
        </button>

        {isMenuOpen && (
          <div
            data-testid="patient-menu"
            className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden"
          >
            <button
              data-testid="patient-menu-rename"
              className="w-full cursor-pointer text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                onCloseMenu();
                startRename();
              }}
            >
              Rename
            </button>
            <button
              data-testid="patient-menu-delete"
              className="w-full cursor-pointer text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
              onClick={() => {
                onCloseMenu();
                onDelete();
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
