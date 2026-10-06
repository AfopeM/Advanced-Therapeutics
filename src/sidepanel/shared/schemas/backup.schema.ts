import { z } from "zod";
import { PatientSchema } from "./patient.schema";
import { SessionSchema } from "./session.schema";
import { UserSchema } from "./user.schema";
import { UserTemplateSchema } from "./userTemplate.schema";

export const BackupSchema = z.object({
  version: z.literal(1),
  user: UserSchema.optional(),
  patients: z.record(z.string(), PatientSchema),
  sessions: z.record(z.string(), SessionSchema),
  userTemplates: z.record(z.string(), UserTemplateSchema).default({}),
});

export type Backup = z.infer<typeof BackupSchema>;
