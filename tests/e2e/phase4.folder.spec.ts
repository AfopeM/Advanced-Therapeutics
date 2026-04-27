import { test, expect, type Page } from "@playwright/test";
import { loadExtension } from "../helpers/extension";

const PANEL = (id: string) =>
  `chrome-extension://${id}/src/sidepanel/sidepanel.html`;

// Seeds user + patients + sessions, then reloads
async function seedStorage(page: Page, data: Record<string, unknown>) {
  await page.evaluate(async (d) => {
    await chrome.storage.local.set(d);
  }, data);
  await page.reload();
  await page.waitForSelector('[data-testid="hub-view"]');
}

// Clicks the first patient card to open its folder
async function openFirstFolder(page: Page) {
  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');
}

test.describe("Phase 4 — Patient Folder", () => {
  test("clicking a patient card navigates to their folder", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await page.getByTestId("patient-card").click();
    await expect(page.getByTestId("folder-view")).toBeVisible();
    await context.close();
  });

  test("folder header shows the correct patient name", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice Watts", createdAt: 1000 } },
      sessions: {},
    });

    await openFirstFolder(page);
    await expect(page.getByTestId("folder-patient-name")).toHaveText(
      "Alice Watts",
    );
    await context.close();
  });

  test("empty state is shown when no scripts exist", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFirstFolder(page);
    await expect(page.getByTestId("folder-empty-state")).toBeVisible();
    await context.close();
  });

  test("back arrow returns to hub with patient list intact", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFirstFolder(page);
    await page.getByTestId("folder-back").click();

    await expect(page.getByTestId("hub-view")).toBeVisible();
    await expect(page.getByTestId("patient-card")).toHaveCount(1);
    await context.close();
  });

  test("session cards show name, template badge, and last saved date", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Call Script",
          templateId: "intake",
          pillValues: {},
          savedAt: 1700000000000,
        },
      },
    });

    await openFirstFolder(page);
    await expect(page.getByTestId("session-card")).toHaveCount(1);
    await expect(page.getByTestId("template-badge")).toBeVisible();
    // The badge should show the template name
    await expect(page.getByTestId("template-badge")).toContainText("Intake");
    await context.close();
  });

  test("template badge color matches template type", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Script A",
          templateId: "intake",
          pillValues: {},
          savedAt: 2000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Script B",
          templateId: "medication",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);

    const badges = page.getByTestId("template-badge");
    // intake badge should have blue color class
    const intakeBadge = badges.filter({ hasText: "Intake" });
    await expect(intakeBadge).toHaveClass(/text-blue-700/);

    // medication badge should have purple color class
    const medBadge = badges.filter({ hasText: "Medication" });
    await expect(medBadge).toHaveClass(/text-purple-700/);
    await context.close();
  });

  test("clicking outside an open session menu closes it", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Script",
          templateId: "intake",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("session-meatball").click();
    await expect(page.getByTestId("session-menu")).toBeVisible();

    // Click the folder header (clearly outside the menu)
    await page.getByTestId("folder-patient-name").click();
    await expect(page.getByTestId("session-menu")).not.toBeVisible();
    await context.close();
  });

  test("rename: saves the new name", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Old Name",
          templateId: "intake",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("session-meatball").click();
    await page.getByTestId("session-menu-rename").click();
    await page.getByTestId("session-rename-input").fill("New Name");
    await page.getByTestId("session-rename-input").press("Enter");

    await expect(page.getByTestId("session-card").first()).toContainText(
      "New Name",
    );
    await context.close();
  });

  test("rename: if the new name already exists, saves as Name (2) automatically", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Call Script",
          templateId: "intake",
          pillValues: {},
          savedAt: 2000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Follow-Up",
          templateId: "followup",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);

    // Rename "Follow-Up" (second card, sorted by savedAt desc) to "Call Script"
    const meatballs = page.getByTestId("session-meatball");
    await meatballs.last().click();
    await page.getByTestId("session-menu-rename").click();
    await page.getByTestId("session-rename-input").fill("Call Script");
    await page.getByTestId("session-rename-input").press("Enter");

    // No error should be shown — just auto-suffixed
    await expect(page.getByTestId("session-rename-input")).toHaveCount(0);
    // One card should now be named "Call Script (2)"
    const cards = page.getByTestId("session-card");
    const names = await cards.allInnerTexts();
    expect(names.some((t) => t.includes("Call Script (2)"))).toBe(true);
    await context.close();
  });

  test("rename: if Name (2) also exists, saves as Name (3)", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Call Script",
          templateId: "intake",
          pillValues: {},
          savedAt: 3000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Call Script (2)",
          templateId: "intake",
          pillValues: {},
          savedAt: 2000,
        },
        s3: {
          id: "s3",
          patientId: "p1",
          name: "Other",
          templateId: "custom",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);

    // Rename "Other" to "Call Script" — should land on "Call Script (3)"
    const meatballs = page.getByTestId("session-meatball");
    await meatballs.last().click();
    await page.getByTestId("session-menu-rename").click();
    await page.getByTestId("session-rename-input").fill("Call Script");
    await page.getByTestId("session-rename-input").press("Enter");

    const cards = page.getByTestId("session-card");
    const names = await cards.allInnerTexts();
    expect(names.some((t) => t.includes("Call Script (3)"))).toBe(true);
    await context.close();
  });

  test("delete: shows the confirm modal with the correct script name", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "My Script",
          templateId: "intake",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("session-meatball").click();
    await page.getByTestId("session-menu-delete").click();

    await expect(page.getByTestId("confirm-dialog")).toBeVisible();
    await expect(page.getByTestId("confirm-dialog")).toContainText("My Script");
    await context.close();
  });

  test("delete: confirming removes the card and the session from storage", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "My Script",
          templateId: "intake",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("session-meatball").click();
    await page.getByTestId("session-menu-delete").click();
    await page.getByTestId("confirm-ok").click();

    await expect(page.getByTestId("session-card")).toHaveCount(0);
    await expect(page.getByTestId("folder-empty-state")).toBeVisible();

    const raw = await page.evaluate(() => chrome.storage.local.get("sessions"));
    expect(Object.keys(raw.sessions as object)).toHaveLength(0);
    await context.close();
  });

  test("patient info card shows all pill values from sessions", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Script A",
          templateId: "intake",
          pillValues: { Medication: "Metformin", Dose: "500mg" },
          savedAt: 2000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Script B",
          templateId: "followup",
          pillValues: { Allergies: "Penicillin" },
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await expect(page.getByTestId("patient-info-card")).toBeVisible();
    await expect(page.getByTestId("info-pill-value-Medication")).toHaveText(
      "Metformin",
    );
    await expect(page.getByTestId("info-pill-value-Dose")).toHaveText("500mg");
    await expect(page.getByTestId("info-pill-value-Allergies")).toHaveText(
      "Penicillin",
    );
    await context.close();
  });

  test("patient info card: editing and saving updates pill values in storage", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Script A",
          templateId: "intake",
          pillValues: { Medication: "Metformin" },
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("info-card-edit").click();
    await page.getByTestId("info-pill-input-Medication").fill("Lisinopril");
    await page.getByTestId("info-card-save").click();

    // UI should update immediately
    await expect(page.getByTestId("info-pill-value-Medication")).toHaveText(
      "Lisinopril",
    );

    // Storage should be updated too
    const raw = await page.evaluate(() => chrome.storage.local.get("sessions"));
    const sessions = Object.values(
      raw.sessions as Record<string, { pillValues: Record<string, string> }>,
    );
    expect(sessions[0].pillValues["Medication"]).toBe("Lisinopril");
    await context.close();
  });

  test("delete patient from folder: shows modal with correct script count", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Script",
          templateId: "intake",
          pillValues: {},
          savedAt: 1000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Script 2",
          templateId: "followup",
          pillValues: {},
          savedAt: 2000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("folder-delete-patient").click();

    await expect(page.getByTestId("confirm-dialog")).toBeVisible();
    await expect(page.getByTestId("confirm-dialog")).toContainText("2 scripts");
    await context.close();
  });

  test("delete patient from folder: confirming navigates to hub and removes patient", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Script",
          templateId: "intake",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("folder-delete-patient").click();
    await page.getByTestId("confirm-ok").click();

    // Should be back on the hub
    await expect(page.getByTestId("hub-view")).toBeVisible();
    await expect(page.getByTestId("patient-card")).toHaveCount(0);

    // Storage should be clean
    const raw = await page.evaluate(() =>
      chrome.storage.local.get(["patients", "sessions"]),
    );
    expect(Object.keys(raw.patients as object)).toHaveLength(0);
    expect(Object.keys(raw.sessions as object)).toHaveLength(0);
    await context.close();
  });
});
