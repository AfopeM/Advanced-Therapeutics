import { useState, useEffect } from "react";
import { useUserStore } from "../../shared/store/useUserStore";

interface SettingsProps {
  onClose: () => void;
  guardrailMessage?: string;
}

export function Settings({ onClose, guardrailMessage }: SettingsProps) {
  const { name, setName } = useUserStore();
  const [input, setInput] = useState(name);

  // If the store loads a name after mount, sync it into the input
  useEffect(() => {
    setInput(name);
  }, [name]);

  const handleSave = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    await setName(trimmed);
    onClose();
  };

  return (
    <div data-testid="settings-overlay" className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          data-testid="settings-back"
          onClick={onClose}
          className="text-xl font-bold"
        >
          ←
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      {guardrailMessage && (
        <p
          data-testid="guardrail-message"
          className="text-sm text-amber-600 mb-4"
        >
          {guardrailMessage}
        </p>
      )}

      <label className="text-sm font-medium mb-1">Your name</label>
      <input
        data-testid="name-input"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="border rounded px-3 py-2 mb-4 text-sm"
        placeholder="Enter your name"
      />

      <button
        data-testid="save-name"
        onClick={handleSave}
        className="bg-purple-600 text-white rounded px-4 py-2 text-sm"
      >
        Save
      </button>
    </div>
  );
}
