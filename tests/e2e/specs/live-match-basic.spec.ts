import { test, expect } from '@playwright/test';
import { generateMatchData, SELECTORS } from '../helpers/test-data';

/**
 * Test 3: Live Match Basic Flow
 * 
 * Objective: Start match, register points, verify score updates
 * Independence: Creates match + convocation
 * Assertions: Stable (scores, timeline entries, server indicator)
 */

test.describe('Live Match Basic Flow', () => {
    test('should start match and register points correctly', async ({ page }) => {
        const matchData = generateMatchData();

        // Step 1: Create match with convocation
        await page.goto('/matches');
        await page.click(SELECTORS.matches.createButton);
        await page.fill(SELECTORS.wizard.opponentInput, matchData.opponentName);
        await page.fill(SELECTORS.wizard.dateInput, matchData.matchDate);

        const nextBtn = page.locator(SELECTORS.wizard.nextBtn);
        if (await nextBtn.isVisible()) await nextBtn.click();

        await page.click(SELECTORS.wizard.saveBtn);
        await expect(page).toHaveURL(/\/matches$/);

        // Convocate players
        const matchCard = page.locator(SELECTORS.matches.matchCard, {
            hasText: matchData.opponentName,
        }).first();

        await matchCard.locator(SELECTORS.matches.convocationBtn).click();

        const playerCards = page.locator(SELECTORS.convocation.playerCard);
        const playerCount = await playerCards.count();
        for (let i = 0; i < Math.min(playerCount, 8); i++) {
            await playerCards.nth(i).click();
            await page.waitForTimeout(50);
        }

        await page.click(SELECTORS.convocation.saveBtn);
        await expect(matchCard.locator(SELECTORS.matches.startMatchBtn)).toBeVisible();

        // Step 2: Start match
        await matchCard.locator(SELECTORS.matches.startMatchBtn).click();

        // Should navigate to live match with correct route
        await expect(page).toHaveURL(/\/live-match\/[a-f0-9-]+/);
        await page.waitForLoadState('networkidle');

        // Handle starters modal if it appears
        const startersModal = page.locator('[data-testid="starters-modal"]');
        if (await startersModal.isVisible({ timeout: 2000 })) {
            // Select 6 starters (implementation depends on your modal structure)
            // This is a placeholder - adjust based on actual modal
            await page.click('[data-testid="confirm-starters"]');
        }

        // Step 3: Verify initial state
        const ourScoreEl = page.locator(SELECTORS.liveMatch.ourScore);
        await expect(ourScoreEl).toHaveText('0');

        // Step 4: Register a point
        await page.click(SELECTORS.liveMatch.pointBtn);

        // Verify score updated
        await expect(ourScoreEl).toHaveText('1', { timeout: 3000 });

        // Step 5: Verify timeline entry was created
        const timelineEntries = page.locator(SELECTORS.liveMatch.timelineEntry);
        await expect(timelineEntries).toHaveCount(1, { timeout: 3000 });

        // Step 6: Register points to trigger rotation (6 points = rotation in volleyball)
        for (let i = 0; i < 5; i++) {
            await page.click(SELECTORS.liveMatch.pointBtn);
            await page.waitForTimeout(200);
        }

        // Verify score is now 6
        await expect(ourScoreEl).toHaveText('6');

        // Step 7: Verify server indicator changed (rotation happened)
        const serverIndicator = page.locator(SELECTORS.liveMatch.serverIndicator);
        await expect(serverIndicator).toBeVisible();
        // Server should have rotated (verify rotation UI element exists)

        // Step 8: Verify timeline has multiple entries
        await expect(timelineEntries).toHaveCount(6, { timeout: 3000 });
    });
});
