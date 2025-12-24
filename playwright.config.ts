import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 * Uses auth bypass for tests without real backend
 */

// Enable E2E auth bypass (no real login required)
process.env.VITE_E2E_BYPASS_AUTH = 'true'

export default defineConfig({
    testDir: './tests/e2e/specs',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    globalSetup: './tests/e2e/global-setup.ts',
    use: {
        baseURL: 'http://localhost:3001',
        storageState: '.auth/user.json',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
