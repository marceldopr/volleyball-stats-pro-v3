import { test, expect } from '@playwright/test';
import { generateMatchData, SELECTORS } from '../helpers/test-data';

/**
 * Test 1: Match Creation
 * 
 * Objective: Create a new match via wizard
 * Independence: Self-contained, creates its own match
 * Assertions: URL navigation, form submission
 */

test.describe('Match Creation', () => {
    test('should create a new match successfully', async ({ page }) => {
        const matchData = generateMatchData();

        // Step 1: Navigate to matches page explicitly
        await page.goto('/matches', { waitUntil: 'networkidle' });

        // Step 2: Wait for and click create button
        const createButton = page.locator(SELECTORS.matches.createButton);
        await createButton.waitFor({ state: 'visible', timeout: 10000 });
        await createButton.click();

        // Step 3: Verify navigation to wizard
        await expect(page).toHaveURL(/\/matches\/create/, { timeout: 10000 });

        // Step 4: Fill opponent name
        const opponentInput = page.locator(SELECTORS.wizard.opponentInput);
        await opponentInput.waitFor({ state: 'visible', timeout: 5000 });
        await opponentInput.fill(matchData.opponentName);

        // Step 5: Fill match date
        const dateInput = page.locator(SELECTORS.wizard.dateInput);
        await dateInput.waitFor({ state: 'visible', timeout: 5000 });
        await dateInput.fill(matchData.matchDate);

        // Step 6: Click next if exists (conditional)
        const nextBtn = page.locator(SELECTORS.wizard.nextBtn);
        const nextExists = await nextBtn.isVisible().catch(() => false);
        if (nextExists) {
            await nextBtn.click();
            await page.waitForTimeout(500);
        }

        // Step 7: Click save button
        const saveBtn = page.locator(SELECTORS.wizard.saveBtn);
        await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
        await saveBtn.click();

        // Step 8: Verify redirect to matches list
        await expect(page).toHaveURL(/\/matches$/, { timeout: 10000 });

        // Step 9: Verify match appears in list
        const matchCard = page.locator(SELECTORS.matches.matchCard, {
            hasText: matchData.opponentName,
        }).first();

        await matchCard.waitFor({ state: 'visible', timeout: 10000 });
        await expect(matchCard).toBeVisible();

        // Verify "Convocatoria" button is visible (match is in planned state)
        await expect(matchCard.locator(SELECTORS.matches.convocationBtn)).toBeVisible();
    });
});
