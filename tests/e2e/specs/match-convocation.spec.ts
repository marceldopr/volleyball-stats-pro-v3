import { test, expect } from '@playwright/test';
import { generateMatchData, SELECTORS } from '../helpers/test-data';

/**
 * Test 2: Match Convocation
 * 
 * Objective: Create match and manage player convocation
 * Independence: Creates its own match
 * Assertions: Convocation saved, button changes to "Iniciar Partido"
 */

test.describe('Match Convocation', () => {
    test('should convocate players for a match', async ({ page }) => {
        const matchData = generateMatchData();

        // Step 1: Create a match
        await page.goto('/matches');
        await page.click(SELECTORS.matches.createButton);
        await expect(page).toHaveURL(/\/matches\/create/);

        await page.fill(SELECTORS.wizard.opponentInput, matchData.opponentName);
        await page.fill(SELECTORS.wizard.dateInput, matchData.matchDate);

        const nextBtn = page.locator(SELECTORS.wizard.nextBtn);
        if (await nextBtn.isVisible()) {
            await nextBtn.click();
        }

        await page.click(SELECTORS.wizard.saveBtn);
        await expect(page).toHaveURL(/\/matches$/);

        // Step 2: Open convocation modal
        const matchCard = page.locator(SELECTORS.matches.matchCard, {
            hasText: matchData.opponentName,
        }).first();

        await matchCard.locator(SELECTORS.matches.convocationBtn).click();

        // Modal should open
        await expect(page.locator(SELECTORS.convocation.modal)).toBeVisible();

        // Step 3: Select players (at least 6)
        const playerCards = page.locator(SELECTORS.convocation.playerCard);
        const playerCount = await playerCards.count();

        // Select minimum 6 players or all available (whichever is less)
        const playersToSelect = Math.min(playerCount, 8);
        for (let i = 0; i < playersToSelect; i++) {
            await playerCards.nth(i).click();
            await page.waitForTimeout(100); // Small delay for UI stability
        }

        // Step 4: Save convocation
        await page.click(SELECTORS.convocation.saveBtn);

        // Modal should close
        await expect(page.locator(SELECTORS.convocation.modal)).not.toBeVisible();

        // Step 5: Verify button changed to "Iniciar Partido"
        await expect(matchCard.locator(SELECTORS.matches.startMatchBtn)).toBeVisible({ timeout: 5000 });
    });
});
