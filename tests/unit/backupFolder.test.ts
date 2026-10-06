import { describe, it, expect } from "vitest";
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
