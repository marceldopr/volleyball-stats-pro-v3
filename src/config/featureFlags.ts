/**
 * Feature Flags for Volleyball Stats Pro
 * 
 * Toggle features on/off without code changes.
 * Set to false to disable a feature and revert to previous behavior.
 */

export const FEATURE_FLAGS = {
    /**
     * Multi-Season Management System
     * - Season states: draft/active/archived
     * - Next season planning module
     * - Season selector in Calendar and Settings
     * - Transition workflow
     */
    SEASONS_V2: true,
}

/**
 * Helper to check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
    return FEATURE_FLAGS[flag] === true
}
