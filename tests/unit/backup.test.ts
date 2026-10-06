import { describe, it, expect, vi, afterEach } from "vitest";
import { readBackup } from "../../src/sidepanel/shared/backup";

// Fake chrome.storage.local that, like the real one, returns only the
// keys you ask for and only if they exist.
const stubStorage = (data: Record<string, unknown>) => {
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (keys: string[]) =>
          Object.fromEntries(
            keys.filter((k) => k in data).map((k) => [k, data[k]]),
          ),
        ),
      },
    },
  });
};

afterEach(() => vi.unstubAllGlobals());

describe("readBackup", () => {
  it("returns all four keys with version 1", async () => {
    stubStorage({
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
      userTemplates: {},
    });
    const backup = await readBackup();
    expect(backup.version).toBe(1);
    expect(backup.user?.name).toBe("Dr. Smith");
    expect(Object.keys(backup.patients)).toEqual(["p1"]);
  });

  it("treats empty storage as empty data, not an error", async () => {
    stubStorage({});
    const backup = await readBackup();
    expect(backup.patients).toEqual({});
    expect(backup.sessions).toEqual({});
    expect(backup.userTemplates).toEqual({});
    expect(backup.user).toBeUndefined();
  });

  it("throws on corrupt data instead of returning an empty backup", async () => {
    stubStorage({ patients: { p1: { id: 1 } }, sessions: {} });
    await expect(readBackup()).rejects.toThrow();
  });
});

// ==================
// PARSE
// ==================
import { parseBackupFile } from "../../src/sidepanel/shared/backup";

const good = {
  version: 1,
  user: { name: "Dr. Smith" },
  patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
  sessions: {},
  userTemplates: {},
};

describe("parseBackupFile", () => {
  it("accepts a valid backup with no warnings", () => {
    const result = parseBackupFile(JSON.stringify(good));
    expect(result.isValid).toBe(true);
    if (result.isValid) expect(result.warnings).toEqual([]);
  });

  it("rejects text that is not JSON", () => {
    expect(parseBackupFile("not json {").isValid).toBe(false);
  });

  it("rejects a wrong version and names the field", () => {
    const result = parseBackupFile(JSON.stringify({ ...good, version: 2 }));
    expect(result.isValid).toBe(false);
    if (!result.isValid) expect(result.error).toContain("version");
  });

  it("allows a script with a missing patient but warns", () => {
    const orphan = {
      ...good,
      sessions: {
        s1: {
          id: "s1",
          patientId: "ghost",
          name: "S",
          templateId: "sms",
          pillValues: {},
          savedAt: 1,
        },
      },
    };
    const result = parseBackupFile(JSON.stringify(orphan));
    expect(result.isValid).toBe(true);
    if (result.isValid) expect(result.warnings).toHaveLength(1);
  });
});

// ==================
// REFERENCES
// ==================
import { checkReferences } from "../../src/sidepanel/shared/backup";
import type { Backup } from "../../src/sidepanel/shared/schemas/backup.schema";

const makeBackup = (
  sessionOverrides: { patientId?: string; templateId?: string } = {},
  userTemplates: Backup["userTemplates"] = {},
): Backup => ({
  version: 1,
  patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
  userTemplates,
  sessions: {
    s1: {
      id: "s1",
      patientId: "p1",
      name: "Script",
      templateId: "device_confirmation",
      pillValues: {},
      savedAt: 1000,
      ...sessionOverrides,
    },
  },
});

describe("checkReferences", () => {
  it("returns no warnings when every link is valid", () => {
    expect(checkReferences(makeBackup())).toEqual([]);
  });

  it("warns about a session whose patient does not exist", () => {
    const warnings = checkReferences(makeBackup({ patientId: "ghost" }));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("missing patient");
  });

  it("warns about a session whose template is neither built-in nor user-made", () => {
    const warnings = checkReferences(makeBackup({ templateId: "nope" }));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("unknown template");
  });

  it("accepts a template that exists only in userTemplates", () => {
    const userTemplates = {
      t9: {
        id: "t9",
        name: "Mine",
        pills: [],
        script_text: "",
        createdAt: 1,
        updatedAt: 1,
      },
    };
    expect(
      checkReferences(makeBackup({ templateId: "t9" }, userTemplates)),
    ).toEqual([]);
  });
});

// ==================
// RESTORE
// ==================
import { restoreBackup } from "../../src/sidepanel/shared/backup";

const stubStorageRestore = (initial: Record<string, unknown>) => {
  const store = { ...initial };
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        }),
      },
    },
  });
  return store;
};

afterEach(() => vi.unstubAllGlobals());

describe("restoreBackup", () => {
  it("replaces the data keys, keeps the user when the file has none, and leaves backupStatus alone", async () => {
    const status = { lastBackupAt: 5, lastError: null, nextAutoSlot: 2 };
    const store = stubStorageRestore({
      user: { name: "Dr. Smith" },
      patients: { old: { id: "old", name: "Old", createdAt: 1 } },
      sessions: { s9: { id: "s9" } },
      userTemplates: { t9: { id: "t9" } },
      backupStatus: status,
    });

    await restoreBackup({
      version: 1,
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
      userTemplates: {},
    });

    expect(Object.keys(store.patients as object)).toEqual(["p1"]);
    expect(store.sessions).toEqual({});
    expect(store.userTemplates).toEqual({});
    expect(store.user).toEqual({ name: "Dr. Smith" });
    expect(store.backupStatus).toEqual(status);
  });
});

// ==================
// SCHEMA
// ==================
import { BackupSchema } from "../../src/sidepanel/shared/schemas/backup.schema";

const validBackup = {
  version: 1,
  user: { name: "Dr. Smith" },
  patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
  sessions: {},
  userTemplates: {},
};

describe("BackupSchema", () => {
  it("accepts a valid backup", () => {
    expect(BackupSchema.safeParse(validBackup).success).toBe(true);
  });

  it("rejects a wrong version", () => {
    expect(BackupSchema.safeParse({ ...validBackup, version: 2 }).success).toBe(
      false,
    );
  });

  it("accepts a missing user and fills userTemplates with {}", () => {
    const parsed = BackupSchema.parse({
      version: 1,
      patients: {},
      sessions: {},
    });
    expect(parsed.userTemplates).toEqual({});
  });

  it("rejects a missing patients key", () => {
    expect(
      BackupSchema.safeParse({ ...validBackup, patients: undefined }).success,
    ).toBe(false);
  });

  it("rejects wrong data types inside a patient", () => {
    const bad = {
      ...validBackup,
      patients: { p1: { id: 1, name: "Alice", createdAt: 1000 } },
    };
    expect(BackupSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a file with no version key", () => {
    expect(BackupSchema.safeParse({ patients: {}, sessions: {} }).success).toBe(
      false,
    );
  });

  it("rejects input that is not an object", () => {
    for (const bad of [null, "hello", []]) {
      expect(BackupSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("rejects a session missing required fields", () => {
    const bad = {
      ...validBackup,
      sessions: { s1: { id: "s1", patientId: "p1" } },
    };
    expect(BackupSchema.safeParse(bad).success).toBe(false);
  });
});

// ==================
// FOLDER
// ==================
import { manualBackupName } from "../../src/sidepanel/shared/backupFolder";

describe("manualBackupName", () => {
  const moment = new Date(2026, 9, 5, 14, 30, 7); // month 9 = October

  it("uses date and time to the minute", () => {
    expect(manualBackupName(moment)).toBe("backup-manual-2026-10-05-1430.json");
  });

  it("adds seconds when asked", () => {
    expect(manualBackupName(moment, true)).toBe(
      "backup-manual-2026-10-05-143007.json",
    );
  });
});

// ==================
// STATUS
// ==================
import {
  BackupStatusSchema,
  DEFAULT_BACKUP_STATUS,
} from "../../src/sidepanel/shared/schemas/backupStatus.schema";
import {
  loadBackupStatus,
  updateBackupStatus,
} from "../../src/sidepanel/shared/storage";

// Fake chrome.storage.local that supports get and set.
const stubStorageStatus = (initial: Record<string, unknown>) => {
  const store = { ...initial };
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) =>
          key in store ? { [key]: store[key] } : {},
        ),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(store, items);
        }),
      },
    },
  });
};

afterEach(() => vi.unstubAllGlobals());

describe("BackupStatusSchema", () => {
  it("accepts the default status", () => {
    expect(BackupStatusSchema.safeParse(DEFAULT_BACKUP_STATUS).success).toBe(
      true,
    );
  });

  it("rejects a slot outside 1-3", () => {
    const bad = { ...DEFAULT_BACKUP_STATUS, nextAutoSlot: 4 };
    expect(BackupStatusSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a missing field", () => {
    expect(
      BackupStatusSchema.safeParse({ lastBackupAt: null, lastError: null })
        .success,
    ).toBe(false);
  });
});

describe("backup status storage", () => {
  it("returns defaults when nothing is stored", async () => {
    stubStorageStatus({});
    expect(await loadBackupStatus()).toEqual(DEFAULT_BACKUP_STATUS);
  });

  it("changes only the fields it is given", async () => {
    stubStorageStatus({
      backupStatus: { lastBackupAt: 5, lastError: "old", nextAutoSlot: 2 },
    });
    expect(await updateBackupStatus({ lastError: null })).toEqual({
      lastBackupAt: 5,
      lastError: null,
      nextAutoSlot: 2,
    });
  });
});
