import { useState, useRef } from "react";
import type { Session } from "../../shared/schemas/session.schema";
import { getTemplate } from "../../../defaults/templates";
import { formatDateTime } from "../../shared/utils";

interface SessionCardProps {
  session: Session;
  isMenuOpen: boolean;
  onMeatballClick: (e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  /**
   * Called with the final (already-deduplicated) name.
   * No error return — renaming always succeeds silently.
   */
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
      // The Folder computed the deduplicated name before passing it here.
      // We just forward whatever the user typed — Folder handles dedup.
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
      className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer"
      onClick={isRenaming ? undefined : onClick}
    >
      {/* Main content */}
      <div
        className="flex-1 min-w-0"
        onClick={(e) => isRenaming && e.stopPropagation()}
      >
        {/* Name row */}
        {isRenaming ? (
          <input
            ref={inputRef}
            data-testid="session-rename-input"
            className="w-full border rounded px-2 py-1 text-sm mb-1"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm font-medium truncate">{session.name}</p>
        )}

        {/* Badge + date row */}
        <div className="flex items-center gap-2 mt-0.5">
          <span
            data-testid="template-badge"
            data-template-id={session.templateId}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${template.badgeClass}`}
          >
            {template.name}
          </span>
          <span className="text-xs text-gray-400">
            {formatDateTime(session.savedAt)}
          </span>
        </div>
      </div>

      {/* Meatball menu */}
      <div
        className="relative flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          data-testid="session-meatball"
          className="p-1 rounded hover:bg-gray-200 text-gray-500 text-lg leading-none"
          onClick={onMeatballClick}
          aria-label="Script options"
        >
          ⋯
        </button>

        {isMenuOpen && (
          <div
            data-testid="session-menu"
            className="absolute right-0 top-full mt-1 w-36 bg-white border rounded shadow-lg z-10"
          >
            <button
              data-testid="session-menu-rename"
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                onCloseMenu();
                startRename();
              }}
            >
              Rename
            </button>
            <button
              data-testid="session-menu-delete"
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
