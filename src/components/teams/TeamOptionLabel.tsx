import { TeamIdentifierDot } from '@/components/teams/TeamIdentifierDot'
import { getTeamDisplayName } from '@/utils/teamDisplay'

interface TeamOptionLabelProps {
    team: {
        category_stage?: string
        custom_name?: string | null
        gender?: string
        identifier?: {
            name: string
            type: 'letter' | 'color'
            code: string | null
            color_hex: string | null
        } | null
    }
    showDot?: boolean
    className?: string
}

/**
 * TeamOptionLabel - Reusable component for rendering team name with optional color dot
 * Use in select options, dropdowns, and anywhere a team needs to be displayed consistently
 */
export function TeamOptionLabel({ team, showDot = true, className = '' }: TeamOptionLabelProps) {
    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            {showDot && <TeamIdentifierDot identifier={team.identifier} size="sm" />}
            <span>{getTeamDisplayName(team)}</span>
        </span>
    )
}

/**
 * Shorthand function to get team display with dot for selects
 * Returns JSX that can be used in option labels
 */
export function renderTeamOption(team: TeamOptionLabelProps['team']) {
    return <TeamOptionLabel team={team} />
}
