import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests/e2e",
  timeout: 120_000, // Increased for complex user flows
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/report", open: "never" }],
    ["json", { outputFile: "tests/e2e/report/results.json" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000, // Timeout for each action
  },
  webServer: process.env.PLAYWRIGHT_SKIP_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: process.env.CI ? "ignore" : "inherit",
        stderr: process.env.CI ? "pipe" : "inherit",
      },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Global test settings
  fullyParallel: false, // User flows are sequential
  workers: process.env.CI ? 1 : 2,
};

export default config;
