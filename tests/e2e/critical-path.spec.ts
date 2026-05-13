import { test, expect, type Page } from "@playwright/test";
import { loadExtension } from "../helpers/extension";

const PANEL = (id: string) =>
  `chrome-extension://${id}/src/sidepanel/sidepanel.html`;

// Seeds chrome.storage.local then reloads so React picks up the state.
async function seedStorage(page: Page, data: Record<string, unknown>) {
  await page.evaluate(async (d) => {
    await chrome.storage.local.set(d);
  }, data);
  await page.reload();
  await page.waitForSelector('[data-testid="hub-view"]');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SETTINGS — can set user name
// ─────────────────────────────────────────────────────────────────────────────
test("settings: can open, save a name, and close", async () => {
  const { context, extensionId } = await loadExtension();
  const page = await context.newPage();
  await page.goto(PANEL(extensionId));
  await seedStorage(page, { patients: {}, sessions: {} }); // ensures clean load

  await expect(page.getByTestId("settings-overlay")).not.toBeVisible();

  await page.getByTestId("burger-menu").click();
  await expect(page.getByTestId("settings-overlay")).toBeVisible();

  await page.getByTestId("name-input").fill("Dr. Smith");
  await page.getByTestId("save-name").click();

  await expect(page.getByTestId("settings-overlay")).not.toBeVisible();

  const stored = await page.evaluate(async () => {
    const r = await chrome.storage.local.get("user");
    return (r as { user: { name: string } }).user.name;
  });
  expect(stored).toBe("Dr. Smith");

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. HUB — guardrail: no name → settings opens; then patient creation works
// ─────────────────────────────────────────────────────────────────────────────
test("hub: creating a patient requires a name; succeeds once name is set", async () => {
  const { context, extensionId } = await loadExtension();
  const page = await context.newPage();
  await page.goto(PANEL(extensionId));
  await page.waitForSelector('[data-testid="hub-view"]');

  // No name → clicking New Patient should open settings with guardrail
  await page.getByTestId("new-patient-btn").click();
  await expect(page.getByTestId("settings-overlay")).toBeVisible();
  await expect(page.getByTestId("guardrail-message")).toBeVisible();

  // Set the name
  await page.getByTestId("name-input").fill("Dr. Smith");
  await page.getByTestId("save-name").click();
  await expect(page.getByTestId("settings-overlay")).not.toBeVisible();

  // Now creating a patient works
  await page.getByTestId("new-patient-btn").click();
  await page.getByTestId("new-patient-input").fill("Alice Watts");
  await page.getByTestId("new-patient-submit").click();

  await expect(page.getByTestId("patient-card")).toHaveCount(1);
  await expect(page.getByTestId("patient-name").first()).toHaveText(
    "Alice Watts",
  );

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. HUB — duplicate patient name shows error
// ─────────────────────────────────────────────────────────────────────────────
test("hub: duplicate patient name shows an error", async () => {
  const { context, extensionId } = await loadExtension();
  const page = await context.newPage();
  await page.goto(PANEL(extensionId));
  await seedStorage(page, {
    user: { name: "Dr. Smith" },
    patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
    sessions: {},
  });

  await page.getByTestId("new-patient-btn").click();
  await page.getByTestId("new-patient-input").fill("Alice");
  await page.getByTestId("new-patient-submit").click();

  await expect(page.getByTestId("new-patient-error")).toBeVisible();
  await expect(page.getByTestId("patient-card")).toHaveCount(1);

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FOLDER — navigates in and back correctly
// ─────────────────────────────────────────────────────────────────────────────
test("folder: opens from hub and back arrow returns to hub", async () => {
  const { context, extensionId } = await loadExtension();
  const page = await context.newPage();
  await page.goto(PANEL(extensionId));
  await seedStorage(page, {
    user: { name: "Dr. Smith" },
    patients: { p1: { id: "p1", name: "Alice Watts", createdAt: 1000 } },
    sessions: {},
  });

  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');

  await expect(page.getByTestId("folder-patient-name")).toHaveText(
    "Alice Watts",
  );
  await expect(page.getByTestId("folder-empty-state")).toBeVisible();

  await page.getByTestId("folder-back").click();
  await expect(page.getByTestId("hub-view")).toBeVisible();

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. WORKSPACE — opens, pills pre-filled, token chip updates in real time
// ─────────────────────────────────────────────────────────────────────────────
test("workspace: opens with pre-filled name; typing a pill updates the canvas chip", async () => {
  const { context, extensionId } = await loadExtension();
  const page = await context.newPage();
  await page.goto(PANEL(extensionId));
  await seedStorage(page, {
    user: { name: "Dr. Smith" },
    patients: {
      p1: {
        id: "p1",
        name: "Alice Watts",
        createdAt: 1000,
        sharedPillValues: {
          patient_name: "Alice Watts",
          patient_first_name: "Alice",
        },
      },
    },
    sessions: {},
  });

  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');
  await page.getByTestId("new-script-btn").click();
  await page.waitForSelector('[data-testid="workspace-view"]');

  await expect(page.getByTestId("pill-input-patient_name")).toHaveValue(
    "Alice Watts",
  );

  // BUG FIX: .first() — body_part token appears more than once in the script
  await expect(
    page.locator('[data-testid="canvas"] [data-token="body_part"]').first(),
  ).toHaveText("Body Part");

  await page.getByTestId("pill-input-device").fill("TENS Unit");
  await expect(
    page.locator('[data-testid="canvas"] [data-token="device"]').first(),
  ).toHaveText("TENS Unit");

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. WORKSPACE — save persists session; back does not create duplicate
// ─────────────────────────────────────────────────────────────────────────────
test("workspace: saving once creates exactly one session; back does not duplicate", async () => {
  const { context, extensionId } = await loadExtension();
  const page = await context.newPage();
  await page.goto(PANEL(extensionId));
  await seedStorage(page, {
    user: { name: "Dr. Smith" },
    patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
    sessions: {},
  });

  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');
  await page.getByTestId("new-script-btn").click();
  await page.waitForSelector('[data-testid="workspace-view"]');

  await page.getByTestId("save-session-btn").click();
  await page.waitForTimeout(300);

  // Navigate back (triggers another save internally)
  await page.getByTestId("workspace-back").click();
  await page.waitForSelector('[data-testid="folder-view"]');
  await page.waitForTimeout(300);

  const raw = await page.evaluate(() => chrome.storage.local.get("sessions"));
  const sessions = Object.values(
    raw.sessions as Record<string, { patientId: string; name: string }>,
  );
  expect(sessions).toHaveLength(1);
  expect(sessions[0].patientId).toBe("p1");
  // The workspace names new sessions after the active template, not the patient.
  expect(sessions[0].name).toBe("Alice Call Script");

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. WORKSPACE — reopening a saved session restores values
// ─────────────────────────────────────────────────────────────────────────────
test("workspace: reopening a saved session restores pill values and canvas chips", async () => {
  const { context, extensionId } = await loadExtension();
  const page = await context.newPage();
  await page.goto(PANEL(extensionId));
  await seedStorage(page, {
    user: { name: "Dr. Smith" },
    patients: {
      p1: {
        id: "p1",
        name: "Alice",
        createdAt: 1000,
        sharedPillValues: { device: "Knee Brace" },
      },
    },
    sessions: {
      s1: {
        id: "s1",
        patientId: "p1",
        name: "Script",
        templateId: "device_confirmation",
        pillValues: { device: "Knee Brace" },
        savedAt: 1000,
        createdAt: 1000, // required by SessionSchema
      },
    },
  });

  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');
  await page.getByTestId("session-card").first().click();
  await page.waitForSelector('[data-testid="workspace-view"]');

  await expect(page.getByTestId("pill-input-device")).toHaveValue("Knee Brace");

  const chip = page
    .locator('[data-testid="canvas"] [data-token="device"]')
    .first();
  await expect(chip).toHaveText("Knee Brace");

  // BUG FIX: Chrome normalises hex to rgb() in inline styles
  const style = await chip.getAttribute("style");
  expect(style).toContain("rgb(22, 163, 74)"); // = #16a34a (filled/green chip)

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. FOLDER — delete patient cleans up sessions
// ─────────────────────────────────────────────────────────────────────────────
test("folder: deleting a patient removes it and all sessions from storage", async () => {
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
        createdAt: 1000, // required by SessionSchema
      },
    },
  });

  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');

  // Open the header menu (⋮ button in the folder header)
  await page.getByTestId("folder-header-menu").click();
  await page.getByTestId("folder-delete-patient").click();

  await expect(page.getByTestId("confirm-dialog")).toBeVisible();
  await expect(page.getByTestId("confirm-dialog")).toContainText("1 script");

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
