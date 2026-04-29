import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  // Never timeout a test in less than 30 seconds.
  // Extension startup adds ~3-5 seconds of overhead per test.
  timeout: 30_000,

  use: {
    // Extensions require headless: false (Chrome limitation).
    // In CI, xvfb-run provides a virtual display so this still works.
    headless: false,
  },

  // On CI: emit an HTML report so failed test screenshots can be uploaded.
  // Locally: use the default "list" reporter (readable terminal output).
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
});
