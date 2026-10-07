import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_PATH = path.resolve(__dirname, "../../dist");

export async function loadExtension(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      "--no-sandbox",
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  const serviceWorker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));

  const extensionId = serviceWorker.url().split("/")[2];

  // Wait until the extension has finished its first-time setup write
  await expect
    .poll(() =>
      serviceWorker.evaluate(async () => {
        const r = await chrome.storage.local.get("patients");
        return r.patients !== undefined;
      }),
    )
    .toBe(true);

  return { context, extensionId };
}

// Opens ONE test browser per file, gives each test a fresh tab,
// and wipes saved app data before every test so tests can't affect each other.
export function useSharedExtension() {
  let context: BrowserContext;
  let extensionId: string;
  let page: Page;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`,
    );
    await page.evaluate(() => chrome.storage.local.clear());
    await page.reload();
  });

  test.afterEach(async () => {
    await page.close();
  });

  return { getPage: () => page };
}
