import { useEffect, useState } from "react";
import { useUserStore } from "./shared/store/useUserStore";
import { usePatientStore } from "./shared/store/usePatientStore";
import { useSessionStore } from "./shared/store/useSessionStore";
import { Settings } from "./features/settings/Settings";
import { Hub } from "./features/hub/Hub";

export function App() {
  const { load: loadUser, name, isLoaded: userLoaded } = useUserStore();
  const { load: loadPatients } = usePatientStore();
  const { load: loadSessions } = useSessionStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guardrailMessage, setGuardrailMessage] = useState<
    string | undefined
  >();

  useEffect(() => {
    loadUser();
    loadPatients();
    loadSessions();
  }, []);

  const handleCloseSettings = () => {
    setSettingsOpen(false);
    setGuardrailMessage(undefined);
  };

  const handleGuardrail = () => {
    setGuardrailMessage("Please set your name before creating a patient.");
    setSettingsOpen(true);
  };

  if (!userLoaded) return null;

  if (settingsOpen) {
    return (
      <Settings
        onClose={handleCloseSettings}
        guardrailMessage={guardrailMessage}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-base font-semibold">Call Scripts</h1>
        <button
          data-testid="burger-menu"
          onClick={() => setSettingsOpen(true)}
          className="text-xl"
        >
          ☰
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Hub
          userName={name}
          onOpenSettings={handleGuardrail}
          onPatientClick={(_patientId) => {
            // Phase 4: navigate to folder
          }}
        />
      </div>
    </div>
  );
}
