interface RotationModalV2Props {
    isOpen: boolean
    onClose: () => void
    onCourtPlayers: Array<{ position: number; player: { id: string; name: string; number: number } }>
    getPlayerDisplay: (playerId: string | null | undefined) => {
        number: string
        name: string
        role: string
    }
}

export function RotationModalV2({
    isOpen,
    onClose,
    onCourtPlayers,
    getPlayerDisplay
}: RotationModalV2Props) {
    if (!isOpen) return null

    // Helper to get player at a position
    const getPlayerAt = (pos: number) => {
        const entry = onCourtPlayers.find(e => e.position === pos)
        return entry?.player || null
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-in fade-in duration-100"
            onClick={onClose}
        >
            <div
                className="bg-zinc-900 w-full max-w-xs rounded-xl border border-zinc-800 p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <h3 className="text-white font-bold text-lg uppercase tracking-widest">Rotación Actual</h3>
                    <p className="text-zinc-500 text-xs mt-1">Saca: P1</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {/* Front: 4-3-2 */}
                    {[4, 3, 2].map(pos => {
                        const p = getPlayerAt(pos)
                        const display = getPlayerDisplay(p?.id)
                        return (
                            <div key={pos} className="aspect-square bg-zinc-800 rounded-full border border-zinc-700 flex flex-col items-center justify-center shadow-lg relative overflow-visible">
                                <span className="text-2xl font-bold text-white z-10">{display.number}</span>
                                <span className="text-[10px] text-zinc-500 uppercase z-10 truncate w-full text-center px-1">{display.name}</span>

                                {/* Role Badge */}
                                {display.role && display.role.toLowerCase() !== 'starter' && (
                                    <div className="absolute -bottom-1.5 right-1 rounded-full bg-zinc-900 px-1.5 py-[1px] border border-zinc-700">
                                        <span className="text-[7px] text-zinc-400 font-bold uppercase">{display.role}</span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-transparent rounded-full" />
                            </div>
                        )
                    })}
                    {/* Back: 5-6-1 */}
                    {[5, 6, 1].map(pos => {
                        const p = getPlayerAt(pos)
                        const display = getPlayerDisplay(p?.id)
                        return (
                            <div key={pos} className="aspect-square bg-zinc-800/50 rounded-full border border-zinc-700/50 flex flex-col items-center justify-center shadow-sm relative overflow-visible">
                                <span className="text-2xl font-bold text-zinc-400 z-10">{display.number}</span>
                                <span className="text-[9px] text-zinc-600 uppercase z-10 truncate w-full text-center px-1">{display.name}</span>

                                {/* Role Badge */}
                                {display.role && display.role.toLowerCase() !== 'starter' && (
                                    <div className="absolute -bottom-1.5 right-1 rounded-full bg-zinc-900/80 px-1.5 py-[1px] border border-zinc-700/50">
                                        <span className="text-[7px] text-zinc-500 font-bold uppercase">{display.role}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <button onClick={onClose} className="w-full py-3 bg-zinc-800 text-white font-bold rounded-lg active:bg-zinc-700">
                    CERRAR
                </button>
            </div>
        </div>
    )
}
