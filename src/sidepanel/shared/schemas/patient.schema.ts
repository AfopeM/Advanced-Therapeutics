import { z } from "zod";

export const PatientSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.number(), // Unix timestamp
});

export type Patient = z.infer<typeof PatientSchema>;
