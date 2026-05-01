import { z } from "zod";

export const PatientSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.number(),
  sharedPillValues: z.record(z.string(), z.string()).optional(),
});

export type Patient = z.infer<typeof PatientSchema>;
