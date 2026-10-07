import type { Backup } from "./schemas/backup.schema";
import type { BackupStatus } from "./schemas/backupStatus.schema";

const DB_NAME = "backup-folder";
const STORE_NAME = "handles";
const HANDLE_KEY = "backupFolder";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// Runs one IndexedDB operation and resolves only after the transaction commits.
const withStore = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = action(tx.objectStore(STORE_NAME));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

export const saveFolderHandle = async (
  handle: FileSystemDirectoryHandle,
): Promise<void> => {
  await withStore("readwrite", (store) => store.put(handle, HANDLE_KEY));
};

export const loadFolderHandle =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    const value = await withStore<unknown>("readonly", (store) =>
      store.get(HANDLE_KEY),
    );
    // Validate: IndexedDB can hold anything, the type system can't vouch for it.
    return value instanceof FileSystemDirectoryHandle ? value : null;
  };

// Returns null if the user cancels the picker. Real failures are thrown.
export const pickBackupFolder =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await saveFolderHandle(handle);
      return handle;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null; // cancelling isn't a failure
      }
      throw error;
    }
  };
const pad = (value: number): string => String(value).padStart(2, "0");

// "backup-manual-2026-10-05-1430.json", or with seconds: "...-143007.json"
export const manualBackupName = (now: Date, withSeconds = false): string => {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const seconds = withSeconds ? pad(now.getSeconds()) : "";
  return `backup-manual-${date}-${time}${seconds}.json`;
};

const fileExists = async (
  folder: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> => {
  try {
    await folder.getFileHandle(name); // no { create: true }, so this only looks
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return false;
    }
    throw error;
  }
};

const ensureWritePermission = async (
  folder: FileSystemDirectoryHandle,
): Promise<void> => {
  const options = { mode: "readwrite" } as const;
  if ((await folder.queryPermission(options)) === "granted") return;
  // Needs a user click, which "Back up now" provides.
  if ((await folder.requestPermission(options)) !== "granted") {
    throw new Error("Permission to write to the backup folder was denied.");
  }
};

type AutoSlot = BackupStatus["nextAutoSlot"];

export const PERMISSION_NEEDED_MESSAGE =
  "Backup paused: click to re-enable folder access.";

const NEXT_SLOT: Record<AutoSlot, AutoSlot> = { 1: 2, 2: 3, 3: 1 };

export const advanceSlot = (slot: AutoSlot): AutoSlot => NEXT_SLOT[slot];

export const autoBackupName = (slot: AutoSlot): string =>
  `backup-auto-${slot}.json`;

// Shared by manual and automatic backups.
const writeBackupFile = async (
  folder: FileSystemDirectoryHandle,
  name: string,
  backup: Backup,
): Promise<void> => {
  const file = await folder.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(JSON.stringify(backup, null, 2));
    await writable.close();
  } catch (error) {
    // Release the file so a retry isn't blocked. The old contents stay intact.
    await writable.abort().catch(() => undefined);
    throw error;
  }
};

// Overwrites the file for this slot. Returns the file name it wrote.
export const writeAutoBackup = async (
  folder: FileSystemDirectoryHandle,
  backup: Backup,
  slot: AutoSlot,
): Promise<string> => {
  // No user click here, so we may only CHECK permission, never ask for it.
  if ((await folder.queryPermission({ mode: "readwrite" })) !== "granted") {
    throw new Error(PERMISSION_NEEDED_MESSAGE);
  }
  const name = autoBackupName(slot);
  await writeBackupFile(folder, name, backup);
  return name;
};

// Returns the file name it wrote. Never overwrites an existing file.
export const writeManualBackup = async (
  folder: FileSystemDirectoryHandle,
  backup: Backup,
  now: Date = new Date(),
): Promise<string> => {
  await ensureWritePermission(folder);

  let name = manualBackupName(now);
  if (await fileExists(folder, name)) {
    name = manualBackupName(now, true);
    if (await fileExists(folder, name)) {
      throw new Error(
        "A backup with this exact time already exists. Try again.",
      );
    }
  }

  await writeBackupFile(folder, name, backup);
  return name;
};
