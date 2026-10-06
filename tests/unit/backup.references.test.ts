import { describe, it, expect } from "vitest";
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
