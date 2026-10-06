import { z } from "zod";

export const BackupStatusSchema = z.object({
  lastBackupAt: z.number().nullable(),
  lastError: z.string().nullable(),
  nextAutoSlot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export type BackupStatus = z.infer<typeof BackupStatusSchema>;

export const DEFAULT_BACKUP_STATUS: BackupStatus = {
  lastBackupAt: null,
  lastError: null,
  nextAutoSlot: 1,
};
