import { z } from "zod";
import type { TemplatePill } from "../../../defaults/templates";

// Re-use the same pill shape already defined in templates.ts.
// We only import the TYPE here — no runtime dependency on the static list.
const TemplatePillSchema = z.object({
  key: z.string(),
  label: z.string(),
});

export const UserTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  pills: z.array(TemplatePillSchema),
  script_text: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type UserTemplate = z.infer<typeof UserTemplateSchema>;

// Re-export TemplatePill so callers don't need a second import.
export type { TemplatePill };
