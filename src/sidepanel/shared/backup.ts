import { TEMPLATES_MAP } from "../../defaults/templates";
import { BackupSchema, type Backup } from "./schemas/backup.schema";

const BACKUP_KEYS: string[] = ["user", "patients", "sessions", "userTemplates"];

export const readBackup = async (): Promise<Backup> => {
  const raw = await chrome.storage.local.get(BACKUP_KEYS);
  return BackupSchema.parse({
    version: 1,
    user: raw.user,
    patients: raw.patients ?? {},
    sessions: raw.sessions ?? {},
    userTemplates: raw.userTemplates,
  });
};

export const checkReferences = (backup: Backup): string[] => {
  const patientIds = new Set(Object.keys(backup.patients));
  const templateIds = new Set([
    ...Object.keys(TEMPLATES_MAP),
    ...Object.keys(backup.userTemplates),
  ]);

  const warnings: string[] = [];
  for (const session of Object.values(backup.sessions)) {
    if (!patientIds.has(session.patientId)) {
      warnings.push(`Script "${session.name}" points to a missing patient.`);
    }
    if (!templateIds.has(session.templateId)) {
      warnings.push(`Script "${session.name}" uses an unknown template.`);
    }
  }
  return warnings;
};
