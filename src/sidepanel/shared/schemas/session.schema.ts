import { z } from "zod";

export const SessionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  name: z.string().min(1),
  templateId: z.string(),
  pillValues: z.record(z.string(), z.string()),
  savedAt: z.number(),
});

export type Session = z.infer<typeof SessionSchema>;
