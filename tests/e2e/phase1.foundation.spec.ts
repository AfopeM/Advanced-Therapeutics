import { test, expect } from "@playwright/test";
import { loadExtension } from "../helpers/extension";

test.describe("Phase 1 — Foundation", () => {
  test("side panel loads and shows confirmation text", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    await expect(page.getByText("Phase 1 — Extension loaded ✓")).toBeVisible();

    expect(errors).toHaveLength(0);
    await context.close();
  });

  test("storage initializes with empty patients and sessions on install", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();

    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );

    const storage = await page.evaluate(async () => {
      // Poll up to 3 seconds for the service worker to finish initializing
      for (let i = 0; i < 30; i++) {
        const result = await chrome.storage.local.get(["patients", "sessions"]);
        if (result.patients !== undefined) return result;
        await new Promise((r) => setTimeout(r, 100));
      }
      return chrome.storage.local.get(["patients", "sessions"]);
    });

    expect(storage.patients).toEqual({});
    expect(storage.sessions).toEqual({});

    await context.close();
  });
});
