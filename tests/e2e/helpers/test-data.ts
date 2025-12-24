/**
 * Test Data Generators
 * Creates unique test data for independent tests
 */

export function generateMatchData() {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);

    return {
        opponentName: `E2E Test Rival ${timestamp}`,
        matchDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        identifier: `e2e-${randomId}`,
    };
}

export function generatePlayerCount() {
    // Return a random number between 6-12 for realistic convocation
    return Math.floor(Math.random() * 7) + 6;
}

/**
 * Selectors for stable E2E tests
 * Centralized to avoid magic strings
 */
export const SELECTORS = {
    // Matches page
    matches: {
        createButton: '[data-testid="create-match-btn"]',
        matchCard: '[data-testid="match-card"]',
        convocationBtn: '[data-testid="convocation-btn"]',
        startMatchBtn: '[data-testid="start-match-btn"]',
        viewLiveBtn: '[data-testid="view-live-btn"]',
        viewAnalysisBtn: '[data-testid="view-analysis-btn"]',
    },

    // Match Wizard
    wizard: {
        opponentInput: '[data-testid="opponent-name-input"]',
        dateInput: '[data-testid="match-date-input"]',
        nextBtn: '[data-testid="wizard-next-btn"]',
        saveBtn: '[data-testid="wizard-save-btn"]',
    },

    // Convocation Modal
    convocation: {
        modal: '[data-testid="convocation-modal"]',
        playerCard: '[data-testid="player-card"]',
        saveBtn: '[data-testid="save-convocation-btn"]',
    },

    // Live Match
    liveMatch: {
        ourScore: '[data-testid="our-score"]',
        rivalScore: '[data-testid="rival-score"]',
        pointBtn: '[data-testid="point-btn"]',
        serverIndicator: '[data-testid="server-indicator"]',
        timelineEntry: '[data-testid="timeline-entry"]',
        finishSetBtn: '[data-testid="finish-set-btn"]',
    },

    // Analysis
    analysis: {
        executiveSummary: '[data-testid="executive-summary"]',
        setScores: '[data-testid="set-scores"]',
        playerStats: '[data-testid="player-stats"]',
    },
};
