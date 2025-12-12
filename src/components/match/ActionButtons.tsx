interface ActionButtonsProps {
    isServing: boolean
    disabled: boolean
    onPointUs: (reason: string) => void
    onPointOpponent: (reason: string) => void
    onFreeballSent: () => void
    onFreeballReceived: () => void
}

export function ActionButtons({
    isServing,
    disabled,
    onPointUs,
    onPointOpponent,
    onFreeballSent,
    onFreeballReceived
}: ActionButtonsProps) {
    return (
        <>
            <div className="grid grid-cols-2 gap-2">
                {/* ROW 1 - Serve buttons (only when serving) */}
                {isServing && (
                    <>
                        <button
                            onClick={() => onPointUs('serve_point')}
                            disabled={disabled}
                            className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110"
                        >
                            Punto saque
                        </button>
                        <button
                            onClick={() => onPointOpponent('service_error')}
                            disabled={disabled}
                            className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110"
                        >
                            Error saque
                        </button>
                    </>
                )}

                {/* ROW 2 - Attack */}
                <button
                    onClick={() => onPointUs('attack_point')}
                    disabled={disabled}
                    className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110"
                >
                    Punto ataque
                </button>
                <button
                    onClick={() => onPointOpponent('attack_error')}
                    disabled={disabled}
                    className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110"
                >
                    Error ataque
                </button>

                {/* ROW 3 - Block */}
                <button
                    onClick={() => onPointUs('block_point')}
                    disabled={disabled}
                    className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110"
                >
                    Punto bloqueo
                </button>
                <button
                    onClick={() => onPointOpponent('attack_blocked')}
                    disabled={disabled}
                    className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110"
                >
                    Bloqueado
                </button>

                {/* ROW 4 - Opponent errors/points */}
                <button
                    onClick={() => onPointUs('opponent_error')}
                    disabled={disabled}
                    className="h-14 bg-emerald-600 active:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110"
                >
                    Error rival
                </button>
                <button
                    onClick={() => onPointOpponent('opponent_point')}
                    disabled={disabled}
                    className="h-14 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:brightness-110"
                >
                    Punto rival
                </button>

                {/* ROW 5 - Our errors (both give point to opponent) - COMPACT */}
                <div className="h-14" /> {/* Empty spacer on left column */}
                <div className="flex gap-1 h-14">
                    <button
                        onClick={() => onPointOpponent('unforced_error')}
                        disabled={disabled}
                        className="flex-1 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all hover:brightness-110"
                    >
                        Error genérico
                    </button>
                    <button
                        onClick={() => onPointOpponent('fault')}
                        disabled={disabled}
                        className="flex-1 bg-red-600 active:bg-red-500 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all hover:brightness-110"
                    >
                        Falta
                    </button>
                </div>
            </div>

            {/* FREEBALL BUTTONS */}
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                    onClick={onFreeballSent}
                    disabled={disabled}
                    className="h-12 bg-blue-600 active:bg-blue-500 text-white border border-blue-500/50 rounded-lg flex items-center justify-center font-mono text-xs uppercase tracking-widest font-bold shadow-sm hover:brightness-110 transition-all"
                >
                    Freeball Env.
                </button>
                <button
                    onClick={onFreeballReceived}
                    disabled={disabled}
                    className="h-12 bg-blue-600 active:bg-blue-500 text-white border border-blue-500/50 rounded-lg flex items-center justify-center font-mono text-xs uppercase tracking-widest font-bold shadow-sm hover:brightness-110 transition-all"
                >
                    Freeball Rec.
                </button>
            </div>
        </>
    )
}
