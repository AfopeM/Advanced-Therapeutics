import { z } from "zod";

// Shape of a custom pill defined by the user via "+ Add field"
const CustomPillSchema = z.object({
  key: z.string(),
  label: z.string(),
});

export const SessionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  name: z.string().min(1),
  templateId: z.string(),
  pillValues: z.record(z.string(), z.string()),
  customPills: z.array(CustomPillSchema).optional(),
  savedAt: z.number(),
});

export type Session = z.infer<typeof SessionSchema>;
