/**
 * Utility to calculate effective display data for a player in a match context.
 * Unifies logic across ConvocationModal, StartersModal, and general display.
 */

interface PlayerBasicInfo {
    id: string
    jersey_number?: string | null
    main_position?: string | null
}

interface RosterItem {
    player_id: string
    jersey_number?: string | null
    position?: string | null
    assignment_type?: 'primary' | 'secondary'
}

interface ConvocationData {
    player_id: string
    jersey_number_override?: string | null
    position_override?: string | null
    role_in_match?: string | null
}

interface EffectivePlayerDisplay {
    jerseyNumber: string
    position: string // Normalized Code: OH, MB, OPP, S, L
    source: 'override' | 'roster' | 'profile'
    isLoaned: boolean
}

export function getEffectivePlayerDisplayData(
    player: PlayerBasicInfo,
    rosterItem?: RosterItem | null,
    convocation?: ConvocationData | null
): EffectivePlayerDisplay {

    // 1. Jersey Number
    // Priority: Convocation Override > Roster (Origin/Current) > Profile > '?'
    let jerseyNumber = '?'
    let source: EffectivePlayerDisplay['source'] = 'profile'

    if (convocation?.jersey_number_override) {
        jerseyNumber = convocation.jersey_number_override
        source = 'override'
    } else if (rosterItem?.jersey_number) {
        jerseyNumber = rosterItem.jersey_number
        source = 'roster'
    } else if (player.jersey_number) {
        jerseyNumber = player.jersey_number
        source = 'profile'
    }

    // 2. Position
    // Priority: Convocation Override > Match Role (legacy) > Roster (Origin/Current) > Profile > '?'
    let rawPos: string | null = null

    if (convocation?.position_override) {
        rawPos = convocation.position_override
    } else if (convocation?.role_in_match && !['starter', 'convocado'].includes(convocation.role_in_match.toLowerCase())) {
        // Fallback for legacy "role_in_match" if it contains a position
        rawPos = convocation.role_in_match
    } else if (rosterItem?.position && !['starter', 'convocado'].includes(rosterItem.position.toLowerCase())) {
        rawPos = rosterItem.position
    } else {
        rawPos = player.main_position || '?'
    }

    // Normalize Position to Codes
    const position = normalizePosition(rawPos)

    return {
        jerseyNumber,
        position,
        source: convocation?.jersey_number_override || convocation?.position_override ? 'override' : source,
        isLoaned: rosterItem?.assignment_type === 'secondary'
    }
}

function normalizePosition(raw: string | null): string {
    if (!raw) return '?'

    const map: Record<string, string> = {
        'Central': 'MB',
        'Receptora': 'OH', 'Receptor': 'OH', 'Punta': 'OH',
        'Opuesta': 'OPP', 'Opuesto': 'OPP',
        'Colocadora': 'S', 'Colocador': 'S', 'Armadora': 'S',
        'Líbero': 'L', 'Libero': 'L'
    }

    // Direct match or partial match
    return map[raw] ||
        Object.entries(map).find(([k]) => raw.includes(k))?.[1] ||
        raw
}
