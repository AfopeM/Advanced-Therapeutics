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
