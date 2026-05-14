import { useState, useRef } from "react";
import { useTemplateStore } from "../../../shared/store/useTemplateStore";
import { generateId } from "../../../shared/utils";
import { TemplatePillEditor } from "./TemplatePillEditor";
import type { UserTemplate } from "../../../shared/schemas/userTemplate.schema";
import type { TemplatePill } from "../../../../defaults/templates";
import arrowIcon from "../../../../assets/icons/arrow.svg";

interface TemplateEditorProps {
  /** null = creating new; non-null = editing existing */
  template: UserTemplate | null;
  onBack: () => void;
  onSaved: () => void;
}

export function TemplateEditor({ template, onBack, onSaved }: TemplateEditorProps) {
  const { addTemplate, updateTemplate } = useTemplateStore();

  const [name, setName] = useState(template?.name ?? "");
  const [pills, setPills] = useState<TemplatePill[]>(template?.pills ?? []);
  const [scriptText, setScriptText] = useState(template?.script_text ?? "");
  const [errors, setErrors] = useState<{ name?: string; pills?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Insert token at cursor ────────────────────────────────────────────────
  // setRangeText is a native textarea API: inserts text at the current
  // selection/cursor position without rebuilding the entire string.
  const insertToken = (key: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    const token = `[${key}]`;
    ta.setRangeText(token, ta.selectionStart, ta.selectionEnd, "end");
    // Mirror the DOM value back into React state
    setScriptText(ta.value);
  };

  // ── Validation + save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const newErrors: { name?: string; pills?: string } = {};
    if (!name.trim()) newErrors.name = "Template name is required.";
    if (pills.length === 0) newErrors.pills = "Add at least one field.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (template) {
        await updateTemplate(template.id, {
          name: name.trim(),
          pills,
          script_text: scriptText,
        });
      } else {
        const now = Date.now();
        await addTemplate({
          id: generateId(),
          name: name.trim(),
          pills,
          script_text: scriptText,
          createdAt: now,
          updatedAt: now,
        });
      }
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      data-testid="template-editor"
      className="flex flex-col h-screen bg-gray-100 font-sans"
    >
      {/* Header */}
      <div className="bg-dark px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-white cursor-pointer group font-bold leading-none p-1 -ml-1"
          aria-label="Back to template list"
        >
          <img
            src={arrowIcon}
            alt=""
            className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-all flex-shrink-0 invert"
          />
        </button>
        <h1 className="flex-1 text-white font-bold text-lg tracking-wide">
          {template ? "Edit Template" : "New Template"}
        </h1>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        {/* Name */}
        <div>
          <label className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2 px-1 block">
            Template Name
          </label>
          <input
            data-testid="template-name-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder="e.g. Follow-Up Call"
            className="w-full bg-white rounded-xl shadow-sm px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/30 border border-transparent focus:border-brand/30 placeholder:text-gray-300"
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1 px-1">{errors.name}</p>
          )}
        </div>

        {/* Pills */}
        <div>
          <label className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2 px-1 block">
            Fields (Pills)
          </label>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <TemplatePillEditor
              pills={pills}
              onChange={(updated) => {
                setPills(updated);
                if (errors.pills) setErrors((p) => ({ ...p, pills: undefined }));
              }}
            />
          </div>
          {errors.pills && (
            <p className="text-xs text-red-500 mt-1 px-1">{errors.pills}</p>
          )}
        </div>

        {/* Script text */}
        <div>
          <label className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2 px-1 block">
            Script Body
          </label>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Insert Token helper — chips for each pill key */}
            {pills.length > 0 && (
              <div className="px-3 pt-3 pb-2 flex flex-wrap gap-1.5 border-b border-gray-100">
                <span className="text-[10px] text-gray-400 self-center mr-1 font-semibold uppercase tracking-wider">
                  Insert:
                </span>
                {/* User token always available */}
                <button
                  type="button"
                  onClick={() => insertToken("User")}
                  className="text-[11px] px-2 py-0.5 rounded-md border border-dashed border-blue-300 bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  [User]
                </button>
                {pills.map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => insertToken(pill.key)}
                    className="text-[11px] px-2 py-0.5 rounded-md border border-dashed border-green-300 bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors cursor-pointer"
                  >
                    [{pill.key}]
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              data-testid="template-script-input"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder={`Type your script here.\nUse [field_key] tokens — click the chips above to insert them at the cursor.`}
              rows={14}
              className="w-full px-4 py-3 text-sm text-gray-800 bg-transparent focus:outline-none resize-none placeholder:text-gray-300 font-serif leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Fixed footer with Save / Cancel */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-4 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          data-testid="template-save-btn"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-brand hover:bg-brand-alt disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving…" : template ? "Save Changes" : "Create Template"}
        </button>
      </div>
    </div>
  );
}
