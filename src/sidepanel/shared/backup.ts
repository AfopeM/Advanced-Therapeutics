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

export type ParsedBackup =
  | { isValid: true; backup: Backup; warnings: string[] }
  | { isValid: false; error: string };

export const parseBackupFile = (text: string): ParsedBackup => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      isValid: false,
      error: "This file isn't valid JSON. Pick a backup made by this app.",
    };
  }

  const result = BackupSchema.safeParse(json);
  if (!result.success) {
    const [issue] = result.error.issues;
    const detail = issue
      ? `${issue.path.map(String).join(".") || "file"}: ${issue.message}`
      : "unknown problem";
    return {
      isValid: false,
      error: `This isn't a valid backup file (${detail}).`,
    };
  }

  return {
    isValid: true,
    backup: result.data,
    warnings: checkReferences(result.data),
  };
};

// Replaces the stored data with a backup that already passed parseBackupFile.
// Errors are not caught here: the UI shows them and storage stays as it was.
export const restoreBackup = async (backup: Backup): Promise<void> => {
  await chrome.storage.local.set({
    ...(backup.user ? { user: backup.user } : {}),
    patients: backup.patients,
    sessions: backup.sessions,
    userTemplates: backup.userTemplates,
  });
};
