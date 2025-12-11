interface ActionButtonsProps {
    isServing: boolean
    disabled: boolean
    onPointUs: (reason: string) => void
    onPointOpponent: (reason: string) => void
    onFreeball: () => void
}

export function ActionButtons({
    isServing,
    disabled,
    onPointUs,
    onPointOpponent,
    onFreeball
}: ActionButtonsProps) {
    return (
        <>
            <div className="grid grid-cols-2 gap-2">
                {/* ROW 1 - Serve buttons (only when serving) */}
                {isServing ? (
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
                ) : (
                    <>
                        {/* Empty slots when receiving - modal will open automatically */}
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

                {/* ROW 4 - Opponent point/error */}
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
            </div>

            {/* FREEBALL */}
            <button
                onClick={onFreeball}
                disabled={disabled}
                className="mt-3 w-full h-12 bg-blue-600 active:bg-blue-500 text-white border border-blue-500/50 rounded-lg flex items-center justify-center font-mono text-xs uppercase tracking-widest font-bold shadow-sm hover:brightness-110 transition-all"
            >
                Freeball
            </button>
        </>
    )
}
