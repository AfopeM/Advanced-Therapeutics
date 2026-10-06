import { useEffect, useRef, useState } from "react";
import {
  loadFolderHandle,
  pickBackupFolder,
  writeManualBackup,
} from "../../shared/backupFolder";
import { loadBackupStatus, updateBackupStatus } from "../../shared/storage";
import {
  DEFAULT_BACKUP_STATUS,
  type BackupStatus,
} from "../../shared/schemas/backupStatus.schema";
import { formatScriptDate } from "../../shared/utils";
import {
  parseBackupFile,
  readBackup,
  restoreBackup,
} from "../../shared/backup";
import type { Backup } from "../../shared/schemas/backup.schema";
import { usePatientStore } from "../../shared/store/usePatientStore";
import { useSessionStore } from "../../shared/store/useSessionStore";
import { useTemplateStore } from "../../shared/store/useTemplateStore";
import { useUserStore } from "../../shared/store/useUserStore";

const toMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const patientLabel = (count: number): string =>
  `${count} ${count === 1 ? "patient" : "patients"}`;

interface PendingImport {
  backup: Backup;
  warnings: string[];
}

export const BackupSection = () => {
  const [folder, setFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [status, setStatus] = useState<BackupStatus>(DEFAULT_BACKUP_STATUS);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    null,
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A number, so this only re-renders when the count changes.
  const currentPatientCount = usePatientStore(
    (state) => Object.keys(state.patients).length,
  );

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

  const handleFileChosen = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again later
    if (!file) return;

    setErrorMessage(null);
    setImportNotice(null);
    try {
      const parsed = parseBackupFile(await file.text());
      if (!parsed.isValid) {
        setErrorMessage(parsed.error);
        return;
      }
      setPendingImport({ backup: parsed.backup, warnings: parsed.warnings });
    } catch (error: unknown) {
      setErrorMessage(toMessage(error, "Could not read that file."));
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setIsImporting(true);
    try {
      await restoreBackup(pendingImport.backup);
      // The stores hold their own copy of the data; reload so they don't
      // write the old copy back on the next edit.
      await Promise.all([
        useUserStore.getState().load(),
        usePatientStore.getState().load(),
        useSessionStore.getState().load(),
        useTemplateStore.getState().load(),
      ]);
      setImportNotice(
        `Imported ${patientLabel(Object.keys(pendingImport.backup.patients).length)}.`,
      );
    } catch (error: unknown) {
      setErrorMessage(toMessage(error, "Import failed."));
    } finally {
      setPendingImport(null);
      setIsImporting(false);
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

        <button
          data-testid="import-backup"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center cursor-pointer gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Import backup</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Replaces all current data
            </p>
          </div>
        </button>
        <input
          ref={fileInputRef}
          data-testid="import-file-input"
          type="file"
          accept=".json,application/json"
          onChange={handleFileChosen}
          className="hidden"
        />
        {importNotice && (
          <p
            data-testid="import-success"
            role="status"
            className="px-4 py-3 text-xs text-green-600"
          >
            {importNotice}
          </p>
        )}
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
      {pendingImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            data-testid="import-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-confirm-title"
            className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
          >
            <p
              id="import-confirm-title"
              className="text-sm font-semibold text-gray-800 mb-1"
            >
              Replace all data?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              File has{" "}
              {patientLabel(Object.keys(pendingImport.backup.patients).length)}.
              You currently have {patientLabel(currentPatientCount)}. This
              replaces all current data and cannot be undone.
            </p>
            {pendingImport.warnings.length > 0 && (
              <ul
                data-testid="import-warnings"
                className="text-xs text-amber-700 mb-4 list-disc pl-4"
              >
                {pendingImport.warnings.slice(0, 3).map((warning, index) => (
                  <li key={`${index}-${warning}`}>{warning}</li>
                ))}
                {pendingImport.warnings.length > 3 && (
                  <li>and {pendingImport.warnings.length - 3} more.</li>
                )}
              </ul>
            )}
            <div className="flex gap-3 justify-end">
              <button
                data-testid="import-confirm-cancel"
                onClick={() => setPendingImport(null)}
                disabled={isImporting}
                className="border cursor-pointer border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                data-testid="import-confirm-ok"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="bg-red-500 cursor-pointer hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {isImporting ? "Importing…" : "Replace all data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
