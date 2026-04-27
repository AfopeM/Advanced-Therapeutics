import { create } from "zustand";
import { loadPatients, savePatients } from "../storage";
import { generateId } from "../utils";
import type { Patient } from "../schemas/patient.schema";

interface PatientState {
  patients: Record<string, Patient>;
  isLoaded: boolean;
  load: () => Promise<void>;
  addPatient: (name: string) => Promise<Patient>;
  renamePatient: (id: string, newName: string) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: {},
  isLoaded: false,

  load: async () => {
    const patients = await loadPatients();
    set({ patients, isLoaded: true });
  },

  addPatient: async (name: string) => {
    const patient: Patient = {
      id: generateId(),
      name,
      createdAt: Date.now(),
    };
    const updated = { ...get().patients, [patient.id]: patient };
    await savePatients(updated);
    set({ patients: updated });
    return patient;
  },

  renamePatient: async (id: string, newName: string) => {
    const patients = { ...get().patients };
    if (!patients[id]) return;
    patients[id] = { ...patients[id], name: newName };
    await savePatients(patients);
    set({ patients });
  },

  deletePatient: async (id: string) => {
    const patients = { ...get().patients };
    delete patients[id];
    await savePatients(patients);
    set({ patients });
  },
}));
