import { test, expect, type Page } from "@playwright/test";
import { loadExtension } from "../helpers/extension";

const PANEL = (id: string) =>
  `chrome-extension://${id}/src/sidepanel/sidepanel.html`;

// Seeds user name into storage then reloads so React picks it up
async function seedUser(page: Page, name = "Dr. Smith") {
  await page.evaluate(async (n) => {
    await chrome.storage.local.set({ user: { name: n } });
  }, name);
  await page.reload();
  await page.waitForSelector('[data-testid="hub-view"]');
}

// Seeds arbitrary storage state then reloads
async function seedStorage(page: Page, data: Record<string, unknown>) {
  await page.evaluate(async (d) => {
    await chrome.storage.local.set(d);
  }, data);
  await page.reload();
  await page.waitForSelector('[data-testid="hub-view"]');
}

// Clicks + New Patient and submits a name
async function addPatient(page: Page, name: string) {
  await page.getByTestId("new-patient-btn").click();
  await page.getByTestId("new-patient-input").fill(name);
  await page.getByTestId("new-patient-submit").click();
}

test.describe("Hub View", () => {
  test("hub shows empty state when no patients exist", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);

    await expect(page.getByTestId("hub-empty-state")).toBeVisible();
    await context.close();
  });

  test("clicking + New Patient with no user name set opens Settings", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));

    await page.getByTestId("new-patient-btn").click();
    await expect(page.getByTestId("settings-overlay")).toBeVisible();
    await context.close();
  });

  test("after setting a name, + New Patient shows the inline form", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);

    await page.getByTestId("new-patient-btn").click();
    await expect(page.getByTestId("new-patient-form")).toBeVisible();
    await context.close();
  });

  test("submitting an empty name does nothing", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);

    await page.getByTestId("new-patient-btn").click();
    // Don't fill anything — just click submit
    await page.getByTestId("new-patient-submit").click();
    await expect(page.getByTestId("patient-card")).toHaveCount(0);
    await context.close();
  });

  test("submitting a valid name creates a patient card", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);

    await addPatient(page, "John Doe");
    await expect(page.getByTestId("patient-card")).toHaveCount(1);
    await expect(page.getByTestId("patient-name").first()).toHaveText(
      "John Doe",
    );
    await context.close();
  });

  test("creating a duplicate name shows an error and does not create a second card", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);

    await addPatient(page, "John Doe");
    // Try to add the same name again
    await page.getByTestId("new-patient-btn").click();
    await page.getByTestId("new-patient-input").fill("John Doe");
    await page.getByTestId("new-patient-submit").click();

    await expect(page.getByTestId("new-patient-error")).toBeVisible();
    await expect(page.getByTestId("patient-card")).toHaveCount(1);
    await context.close();
  });

  test("patient cards are sorted by most recent by default", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: {
        p1: { id: "p1", name: "Alice", createdAt: 1000 },
        p2: { id: "p2", name: "Bob", createdAt: 2000 }, // more recent
      },
      sessions: {},
    });

    const names = page.getByTestId("patient-name");
    await expect(names.first()).toHaveText("Bob");
    await expect(names.last()).toHaveText("Alice");
    await context.close();
  });

  test("switching sort to A–Z reorders correctly", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: {
        p1: { id: "p1", name: "Charlie", createdAt: 3000 },
        p2: { id: "p2", name: "Alice", createdAt: 2000 },
        p3: { id: "p3", name: "Bob", createdAt: 1000 },
      },
      sessions: {},
    });

    await page.getByTestId("sort-select").selectOption("az");

    const names = page.getByTestId("patient-name");
    await expect(names.nth(0)).toHaveText("Alice");
    await expect(names.nth(1)).toHaveText("Bob");
    await expect(names.nth(2)).toHaveText("Charlie");
    await context.close();
  });

  test("typing in search filters the list in real time", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: {
        p1: { id: "p1", name: "Alice Smith", createdAt: 2000 },
        p2: { id: "p2", name: "Bob Jones", createdAt: 1000 },
      },
      sessions: {},
    });

    await page.getByTestId("search-input").fill("alice");
    await expect(page.getByTestId("patient-card")).toHaveCount(1);
    await expect(page.getByTestId("patient-name").first()).toHaveText(
      "Alice Smith",
    );
    await context.close();
  });

  test("searching for something with no match shows the empty state message", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await page.getByTestId("search-input").fill("zzznomatch");
    await expect(page.getByTestId("hub-empty-state")).toBeVisible();
    await context.close();
  });

  test("clicking outside an open meatball menu closes it", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);
    await addPatient(page, "Alice");

    await page.getByTestId("patient-meatball").click();
    await expect(page.getByTestId("patient-menu")).toBeVisible();

    await page.locator("h1").click(); // click the header — clearly outside
    await expect(page.getByTestId("patient-menu")).not.toBeVisible();
    await context.close();
  });

  test("opening a second meatball menu closes the first", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: {
        p1: { id: "p1", name: "Alice", createdAt: 2000 },
        p2: { id: "p2", name: "Bob", createdAt: 1000 },
      },
      sessions: {},
    });

    const meatballs = page.getByTestId("patient-meatball");
    await meatballs.first().click();
    await expect(page.getByTestId("patient-menu")).toHaveCount(1);

    await meatballs.last().click();
    // Still exactly one menu open — the second one, not both
    await expect(page.getByTestId("patient-menu")).toHaveCount(1);
    await context.close();
  });

  test("rename: changes the patient name in the card and in storage", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);
    await addPatient(page, "Alice");

    await page.getByTestId("patient-meatball").click();
    await page.getByTestId("patient-menu-rename").click();
    await page.getByTestId("patient-rename-input").fill("Alice Updated");
    await page.getByTestId("patient-rename-input").press("Enter");

    await expect(page.getByTestId("patient-name").first()).toHaveText(
      "Alice Updated",
    );

    const raw = await page.evaluate(() => chrome.storage.local.get("patients"));
    const names = Object.values(
      raw.patients as Record<string, { name: string }>,
    ).map((p) => p.name);
    expect(names).toContain("Alice Updated");
    await context.close();
  });

  test("rename to an existing name shows an error and does not save", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: {
        p1: { id: "p1", name: "Alice", createdAt: 2000 },
        p2: { id: "p2", name: "Bob", createdAt: 1000 },
      },
      sessions: {},
    });

    await page.getByTestId("patient-meatball").first().click();
    await page.getByTestId("patient-menu-rename").click();
    await page.getByTestId("patient-rename-input").fill("Bob");
    await page.getByTestId("patient-rename-input").press("Enter");

    await expect(page.getByTestId("patient-rename-error")).toBeVisible();
    // patient-name is in the DOM (just hidden) — text should still be Alice
    await expect(page.getByTestId("patient-name").first()).toHaveText("Alice");
    await context.close();
  });

  test("delete: shows the confirm modal with the correct script count", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);
    await addPatient(page, "Alice");

    await page.getByTestId("patient-meatball").click();
    await page.getByTestId("patient-menu-delete").click();

    await expect(page.getByTestId("confirm-dialog")).toBeVisible();
    await expect(page.getByTestId("confirm-dialog")).toContainText("0 scripts");
    await context.close();
  });

  test("delete: cancelling the modal leaves the patient intact", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedUser(page);
    await addPatient(page, "Alice");

    await page.getByTestId("patient-meatball").click();
    await page.getByTestId("patient-menu-delete").click();
    await page.getByTestId("confirm-cancel").click();

    await expect(page.getByTestId("confirm-dialog")).not.toBeVisible();
    await expect(page.getByTestId("patient-card")).toHaveCount(1);
    await context.close();
  });

  test("delete: confirming removes the patient card and associated sessions from storage", async () => {
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
          templateId: "t1",
          pillValues: {},
          savedAt: 1000,
        },
      },
    });

    await page.getByTestId("patient-meatball").click();
    await page.getByTestId("patient-menu-delete").click();
    await page.getByTestId("confirm-ok").click();

    await expect(page.getByTestId("patient-card")).toHaveCount(0);

    const raw = await page.evaluate(() =>
      chrome.storage.local.get(["patients", "sessions"]),
    );
    expect(Object.keys(raw.patients as object)).toHaveLength(0);
    expect(Object.keys(raw.sessions as object)).toHaveLength(0);
    await context.close();
  });
});
