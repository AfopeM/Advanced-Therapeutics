import { test, expect, type Page } from "@playwright/test";
import { loadExtension } from "../helpers/extension";

// ─── URL helper ────────────────────────────────────────────────────────────
const PANEL = (id: string) =>
  `chrome-extension://${id}/src/sidepanel/sidepanel.html`;

// ─── Storage seed + reload ──────────────────────────────────────────────────
// Seeds chrome.storage.local then reloads the page so React picks up the data.
async function seedStorage(page: Page, data: Record<string, unknown>) {
  await page.evaluate(async (d) => {
    await chrome.storage.local.set(d);
  }, data);
  await page.reload();
  await page.waitForSelector('[data-testid="hub-view"]');
}

// ─── Navigation helpers ─────────────────────────────────────────────────────
// Opens the folder for the first patient card in the list.
async function openFirstFolder(page: Page) {
  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');
}

// Opens the workspace for a new (unsaved) session from within a folder.
async function openNewWorkspace(page: Page) {
  await page.getByTestId("new-script-btn").click();
  await page.waitForSelector('[data-testid="workspace-view"]');
}

// ─── Shared seed state used by many tests ──────────────────────────────────
// One patient "Alice Watts", no sessions yet.
const BASE_STATE = {
  user: { name: "Dr. Smith" },
  patients: { p1: { id: "p1", name: "Alice Watts", createdAt: 1000 } },
  sessions: {},
};

// ═══════════════════════════════════════════════════════════════════════════
// SUITE
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Workspace — Navigation", () => {
  // -------------------------------------------------------------------------
  // Clicking "+ New Script" in the folder should open the workspace view.
  // This verifies the App-level routing in App.tsx works correctly.
  // -------------------------------------------------------------------------
  test("opens workspace view when '+ New Script' is clicked", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    await expect(page.getByTestId("workspace-view")).toBeVisible();
    await context.close();
  });

  // -------------------------------------------------------------------------
  // The workspace header should display the patient's name so the user
  // always knows whose record they're editing.
  // -------------------------------------------------------------------------
  test("workspace header shows the correct patient name", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    await expect(page.getByTestId("workspace-patient-name")).toHaveText(
      "Alice Watts",
    );
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Clicking the back arrow should auto-save and return to the folder view.
  // The folder-view testid must be visible after navigating back.
  // -------------------------------------------------------------------------
  test("back arrow returns to folder view", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);
    await page.getByTestId("workspace-back").click();

    await expect(page.getByTestId("folder-view")).toBeVisible();
    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Workspace — Template Selector", () => {
  // -------------------------------------------------------------------------
  // For a BRAND NEW session (never saved), the template <select> must be
  // enabled. Users should be able to choose which script type they need.
  // -------------------------------------------------------------------------
  test("template selector is enabled for a new unsaved session", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    await expect(page.getByTestId("template-select")).toBeEnabled();
    await context.close();
  });

  // -------------------------------------------------------------------------
  // For an EXISTING saved session, the template must be locked (disabled).
  // Changing template on a saved session would wipe the user's script text.
  // -------------------------------------------------------------------------
  test("template selector is disabled for an existing saved session", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      ...BASE_STATE,
      sessions: {
        s1: {
          id: "s1",
          patientId: "p1",
          name: "Existing Script",
          templateId: "device_confirmation",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await openFirstFolder(page);
    // Click the existing session card to open it (not "+ New Script")
    await page.getByTestId("session-card").first().click();
    await page.waitForSelector('[data-testid="workspace-view"]');

    await expect(page.getByTestId("template-select")).toBeDisabled();
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Switching the template on a new session should reset the canvas script
  // content. We verify this by checking that the canvas contains tokens from
  // the newly selected template (e.g. [sx_date] appears in SX Center but not
  // in Device Confirmation).
  // -------------------------------------------------------------------------
  test("switching template changes the canvas content", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    // Switch to SX Center template
    await page.getByTestId("template-select").selectOption("sx_center");

    // The canvas should now contain a token chip for [sx_date] which is
    // unique to the SX Center template (not in Device Confirmation).
    await expect(
      page.locator('[data-testid="canvas"] [data-token="sx_date"]'),
    ).toBeVisible();
    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Workspace — Pill Values", () => {
  // -------------------------------------------------------------------------
  // When a new workspace opens for an existing patient, the patient_name pill
  // should be pre-filled with the patient's name. This comes from
  // patient.sharedPillValues seeded in usePatientStore.addPatient().
  // -------------------------------------------------------------------------
  test("patient name pill is pre-filled from patient record", async () => {
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

    await openFirstFolder(page);
    await openNewWorkspace(page);

    await expect(page.getByTestId("pill-input-patient_name")).toHaveValue(
      "Alice Watts",
    );
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Typing a value into a pill input should update the token chip inside the
  // canvas in real time. This is the core UX of the workspace.
  // -------------------------------------------------------------------------
  test("typing a pill value updates the token chip in the canvas", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    // Clear the device pill input and type a new value
    await page.getByTestId("pill-input-device").fill("TENS Unit");

    // The canvas token chip for [device] should now show "TENS Unit"
    const tokenChip = page.locator(
      '[data-testid="canvas"] [data-token="device"]',
    );
    await expect(tokenChip).toHaveText("TENS Unit");
    await context.close();
  });

  // -------------------------------------------------------------------------
  // An empty token chip should show the human-readable label (not the raw key).
  // E.g. [body_part] empty → shows "Body Part", not "body_part".
  // -------------------------------------------------------------------------
  test("empty token chip displays the pill label, not the raw key", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    // body_part is empty by default — chip text should be "Body Part"
    const tokenChip = page.locator(
      '[data-testid="canvas"] [data-token="body_part"]',
    );
    await expect(tokenChip).toHaveText("Body Part");
    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Workspace — Saving", () => {
  // -------------------------------------------------------------------------
  // Clicking Save on a new session should create a new session entry in
  // chrome.storage.local and associate it with the correct patient.
  // -------------------------------------------------------------------------
  test("save button persists a new session to storage", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);
    await page.getByTestId("save-session-btn").click();

    // Allow the async storage write to complete
    await page.waitForTimeout(300);

    const raw = await page.evaluate(() => chrome.storage.local.get("sessions"));
    const sessions = Object.values(
      raw.sessions as Record<string, { patientId: string }>,
    );
    expect(sessions.length).toBe(1);
    expect(sessions[0].patientId).toBe("p1");
    await context.close();
  });

  // -------------------------------------------------------------------------
  // After saving once, clicking back should NOT create a duplicate session.
  // The back handler calls saveSession() which does an update (not add) when
  // isSaved=true.
  // -------------------------------------------------------------------------
  test("back button after save does not create duplicate sessions", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    // Save first, then navigate back
    await page.getByTestId("save-session-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("workspace-back").click();
    await page.waitForSelector('[data-testid="folder-view"]');
    await page.waitForTimeout(300);

    const raw = await page.evaluate(() => chrome.storage.local.get("sessions"));
    const sessions = Object.keys(raw.sessions as object);
    // Must be exactly 1, not 2
    expect(sessions.length).toBe(1);
    await context.close();
  });

  // -------------------------------------------------------------------------
  // The session name should be auto-generated from the template name.
  // First save for "Device Confirmation" template → session named
  // "Device Confirmation".
  // -------------------------------------------------------------------------
  test("first save names the session after the template", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);
    await page.getByTestId("save-session-btn").click();
    await page.waitForTimeout(300);

    const raw = await page.evaluate(() => chrome.storage.local.get("sessions"));
    const sessions = Object.values(
      raw.sessions as Record<string, { name: string }>,
    );
    expect(sessions[0].name).toBe("Device Confirmation");
    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Workspace — Custom Pills", () => {
  // -------------------------------------------------------------------------
  // Clicking "+ Add field", entering a label, and submitting should add a new
  // pill input row AND insert a token into the canvas.
  // -------------------------------------------------------------------------
  test("adding a custom pill inserts its token into the canvas", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    await page.getByTestId("add-pill-btn").click();
    await page.getByTestId("new-pill-label-input").fill("Referral Date");
    await page.getByTestId("new-pill-label-input").press("Enter");

    // The key is derived: "Referral Date" → "referral_date"
    await expect(
      page.locator('[data-testid="canvas"] [data-token="referral_date"]'),
    ).toBeVisible();
    await context.close();
  });

  // -------------------------------------------------------------------------
  // The × delete button on a custom pill should remove both the pill row AND
  // all of its token spans from the canvas.
  // -------------------------------------------------------------------------
  test("deleting a custom pill removes its token from the canvas", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, BASE_STATE);

    await openFirstFolder(page);
    await openNewWorkspace(page);

    // Add the pill first
    await page.getByTestId("add-pill-btn").click();
    await page.getByTestId("new-pill-label-input").fill("Referral Date");
    await page.getByTestId("new-pill-label-input").press("Enter");

    // Confirm the token is present before deleting
    await expect(
      page.locator('[data-testid="canvas"] [data-token="referral_date"]'),
    ).toBeVisible();

    // Delete the custom pill via its × button
    await page.getByTestId("delete-pill-referral_date").click();

    // Token should be gone from the canvas
    await expect(
      page.locator('[data-testid="canvas"] [data-token="referral_date"]'),
    ).toHaveCount(0);
    await context.close();
  });
});
