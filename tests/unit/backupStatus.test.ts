import { describe, it, expect, vi, afterEach } from "vitest";
import {
  BackupStatusSchema,
  DEFAULT_BACKUP_STATUS,
} from "../../src/sidepanel/shared/schemas/backupStatus.schema";
import {
  loadBackupStatus,
  updateBackupStatus,
} from "../../src/sidepanel/shared/storage";

// Fake chrome.storage.local that supports get and set.
const stubStorage = (initial: Record<string, unknown>) => {
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
    stubStorage({});
    expect(await loadBackupStatus()).toEqual(DEFAULT_BACKUP_STATUS);
  });

  it("changes only the fields it is given", async () => {
    stubStorage({
      backupStatus: { lastBackupAt: 5, lastError: "old", nextAutoSlot: 2 },
    });
    expect(await updateBackupStatus({ lastError: null })).toEqual({
      lastBackupAt: 5,
      lastError: null,
      nextAutoSlot: 2,
    });
  });
});
