interface CompactRoleDisplayProps {
    startRole?: 'starter' | 'rotation' | 'specialist' | 'development'
    midRole?: 'starter' | 'rotation' | 'specialist' | 'development'
    endRole?: 'starter' | 'rotation' | 'specialist' | 'development'
}

const ROLE_LABELS = {
    starter: 'Titular',
    rotation: 'Rotación',
    specialist: 'Especialista',
    development: 'En desarrollo'
} as const

/**
 * Compact role display showing 3 phases side by side
 */
export function CompactRoleDisplay({
    startRole,
    midRole,
    endRole
}: CompactRoleDisplayProps) {
    const renderRole = (role: string | undefined, phase: string) => {
        if (!role) {
            return (
                <div className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-center text-sm">
                    <div className="font-medium text-xs mb-1">{phase}</div>
                    <div className="text-xs">-</div>
                </div>
            )
        }

        const label = ROLE_LABELS[role as keyof typeof ROLE_LABELS]

        return (
            <div className="flex-1 px-3 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-center">
                <div className="font-medium text-xs mb-1">{phase}</div>
                <div className="text-sm font-semibold">{label}</div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Rol en el Equipo
            </h3>
            <div className="flex gap-2">
                {renderRole(startRole, 'Inicio')}
                {renderRole(midRole, 'Mitad')}
                {renderRole(endRole, 'Final')}
            </div>
        </div>
    )
}
