import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global setup for Playwright tests
 * Supports E2E_BYPASS_AUTH for testing without real backend
 */

async function globalSetup(config: FullConfig) {
    const baseURL = (config as any)?.use?.baseURL || 'http://localhost:3001';
    const authFile = path.join(__dirname, '../../.auth/user.json');

    // Create .auth directory if it doesn't exist
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Check if E2E bypass is enabled (controlled by Playwright config)
    const bypassAuth = process.env.VITE_E2E_BYPASS_AUTH === 'true' || process.env.E2E_BYPASS_AUTH === 'true';

    if (bypassAuth) {
        console.log('🔓 E2E Auth Bypass enabled - using mocked DT user');

        // Create mock authenticated state
        const mockAuthState = {
            cookies: [],
            origins: [
                {
                    origin: baseURL,
                    localStorage: [
                        {
                            name: 'auth-storage',
                            value: JSON.stringify({
                                state: {
                                    user: {
                                        id: 'mock-user-e2e',
                                        email: 'dt@e2e.test',
                                        user_metadata: {}
                                    },
                                    profile: {
                                        id: 'mock-profile-e2e',
                                        user_id: 'mock-user-e2e',
                                        club_id: 'mock-club-e2e',
                                        role: 'DT',
                                        first_name: 'E2E',
                                        last_name: 'Test'
                                    }
                                },
                                version: 0
                            })
                        }
                    ]
                }
            ]
        };

        fs.writeFileSync(authFile, JSON.stringify(mockAuthState, null, 2));
        console.log('✅ Mock auth state created at:', authFile);
        return;
    }

    // Real authentication flow (when bypass is disabled)
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('🔐 Performing real authentication...');

        await page.goto(`${baseURL}/login`);
        await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL || 'test@example.com');
        await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD || 'Test123!');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/(home|matches)/);

        await page.context().storageState({ path: authFile });

        console.log('✅ Real authentication successful, state saved');
    } catch (error) {
        console.error('❌ Global setup failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

export default globalSetup;
