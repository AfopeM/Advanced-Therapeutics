import { useState, useRef } from "react";
import type { Session } from "../../shared/schemas/session.schema";
import { getTemplate } from "../../../defaults/templates";
import { formatScriptDate } from "../../shared/utils";
import documentIcon from "../../../assets/icons/document.svg";

interface SessionCardProps {
  session: Session;
  isMenuOpen: boolean;
  onMeatballClick: (e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onClick: () => void;
}

export function SessionCard({
  session,
  isMenuOpen,
  onMeatballClick,
  onCloseMenu,
  onRename,
  onDelete,
  onClick,
}: SessionCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const template = getTemplate(session.templateId);

  const startRename = () => {
    setRenameValue(session.name);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== session.name) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submitRename();
    if (e.key === "Escape") setIsRenaming(false);
  };

  return (
    <div
      data-testid="session-card"
      className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md cursor-pointer transition-all"
      onClick={isRenaming ? undefined : onClick}
    >
      {/* Document icon */}
      <div className="w-10 h-10 rounded-xl bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
        <img
          src={documentIcon}
          alt=""
          className="w-5 h-5"
          style={{
            filter: "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
          }}
        />
      </div>

      {/* Main content */}
      <div
        className="flex-1 min-w-0"
        onClick={(e) => isRenaming && e.stopPropagation()}
      >
        {isRenaming ? (
          <input
            ref={inputRef}
            data-testid="session-rename-input"
            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-[#7A9E2E]/30"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm font-bold text-gray-800 truncate uppercase tracking-wide">
            {session.name}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {formatScriptDate(session.savedAt)}
        </p>
      </div>

      {/* Template badge */}
      <span
        data-testid="template-badge"
        data-template-id={session.templateId}
        className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border ${template.badgeClass}`}
      >
        {template.name}
      </span>

      {/* Meatball menu */}
      <div
        className="relative flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          data-testid="session-meatball"
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400 text-lg leading-none transition-colors"
          onClick={onMeatballClick}
          aria-label="Script options"
        >
          ⋮
        </button>

        {isMenuOpen && (
          <div
            data-testid="session-menu"
            className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden"
          >
            <button
              data-testid="session-menu-rename"
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                onCloseMenu();
                startRename();
              }}
            >
              Rename
            </button>
            <button
              data-testid="session-menu-delete"
              className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
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
