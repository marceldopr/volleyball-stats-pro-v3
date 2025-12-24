/**
 * Injury indicator icon
 * Red medical cross on white square background
 */
export function InjuryIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            aria-label="Lesionada"
            fill="none"
        >
            {/* White square background */}
            <rect x="2" y="2" width="20" height="20" fill="white" rx="2" />

            {/* Red medical cross - vertical and horizontal bars */}
            <rect x="10" y="4" width="4" height="16" fill="#DC2626" rx="0.5" />
            <rect x="4" y="10" width="16" height="4" fill="#DC2626" rx="0.5" />
        </svg>
    )
}
