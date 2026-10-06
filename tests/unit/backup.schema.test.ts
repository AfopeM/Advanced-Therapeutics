import { describe, it, expect } from "vitest";
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
