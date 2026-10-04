import { defineConfig } from "@playwright/test";

const PORT = process.env.PORT || 4173;

export default defineConfig({
  testDir: "tests/e2e",
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure"
  },
  projects: [{
    name: "mobile",
    use: {
      browserName: "chromium",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      // Le service worker n'est autorisé que par les tests qui le visent.
      serviceWorkers: "block"
    }
  }],
  webServer: {
    command: "node tests/serveur.mjs",
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) }
  }
});
