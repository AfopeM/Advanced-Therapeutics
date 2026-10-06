import { useEffect, useState } from "react";
import {
  loadFolderHandle,
  pickBackupFolder,
  writeManualBackup,
} from "../../shared/backupFolder";
import { readBackup } from "../../shared/backup";
import { loadBackupStatus, updateBackupStatus } from "../../shared/storage";
import {
  DEFAULT_BACKUP_STATUS,
  type BackupStatus,
} from "../../shared/schemas/backupStatus.schema";
import { formatScriptDate } from "../../shared/utils";

const toMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const BackupSection = () => {
  const [folder, setFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [status, setStatus] = useState<BackupStatus>(DEFAULT_BACKUP_STATUS);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadFolderHandle()
      .then(setFolder)
      .catch((error: unknown) =>
        setErrorMessage(
          toMessage(error, "Could not read the saved backup folder."),
        ),
      );
    loadBackupStatus()
      .then(setStatus)
      .catch((error: unknown) =>
        setErrorMessage(toMessage(error, "Could not read backup status.")),
      );
  }, []);

  const handleChooseFolder = async () => {
    setErrorMessage(null);
    try {
      const handle = await pickBackupFolder();
      if (handle) setFolder(handle);
    } catch (error: unknown) {
      setErrorMessage(toMessage(error, "Could not use that folder."));
    }
  };

  const handleBackUpNow = async () => {
    if (!folder) return;
    setErrorMessage(null);
    setIsBackingUp(true);
    try {
      await writeManualBackup(folder, await readBackup());
      setStatus(
        await updateBackupStatus({ lastBackupAt: Date.now(), lastError: null }),
      );
    } catch (error: unknown) {
      const message = toMessage(error, "Backup failed.");
      setErrorMessage(message); // always visible, even if saving it below fails
      await updateBackupStatus({ lastError: message })
        .then(setStatus)
        .catch(() => undefined); // the real error is already on screen
    } finally {
      setIsBackingUp(false);
    }
  };

  const shownError = errorMessage ?? status.lastError;

  return (
    <div>
      <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
        Backup
      </p>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
        <button
          data-testid="choose-backup-folder"
          onClick={handleChooseFolder}
          className="w-full flex items-center cursor-pointer gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              Choose backup folder
            </p>
            <p
              data-testid="backup-folder-name"
              className="text-xs text-gray-400 mt-0.5 truncate"
            >
              {folder?.name ?? "No folder chosen"}
            </p>
          </div>
        </button>
        <button
          data-testid="backup-now"
          onClick={handleBackUpNow}
          disabled={!folder || isBackingUp}
          className="w-full flex items-center cursor-pointer gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {isBackingUp ? "Backing up…" : "Back up now"}
            </p>
            <p
              data-testid="backup-last-time"
              className="text-xs text-gray-400 mt-0.5 truncate"
            >
              {status.lastBackupAt
                ? `Last backup ${formatScriptDate(status.lastBackupAt)}`
                : "No backup yet"}
            </p>
          </div>
        </button>
        {shownError && (
          <p
            data-testid="backup-error"
            role="alert"
            className="px-4 py-3 text-xs text-red-500"
          >
            {shownError}
          </p>
        )}
      </div>
    </div>
  );
};
