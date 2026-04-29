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

// Opens a fresh workspace for patient p1 (no existing sessions).
async function openFreshWorkspace(page: Page) {
  await page.getByTestId("patient-card").first().click();
  await page.waitForSelector('[data-testid="folder-view"]');
  await page.getByTestId("new-script-btn").click();
  await page.waitForSelector('[data-testid="workspace-view"]');
}

// ═══════════════════════════════════════════════════════════════════════════
// SUITE
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Canvas — Token Chip Rendering", () => {
  // -------------------------------------------------------------------------
  // The canvas must render token chips for every key defined in the active
  // template. Device Confirmation has [device], [body_part], etc.
  // We check a representative subset to confirm the build pipeline works.
  // -------------------------------------------------------------------------
  test("renders token chips for template keys", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFreshWorkspace(page);

    // Device Confirmation template should have these tokens in the script
    for (const key of ["device", "body_part", "doctors_name"]) {
      await expect(
        page.locator(`[data-testid="canvas"] [data-token="${key}"]`).first(),
      ).toBeVisible();
    }
    await context.close();
  });

  // -------------------------------------------------------------------------
  // An empty token chip (no value in the pill input) should display the
  // human-readable label. This confirms the pillLabels map is being passed
  // correctly from Workspace → Canvas.
  // -------------------------------------------------------------------------
  test("empty token chip shows the human label, not the raw key", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFreshWorkspace(page);

    // [device] pill starts empty → chip text should be "Device" (the label)
    const chip = page
      .locator('[data-testid="canvas"] [data-token="device"]')
      .first();
    await expect(chip).toHaveText("Device");
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Once the user fills in a pill, the matching token chip should update
  // to show the value instead of the label.
  // This tests the surgical DOM update path in Canvas.tsx (not a full re-render).
  // -------------------------------------------------------------------------
  test("filled token chip shows the entered value", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFreshWorkspace(page);
    await page.getByTestId("pill-input-device").fill("TENS Unit");

    const chip = page
      .locator('[data-testid="canvas"] [data-token="device"]')
      .first();
    await expect(chip).toHaveText("TENS Unit");
    await context.close();
  });

  // -------------------------------------------------------------------------
  // The [User] token is a special built-in. It should show the user's name
  // from the user store — not a pill input the doctor fills in manually.
  // -------------------------------------------------------------------------
  test("[User] token chip shows the doctor's name from the user store", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFreshWorkspace(page);

    // Every [User] span in the canvas should read "Dr. Smith"
    const userChips = page.locator(
      '[data-testid="canvas"] [data-token="User"]',
    );
    const count = await userChips.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(userChips.nth(i)).toHaveText("Dr. Smith");
    }
    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Canvas — Token Chip Styles", () => {
  // -------------------------------------------------------------------------
  // Empty chip = blue dashed border (color #3b82f6 in the inline style).
  // This is a UX signal that the field hasn't been filled in yet.
  // -------------------------------------------------------------------------
  test("empty token chip has blue dashed-border style", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFreshWorkspace(page);

    const chip = page
      .locator('[data-testid="canvas"] [data-token="device"]')
      .first();

    // The inline style contains the blue colour hex used in EMPTY_CHIP
    const style = await chip.getAttribute("style");
    expect(style).toContain("3b82f6"); // blue border colour from EMPTY_CHIP
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Filled chip = green dashed border (color #16a34a in the inline style).
  // This is a UX signal that the field has been completed.
  // -------------------------------------------------------------------------
  test("filled token chip switches to green style", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFreshWorkspace(page);
    await page.getByTestId("pill-input-device").fill("TENS Unit");

    const chip = page
      .locator('[data-testid="canvas"] [data-token="device"]')
      .first();

    const style = await chip.getAttribute("style");
    expect(style).toContain("16a34a"); // green border colour from FILLED_CHIP
    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Canvas — Keyboard Guard (token protection)", () => {
  // -------------------------------------------------------------------------
  // Why this matters: Canvas.tsx has a custom onKeyDown handler that
  // intercepts Backspace/Delete when the cursor is adjacent to a token chip
  // to prevent accidental deletion. We simulate clicking right after a chip
  // and pressing Backspace to confirm the chip survives.
  //
  // How the test works:
  //  1. Fill a pill so the chip is easy to find and interact with
  //  2. Click on the canvas to focus it
  //  3. Use JS to place the cursor right AFTER the token span
  //  4. Press Backspace
  //  5. Confirm the chip still exists
  // -------------------------------------------------------------------------
  test("Backspace adjacent to a token chip does not delete it", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFreshWorkspace(page);
    await page.getByTestId("pill-input-device").fill("TENS Unit");

    // Focus the canvas and place caret immediately AFTER the [device] chip.
    // We use JS to set the selection because Playwright doesn't natively
    // support placing a caret next to a non-text node.
    await page.locator('[data-testid="canvas"]').click();
    await page.evaluate(() => {
      const canvas = document.querySelector(
        '[data-testid="canvas"]',
      ) as HTMLElement;
      const chip = canvas.querySelector(
        '[data-token="device"]',
      ) as HTMLElement;
      if (!chip) return;

      const range = document.createRange();
      const sel = window.getSelection();
      // Place the caret in the parent node, right after the chip element
      const parent = chip.parentNode!;
      const chipIndex = Array.from(parent.childNodes).indexOf(chip);
      range.setStart(parent, chipIndex + 1);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    });

    await page.keyboard.press("Backspace");

    // The chip must still be in the DOM
    await expect(
      page
        .locator('[data-testid="canvas"] [data-token="device"]')
        .first(),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-testid="canvas"] [data-token="device"]')
        .first(),
    ).toHaveText("TENS Unit");
    await context.close();
  });

  // -------------------------------------------------------------------------
  // Selecting text that INCLUDES a token chip and pressing Delete should NOT
  // remove the chip. Canvas.tsx prevents this for selections containing chips.
  // -------------------------------------------------------------------------
  test("selecting a range containing a token chip and pressing Delete is blocked", async () => {
    const { context, extensionId } = await loadExtension();
    const page = await context.newPage();
    await page.goto(PANEL(extensionId));
    await seedStorage(page, {
      user: { name: "Dr. Smith" },
      patients: { p1: { id: "p1", name: "Alice", createdAt: 1000 } },
      sessions: {},
    });

    await openFreshWorkspace(page);
    await page.getByTestId("pill-input-device").fill("TENS Unit");

    // Select all content in the first line that contains the [device] chip
    await page.evaluate(() => {
      const canvas = document.querySelector(
        '[data-testid="canvas"]',
      ) as HTMLElement;
      const firstLine = canvas.querySelector(".sl") as HTMLElement;
      if (!firstLine) return;
      const range = document.createRange();
      range.selectNodeContents(firstLine);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });

    await page.keyboard.press("Delete");

    // At least one [device] chip should still exist somewhere in the canvas
    await expect(
      page.locator('[data-testid="canvas"] [data-token="device"]').first(),
    ).toBeVisible();
    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Canvas — Restoring a saved session", () => {
  // -------------------------------------------------------------------------
  // When opening an existing session that has pill values saved, those values
  // should be restored into both the pill inputs AND the canvas token chips.
  // -------------------------------------------------------------------------
  test("reopening a saved session restores pill values into canvas chips", async () => {
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
        },
      },
    });

    // Open the existing session (not "+ New Script")
    await page.getByTestId("patient-card").first().click();
    await page.waitForSelector('[data-testid="folder-view"]');
    await page.getByTestId("session-card").first().click();
    await page.waitForSelector('[data-testid="workspace-view"]');

    // The pill input should be pre-populated
    await expect(page.getByTestId("pill-input-device")).toHaveValue(
      "Knee Brace",
    );

    // The canvas chip should show the saved value in green (filled) state
    const chip = page
      .locator('[data-testid="canvas"] [data-token="device"]')
      .first();
    await expect(chip).toHaveText("Knee Brace");

    const style = await chip.getAttribute("style");
    expect(style).toContain("16a34a"); // green = filled
    await context.close();
  });
});
