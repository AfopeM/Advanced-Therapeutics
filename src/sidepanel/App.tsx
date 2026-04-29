import { useEffect, useState } from "react";
import { useUserStore } from "./shared/store/useUserStore";
import { usePatientStore } from "./shared/store/usePatientStore";
import { useSessionStore } from "./shared/store/useSessionStore";
import { Settings } from "./features/settings/Settings";
import { Hub } from "./features/hub/Hub";
import { Folder } from "./features/folder/Folder";
import { Workspace } from "./features/workspace/Workspace";
import shieldCheckIcon from "../assets/icons/shield-check.svg";

type View = "hub" | "folder" | "workspace";

export function App() {
  const { load: loadUser, name, isLoaded: userLoaded } = useUserStore();
  const { load: loadPatients } = usePatientStore();
  const { load: loadSessions } = useSessionStore();

  // Which screen is visible
  const [view, setView] = useState<View>("hub");
  // Which patient's folder we're currently inside
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

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

  const handlePatientClick = (patientId: string) => {
    setCurrentPatientId(patientId);
    setView("folder");
  };

  const handleBackToHub = () => {
    setCurrentPatientId(null);
    setView("hub");
  };

  const handleOpenWorkspace = (sessionId: string | null) => {
    setCurrentSessionId(sessionId);
    setView("workspace");
  };

  const handleBackFromWorkspace = () => {
    setCurrentSessionId(null);
    setView("folder");
  };

  if (!userLoaded) return null;

  // Settings overlays any view
  if (settingsOpen) {
    return (
      <Settings
        onClose={handleCloseSettings}
        guardrailMessage={guardrailMessage}
      />
    );
  }

  // Folder view
  if (view === "folder" && currentPatientId) {
    return (
      <Folder
        patientId={currentPatientId}
        onBack={handleBackToHub}
        onPatientDeleted={handleBackToHub}
        onOpenWorkspace={handleOpenWorkspace}
      />
    );
  }

  if (view === "workspace" && currentPatientId) {
    return (
      <Workspace
        patientId={currentPatientId}
        sessionId={currentSessionId}
        onBack={handleBackFromWorkspace}
      />
    );
  }

  // Hub view (default)
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Green branded header ── */}
      <div className="bg-[#7A9E2E] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-white font-black text-lg leading-none tracking-wider">
            ADVANCED
          </p>
          <p className="text-white/80 font-semibold text-[11px] leading-none tracking-[0.22em] mt-1">
            THERAPEUTICS
          </p>
        </div>
        <button
          data-testid="burger-menu"
          onClick={() => setSettingsOpen(true)}
          className="text-white text-2xl leading-none p-1"
          aria-label="Open settings"
        >
          ☰
        </button>
      </div>

      {/* ── Hub fills remaining space ── */}
      <div className="flex-1 overflow-hidden">
        <Hub
          userName={name}
          onOpenSettings={handleGuardrail}
          onPatientClick={handlePatientClick}
        />
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-center gap-2 py-2.5 bg-white border-t border-gray-100 flex-shrink-0">
        <img src={shieldCheckIcon} alt="" className="w-3.5 h-3.5 opacity-40" />
        <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          All data is stored locally on this device.
        </span>
      </div>
    </div>
  );
}
