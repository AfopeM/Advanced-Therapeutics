import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  // Never timeout a test in less than 30 seconds.
  // Extension startup adds ~3-5 seconds of overhead per test.
  timeout: 30_000,

  // Retry once locally, twice in CI. Covers the first-test cold-start race
  // that can happen when the extension service worker hasn't fully initialised
  // before the sidepanel receives its first page.goto().
  retries: process.env.CI ? 2 : 1,

  // Extensions must run with exactly 1 worker — Chrome refuses to load the
  // same persistent extension in parallel browser contexts.
  workers: 1,

  use: {
    // Extensions require headless: false (Chrome limitation).
    // In CI, xvfb-run provides a virtual display so this still works.
    headless: false,

    // Give each individual action (click, fill, waitForSelector, …) a
    // generous budget. Extension startup can make the first interaction slow.
    actionTimeout: 15_000,
  },

  // On CI: emit an HTML report so failed test screenshots can be uploaded.
  // Locally: use the default "list" reporter (readable terminal output).
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
});
