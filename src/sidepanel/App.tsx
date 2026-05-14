import { useEffect, useState } from "react";
import { useUserStore } from "./shared/store/useUserStore";
import { usePatientStore } from "./shared/store/usePatientStore";
import { useSessionStore } from "./shared/store/useSessionStore";
import { Settings } from "./features/settings/Settings";
import { Hub } from "./features/hub/Hub";
import { Folder } from "./features/folder/Folder";
import { Workspace } from "./features/workspace/Workspace";
import Footer from "./shared/components/Footer";
import menuIcon from "../assets/icons/menu.svg";
import { useTemplateStore } from "./shared/store/useTemplateStore";

type View = "hub" | "folder" | "workspace";

export function App() {
  const { load: loadUser, name, isLoaded: userLoaded } = useUserStore();
  const { load: loadPatients } = usePatientStore();
  const { load: loadSessions } = useSessionStore();
  const { load: loadTemplates, isLoaded: templatesLoaded } = useTemplateStore();

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
    loadTemplates();
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

  if (!userLoaded || !templatesLoaded) return null;

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
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* ── Green branded header ── */}
      <div className="bg-dark px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-brand uppercase font-black text-2xl leading-none tracking-wider">
            Advanced
          </p>
          <p className="text-white uppercase font-light text-md leading-none tracking-[0.34em]">
            Therapeutics
          </p>
        </div>
        <button
          data-testid="burger-menu"
          onClick={() => setSettingsOpen(true)}
          className="text-white text-2xl group leading-none p-1 cursor-pointer"
          aria-label="Open settings"
        >
          <img
            src={menuIcon}
            alt=""
            className="w-6 h-6 opacity-100 group-hover:opacity-40 transition-all shrink-0 invert"
          />
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
      <Footer />
    </div>
  );
}
