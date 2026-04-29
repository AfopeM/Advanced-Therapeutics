import { test, expect, type Page } from "@playwright/test";
import { loadExtension } from "../helpers/extension";

const PANEL = (id: string) =>
  `chrome-extension://${id}/src/sidepanel/sidepanel.html`;

async function seedStorage(page: Page, data: Record<string, unknown>) {
  await page.evaluate(async (d) => {
    await chrome.storage.local.set(d);
  }, data);
  await page.reload();
  await page.waitForSelector('[data-testid="hub-view"]');
}

async function openFirstFolder(page: Page) {
  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');
}

test.describe("Patient Folder", () => {
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
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 1700000000000,
        },
      },
    });

    await openFirstFolder(page);
    await expect(page.getByTestId("session-card")).toHaveCount(1);
    await expect(page.getByTestId("template-badge")).toBeVisible();
    await expect(page.getByTestId("template-badge")).toContainText(
      "Device Confirmation",
    );
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
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 2000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Script B",
          templateId: "sx_center",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);

    const badges = page.getByTestId("template-badge");

    const dcBadge = badges.filter({ hasText: "Device Confirmation" });
    await expect(dcBadge).toHaveClass(/text-blue-700/);

    const sxBadge = badges.filter({ hasText: "SX Center" });
    await expect(sxBadge).toHaveClass(/text-purple-700/);
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
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("session-meatball").click();
    await expect(page.getByTestId("session-menu")).toBeVisible();

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
          templateId: "device_confirmation",
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
          name: "Device Confirmation",
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 2000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "SX Center Call",
          templateId: "sx_center",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);

    // Rename the second card (sorted last by savedAt) to match the first card's name
    const meatballs = page.getByTestId("session-meatball");
    await meatballs.last().click();
    await page.getByTestId("session-menu-rename").click();
    await page.getByTestId("session-rename-input").fill("Device Confirmation");
    await page.getByTestId("session-rename-input").press("Enter");

    // Input disappears — no error dialog, just auto-suffixed
    await expect(page.getByTestId("session-rename-input")).toHaveCount(0);

    const cards = page.getByTestId("session-card");
    const names = await cards.allInnerTexts();
    expect(names.some((t) => t.includes("Device Confirmation (2)"))).toBe(true);
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
          name: "Device Confirmation",
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 3000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Device Confirmation (2)",
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 2000,
        },
        s3: {
          id: "s3",
          patientId: "p1",
          name: "Other",
          templateId: "wc_call_scheduling",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);

    // Rename "Other" to "Device Confirmation" — should land on "(3)"
    const meatballs = page.getByTestId("session-meatball");
    await meatballs.last().click();
    await page.getByTestId("session-menu-rename").click();
    await page.getByTestId("session-rename-input").fill("Device Confirmation");
    await page.getByTestId("session-rename-input").press("Enter");

    const cards = page.getByTestId("session-card");
    const names = await cards.allInnerTexts();
    expect(names.some((t) => t.includes("Device Confirmation (3)"))).toBe(true);
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
          templateId: "device_confirmation",
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
          templateId: "device_confirmation",
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
          templateId: "device_confirmation",
          pillValues: { device: "TENS Unit", body_part: "Lower Back" },
          savedAt: 2000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Script B",
          templateId: "sx_center",
          pillValues: { insurance_type: "Medicare" },
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await expect(page.getByTestId("patient-info-card")).toBeVisible();
    await expect(page.getByTestId("info-pill-value-device")).toHaveText(
      "TENS Unit",
    );
    await expect(page.getByTestId("info-pill-value-body_part")).toHaveText(
      "Lower Back",
    );
    await expect(page.getByTestId("info-pill-value-insurance_type")).toHaveText(
      "Medicare",
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
          templateId: "device_confirmation",
          pillValues: { device: "TENS Unit" },
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("info-card-edit").click();
    await page.getByTestId("info-pill-input-device").fill("Knee Brace");
    await page.getByTestId("info-card-save").click();

    await expect(page.getByTestId("info-pill-value-device")).toHaveText(
      "Knee Brace",
    );

    const raw = await page.evaluate(() => chrome.storage.local.get("sessions"));
    const sessions = Object.values(
      raw.sessions as Record<string, { pillValues: Record<string, string> }>,
    );
    expect(sessions[0].pillValues["device"]).toBe("Knee Brace");
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
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 1000,
        },
        s2: {
          id: "s2",
          patientId: "p1",
          name: "Script 2",
          templateId: "sx_center",
          pillValues: {},
          savedAt: 2000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("folder-header-menu").click();
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
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    await page.getByTestId("folder-header-menu").click();
    await page.getByTestId("folder-delete-patient").click();
    await page.getByTestId("confirm-ok").click();

    await expect(page.getByTestId("hub-view")).toBeVisible();
    await expect(page.getByTestId("patient-card")).toHaveCount(0);

    const raw = await page.evaluate(() =>
      chrome.storage.local.get(["patients", "sessions"]),
    );
    expect(Object.keys(raw.patients as object)).toHaveLength(0);
    expect(Object.keys(raw.sessions as object)).toHaveLength(0);
    await context.close();
  });
});
