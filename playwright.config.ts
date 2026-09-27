import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /\.pwa\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3170" },
    },
    {
      // The service worker only exists in a production build.
      name: "pwa",
      testMatch: /\.pwa\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3171" },
    },
  ],
  webServer: [
    {
      command: "yarn dev",
      url: "http://localhost:3170",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "yarn vite build && yarn vite preview --port 3171 --strictPort",
      url: "http://localhost:3171",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
