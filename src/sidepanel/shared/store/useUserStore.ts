import { create } from "zustand";
import { loadUser, saveUser } from "../storage";

interface UserState {
  name: string;
  isLoaded: boolean;
  setName: (name: string) => Promise<void>;
  load: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  name: "",
  isLoaded: false,

  load: async () => {
    const user = await loadUser();
    set({ name: user?.name ?? "", isLoaded: true });
  },

  setName: async (name: string) => {
    await saveUser({ name });
    set({ name });
  },
}));
