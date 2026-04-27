import { create } from "zustand";
import { loadSessions, saveSessions } from "../storage";
import type { Session } from "../schemas/session.schema";

interface SessionState {
  sessions: Record<string, Session>;
  isLoaded: boolean;
  load: () => Promise<void>;
  getSessionsByPatient: (patientId: string) => Session[];
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
