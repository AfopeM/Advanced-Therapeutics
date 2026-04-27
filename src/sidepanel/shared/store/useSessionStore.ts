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

  addSession: async (session: Session) => {
    const sessions = { ...get().sessions, [session.id]: session };
    set({ sessions }); // state first — UI updates immediately
    await saveSessions(sessions); // storage second — catches up async
  },

  updateSession: async (id: string, updates: Partial<Omit<Session, "id">>) => {
    const sessions = { ...get().sessions };
    if (!sessions[id]) return;
    sessions[id] = { ...sessions[id], ...updates };
    set({ sessions }); // state first
    await saveSessions(sessions); // storage second
  },

  deleteSession: async (id: string) => {
    const sessions = { ...get().sessions };
    delete sessions[id];
    set({ sessions }); // state first
    await saveSessions(sessions); // storage second
  },

  deleteSessionsByPatient: async (patientId: string) => {
    const sessions = { ...get().sessions };
    for (const key of Object.keys(sessions)) {
      if (sessions[key].patientId === patientId) {
        delete sessions[key];
      }
    }
    set({ sessions }); // state first
    await saveSessions(sessions); // storage second
  },
}));
