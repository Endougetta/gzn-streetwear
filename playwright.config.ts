import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:8788', launchOptions: { executablePath: process.env.GZN_CHROMIUM } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/test-server.mjs',
    url: 'http://localhost:8788',
    timeout: 45000,
  },
})
