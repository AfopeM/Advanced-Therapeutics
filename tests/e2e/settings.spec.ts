import { test, expect } from "@playwright/test";
import { loadExtension } from "../helpers/extension";

test.describe("Settings & User Name", () => {
  test("settings overlay is hidden by default", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    await expect(page.getByTestId("settings-overlay")).not.toBeVisible();
    await context.close();
  });

  test("clicking the burger icon opens settings", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    await page.getByTestId("burger-menu").click();
    await expect(page.getByTestId("settings-overlay")).toBeVisible();
    await context.close();
  });

  test("clicking the back arrow closes settings", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    await page.getByTestId("burger-menu").click();
    await page.getByTestId("settings-back").click();
    await expect(page.getByTestId("settings-overlay")).not.toBeVisible();
    await context.close();
  });

  test("typing a name and saving persists it to chrome storage", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    await page.getByTestId("burger-menu").click();
    await page.getByTestId("name-input").fill("Dr. Smith");
    await page.getByTestId("save-name").click();

    const stored = (await page.evaluate(async () => {
      const result = await chrome.storage.local.get("user");
      return result.user;
    })) as { name: string };

    expect(stored.name).toBe("Dr. Smith");
    await context.close();
  });

  test("after a reload, the saved name is pre-filled", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    // Save a name first
    await page.getByTestId("burger-menu").click();
    await page.getByTestId("name-input").fill("Dr. Smith");
    await page.getByTestId("save-name").click();

    // Reload and check the input is pre-filled
    await page.reload();
    await page.getByTestId("burger-menu").click();
    await expect(page.getByTestId("name-input")).toHaveValue("Dr. Smith");
    await context.close();
  });

  test("+ New Patient with no name set opens settings with guardrail", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    await page.getByTestId("new-patient-btn").click();

    await expect(page.getByTestId("settings-overlay")).toBeVisible();
    await expect(page.getByTestId("guardrail-message")).toBeVisible();
    await context.close();
  });

  test("saving a name then closing settings allows normal flow", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    // Trigger guardrail, then save a name
    await page.getByTestId("new-patient-btn").click();
    await page.getByTestId("name-input").fill("Dr. Smith");
    await page.getByTestId("save-name").click();

    // Now the hub should be visible, not settings
    await expect(page.getByTestId("settings-overlay")).not.toBeVisible();
    await expect(page.getByTestId("new-patient-btn")).toBeVisible();

    // Clicking + New Patient should no longer open settings
    await page.getByTestId("new-patient-btn").click();
    await expect(page.getByTestId("settings-overlay")).not.toBeVisible();
    await context.close();
  });
});
