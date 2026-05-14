import { useState } from "react";
import { useTemplateStore } from "../../../shared/store/useTemplateStore";
import { useSessionStore } from "../../../shared/store/useSessionStore";
import { formatScriptDate } from "../../../shared/utils";
import type { UserTemplate } from "../../../shared/schemas/userTemplate.schema";
import arrowIcon from "../../../../assets/icons/arrow.svg";
import plusIcon from "../../../../assets/icons/plus.svg";
import meatballIcon from "../../../../assets/icons/meatball.svg";

interface TemplateListProps {
  onBack: () => void;
  onNew: () => void;
  onEdit: (template: UserTemplate) => void;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export function TemplateList({ onBack, onNew, onEdit }: TemplateListProps) {
  const { userTemplates, resolveTemplate, deleteTemplate } = useTemplateStore();
  const { sessions, deleteSession, deleteSessionsByPatient } = useSessionStore();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const templateList = Object.values(userTemplates).sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  // ── Delete cascade ────────────────────────────────────────────────────────
  // Count sessions that use this template, then confirm before deleting.
  const handleDeleteTemplate = (template: UserTemplate) => {
    // All sessions (across all patients) that reference this templateId
    const affectedSessions = Object.values(sessions).filter(
      (s) => s.templateId === template.id,
    );
    const count = affectedSessions.length;

    const message =
      count > 0
        ? `Delete "${template.name}"? This will permanently delete this template and ${count} ${count === 1 ? "script" : "scripts"} that use it. This cannot be undone.`
        : `Delete "${template.name}"? This cannot be undone.`;

    setConfirmState({
      message,
      onConfirm: async () => {
        // Group affected sessions by patientId
        const byPatient = new Map<string, string[]>(); // patientId → sessionIds
        for (const s of affectedSessions) {
          const existing = byPatient.get(s.patientId) ?? [];
          byPatient.set(s.patientId, [...existing, s.id]);
        }

        // For each patient, check if ALL their sessions are being deleted.
        // If so, use deleteSessionsByPatient (one storage write).
        // If only some, delete individually.
        const allSessionsByPatient = Object.values(sessions).reduce<
          Map<string, number>
        >((acc, s) => {
          acc.set(s.patientId, (acc.get(s.patientId) ?? 0) + 1);
          return acc;
        }, new Map());

        for (const [patientId, sessionIds] of byPatient) {
          const totalForPatient = allSessionsByPatient.get(patientId) ?? 0;
          if (sessionIds.length === totalForPatient) {
            // All sessions for this patient are affected — bulk delete
            await deleteSessionsByPatient(patientId);
          } else {
            // Only some sessions — delete individually
            for (const id of sessionIds) {
              await deleteSession(id);
            }
          }
        }

        await deleteTemplate(template.id);
      },
    });

    setOpenMenuId(null);
  };

  const resolvedTemplate = (id: string) => resolveTemplate(id);

  return (
    <div
      data-testid="template-list"
      className="flex flex-col h-screen bg-gray-100 font-sans"
    >
      {/* Header */}
      <div className="bg-dark px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-white cursor-pointer group font-bold leading-none p-1 -ml-1"
          aria-label="Back to settings"
        >
          <img
            src={arrowIcon}
            alt=""
            className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-all flex-shrink-0 invert"
          />
        </button>
        <h1 className="flex-1 text-white font-bold text-lg tracking-wide">
          Custom Templates
        </h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* New Template button */}
        <button
          data-testid="new-template-btn"
          onClick={onNew}
          className="w-full bg-brand cursor-pointer hover:bg-brand/90 active:bg-brand/70 text-white font-medium rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm transition-colors text-sm"
        >
          <img src={plusIcon} alt="" className="w-5 h-5 brightness-0 invert" />
          New Template
        </button>

        {/* Empty state */}
        {templateList.length === 0 ? (
          <div
            data-testid="template-list-empty"
            className="flex flex-col items-center justify-center flex-1 py-10 text-center"
          >
            <div className="w-28 h-28 rounded-full bg-[#EEF6DC] flex items-center justify-center mb-4">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <rect x="8" y="6" width="36" height="40" rx="4" fill="#C5DFA0" stroke="#7A9E2E" strokeWidth="2"/>
                <line x1="16" y1="16" x2="36" y2="16" stroke="#7A9E2E" strokeWidth="2" strokeLinecap="round"/>
                <line x1="16" y1="22" x2="36" y2="22" stroke="#7A9E2E" strokeWidth="2" strokeLinecap="round"/>
                <line x1="16" y1="28" x2="28" y2="28" stroke="#7A9E2E" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="40" cy="40" r="8" fill="#7A9E2E"/>
                <line x1="40" y1="36" x2="40" y2="44" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="36" y1="40" x2="44" y2="40" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">No Custom Templates</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Tap{" "}
              <span className="text-[#7A9E2E] font-semibold">"New Template"</span>{" "}
              to create one.
            </p>
          </div>
        ) : (
          templateList.map((ut) => {
            const resolved = resolvedTemplate(ut.id);
            const affectedCount = Object.values(sessions).filter(
              (s) => s.templateId === ut.id,
            ).length;

            return (
              <div
                key={ut.id}
                data-testid="template-card"
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3"
              >
                {/* Color badge */}
                <span
                  className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${resolved.badgeClass}`}
                >
                  {ut.pills.length} {ut.pills.length === 1 ? "field" : "fields"}
                </span>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {ut.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {affectedCount} {affectedCount === 1 ? "script" : "scripts"} •{" "}
                    {formatScriptDate(ut.createdAt)}
                  </p>
                </div>

                {/* Meatball menu */}
                <div
                  className="relative flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    data-testid={`template-menu-btn-${ut.id}`}
                    className="p-1 rounded-md cursor-pointer group hover:bg-gray-100 transition-colors"
                    onClick={() =>
                      setOpenMenuId((prev) => (prev === ut.id ? null : ut.id))
                    }
                    aria-label="Template options"
                  >
                    <img
                      src={meatballIcon}
                      alt=""
                      className="w-4 h-4 group-hover:opacity-80 rotate-90"
                    />
                  </button>

                  {openMenuId === ut.id && (
                    <div
                      data-testid="template-menu"
                      className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden"
                    >
                      <button
                        data-testid="template-menu-edit"
                        className="w-full cursor-pointer text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          onEdit(ut);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        data-testid="template-menu-delete"
                        className="w-full cursor-pointer text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteTemplate(ut)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            data-testid="template-delete-confirm"
            className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
          >
            <p className="text-sm text-gray-700 mb-6">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                data-testid="template-delete-cancel"
                onClick={() => setConfirmState(null)}
                className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                data-testid="template-delete-confirm-btn"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(null);
                }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
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
