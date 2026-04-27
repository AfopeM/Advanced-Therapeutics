import { create } from "zustand";
import { loadSessions, saveSessions } from "../storage";
import type { Session } from "../schemas/session.schema";

interface SessionState {
  sessions: Record<string, Session>;
  isLoaded: boolean;
  load: () => Promise<void>;
  getSessionsByPatient: (patientId: string) => Session[];
  addSession: (session: Session) => Promise<void>;
  updateSession: (
    id: string,
    updates: Partial<Omit<Session, "id">>,
  ) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  deleteSessionsByPatient: (patientId: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: {},
  isLoaded: false,

  load: async () => {
    const sessions = await loadSessions();
    set({ sessions, isLoaded: true });
  },

  getSessionsByPatient: (patientId: string) => {
    return Object.values(get().sessions).filter(
      (s) => s.patientId === patientId,
    );
  },

  /** Adds a brand-new session to storage and state. Used by the Workspace. */
  addSession: async (session: Session) => {
    const sessions = { ...get().sessions, [session.id]: session };
    await saveSessions(sessions);
    set({ sessions });
  },

  /**
   * Merges partial updates into one session.
   * Used for: rename (update name), PatientInfoCard save (update pillValues).
   */
  updateSession: async (id: string, updates: Partial<Omit<Session, "id">>) => {
    const sessions = { ...get().sessions };
    if (!sessions[id]) return;
    sessions[id] = { ...sessions[id], ...updates };
    await saveSessions(sessions);
    set({ sessions });
  },

  /** Removes a single session. Used by the delete-script flow in the Folder. */
  deleteSession: async (id: string) => {
    const sessions = { ...get().sessions };
    delete sessions[id];
    await saveSessions(sessions);
    set({ sessions });
  },

  /** Removes ALL sessions for a patient. Used by the delete-patient flow. */
  deleteSessionsByPatient: async (patientId: string) => {
    const sessions = { ...get().sessions };
    for (const key of Object.keys(sessions)) {
      if (sessions[key].patientId === patientId) {
        delete sessions[key];
      }
    }
    await saveSessions(sessions);
    set({ sessions });
  },
}));
