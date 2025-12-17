interface PlayerFisicoSaludProps {
    playerId: string
    currentSeason: { id: string } | null
    hasInjury: boolean
    onInjuryChange: (status: boolean) => void
}

export function PlayerFisicoSalud({ playerId, currentSeason, hasInjury }: PlayerFisicoSaludProps) {
    return (
        <div className="space-y-6">
            <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Físico & Salud</h2>
                <p className="text-gray-400">Tab en desarrollo - Próximamente</p>
                <p className="text-sm text-gray-500 mt-2">
                    Player ID: {playerId} | Season: {currentSeason?.id || 'none'} | Injury: {hasInjury ? 'Yes' : 'No'}
                </p>
            </div>
        </div>
    )
}
