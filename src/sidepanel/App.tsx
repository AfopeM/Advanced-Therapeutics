import { useEffect, useState } from "react";
import { useUserStore } from "./shared/store/useUserStore";
import { Settings } from "./features/settings/Settings";

export function App() {
  const { load, name, isLoaded } = useUserStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guardrailMessage, setGuardrailMessage] = useState<
    string | undefined
  >();

  // Boot: load the user name from Chrome storage once
  useEffect(() => {
    load();
  }, []);

  const canCreatePatient = () => name.trim().length > 0;

  const handleNewPatient = () => {
    if (!canCreatePatient()) {
      setGuardrailMessage("Please set your name before creating a patient.");
      setSettingsOpen(true);
    } else {
      setGuardrailMessage(undefined);
      // Phase 3 will handle the actual patient creation
    }
  };

  const handleOpenSettings = () => {
    setGuardrailMessage(undefined);
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
    setGuardrailMessage(undefined);
  };

  if (!isLoaded) return null;

  if (settingsOpen) {
    return (
      <Settings
        onClose={handleCloseSettings}
        guardrailMessage={guardrailMessage}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-base font-semibold">Call Scripts</h1>
        <button
          data-testid="burger-menu"
          onClick={handleOpenSettings}
          className="text-xl"
        >
          ☰
        </button>
      </div>

      <div className="flex-1 p-4">
        {/* Hub renders here in Phase 3 */}
        <button
          data-testid="new-patient-btn"
          onClick={handleNewPatient}
          className="text-sm text-purple-600 underline"
        >
          + New Patient
        </button>
      </div>
    </div>
  );
}
