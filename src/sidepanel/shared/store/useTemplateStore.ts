import { create } from "zustand";
import { loadUserTemplates, saveUserTemplates } from "../storage";
import {
  TEMPLATES_MAP,
  getTemplate,
  type Template,
} from "../../../defaults/templates";
import type { UserTemplate } from "../schemas/userTemplate.schema";

// A UserTemplate is structurally compatible with Template for rendering purposes,
// but lacks badgeClass. We derive it here so every consumer gets a full Template.
function badgeClassFromId(id: string): string {
  // Same djb2 hash PatientCard uses for avatar colors
  let hash = 0;
  for (const char of id) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  const palettes = [
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-teal-100 text-teal-700",
    "bg-sky-100 text-sky-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-orange-100 text-orange-700",
  ];
  return palettes[Math.abs(hash) % palettes.length];
}

/** Converts a UserTemplate into the full Template shape the UI expects. */
export function userTemplateToTemplate(ut: UserTemplate): Template {
  return {
    id: ut.id,
    name: ut.name,
    badgeClass: badgeClassFromId(ut.id),
    pills: ut.pills,
    script_text: ut.script_text,
  };
}

interface TemplateStore {
  userTemplates: Record<string, UserTemplate>;
  isLoaded: boolean;
  load: () => Promise<void>;
  addTemplate: (template: UserTemplate) => Promise<void>;
  updateTemplate: (
    id: string,
    updates: Partial<Omit<UserTemplate, "id" | "createdAt">>,
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  /** Returns the full Template for any id — user-created, system, or gray fallback. */
  resolveTemplate: (id: string) => Template;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  userTemplates: {},
  isLoaded: false,

  load: async () => {
    const userTemplates = await loadUserTemplates();
    set({ userTemplates, isLoaded: true });
  },

  addTemplate: async (template: UserTemplate) => {
    const userTemplates = { ...get().userTemplates, [template.id]: template };
    set({ userTemplates });
    await saveUserTemplates(userTemplates);
  },

  updateTemplate: async (id, updates) => {
    const userTemplates = { ...get().userTemplates };
    if (!userTemplates[id]) return;
    userTemplates[id] = {
      ...userTemplates[id],
      ...updates,
      updatedAt: Date.now(),
    };
    set({ userTemplates });
    await saveUserTemplates(userTemplates);
  },

  deleteTemplate: async (id: string) => {
    const userTemplates = { ...get().userTemplates };
    delete userTemplates[id];
    set({ userTemplates });
    await saveUserTemplates(userTemplates);
  },

  resolveTemplate: (id: string): Template => {
    // 1. User-created template
    const ut = get().userTemplates[id];
    if (ut) return userTemplateToTemplate(ut);

    // 2. System template
    if (TEMPLATES_MAP[id]) return TEMPLATES_MAP[id];

    // 3. Gray fallback (existing behavior)
    return getTemplate(id);
  },
}));
