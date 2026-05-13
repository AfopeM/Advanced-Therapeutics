import { z } from "zod";

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
  scriptText: z.string().optional(),
  savedAt: z.number(),
  createdAt: z.number().optional(),
});

export type Session = z.infer<typeof SessionSchema>;
