import { Timer } from 'lucide-react'

interface MatchHeaderProps {
    currentSet: number
    homeTeamName: string | null
    awayTeamName: string | null
    homeScore: number
    awayScore: number
    setsWonHome: number
    setsWonAway: number
    ourSide: 'home' | 'away'
    servingSide: 'our' | 'opponent'
    // Timeout per team
    timeoutsHome: number
    timeoutsAway: number
    onTimeoutHome?: () => void
    onTimeoutAway?: () => void
    disabled?: boolean
}

// Timeout indicator component
function TimeoutIndicator({ used, max = 2 }: { used: number; max?: number }) {
    return (
        <div className="flex gap-1">
            {Array.from({ length: max }).map((_, i) => (
                <div
                    key={i}
                    className={`w-2 h-2 rounded-full border border-amber-500/50 ${i < used
                            ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                            : 'bg-transparent'
                        }`}
                />
            ))}
        </div>
    )
}

export function MatchHeader({
    currentSet,
    homeTeamName,
    awayTeamName,
    homeScore,
    awayScore,
    setsWonHome,
    setsWonAway,
    ourSide,
    servingSide,
    timeoutsHome,
    timeoutsAway,
    onTimeoutHome,
    onTimeoutAway,
    disabled = false
}: MatchHeaderProps) {
    const isHomeServing = servingSide === (ourSide === 'home' ? 'our' : 'opponent')
    const isAwayServing = servingSide === (ourSide === 'away' ? 'our' : 'opponent')

    return (
        <header className="flex-none bg-zinc-900/90 border-b border-zinc-800 py-3 px-4 flex flex-col z-20 sticky top-0 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-center mb-2">
                <span className="text-zinc-500 font-mono text-[10px] font-bold tracking-widest uppercase">
                    Set {currentSet}
                </span>
            </div>

            <div className="flex items-center justify-between gap-2 px-1">
                {/* HOME SIDE (Fixed Left) */}
                <div className="flex flex-col items-center flex-1">
                    <span className="text-xs uppercase font-bold text-zinc-400 truncate w-full text-center mb-1">
                        {homeTeamName || 'Local'}
                    </span>
                    <div
                        className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all duration-300 w-full relative overflow-hidden ${isHomeServing
                            ? "bg-zinc-800 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                            : "bg-zinc-900/50 border border-zinc-800"
                            }`}
                    >
                        <span
                            className={`text-5xl font-black tracking-tighter leading-none ${ourSide === 'home' ? 'text-white' : 'text-zinc-500'
                                }`}
                        >
                            {homeScore}
                        </span>
                        {isHomeServing && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        )}
                    </div>
                    {/* Home Timeout Indicators + Button */}
                    <div className="flex items-center gap-2 mt-1">
                        <TimeoutIndicator used={timeoutsHome} />
                        {onTimeoutHome && (
                            <button
                                onClick={onTimeoutHome}
                                disabled={disabled || timeoutsHome >= 2}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[8px] font-bold text-zinc-400 uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Timer size={10} />
                            </button>
                        )}
                    </div>
                </div>

                {/* CENTER INFO */}
                <div className="flex flex-col items-center gap-1 opacity-50">
                    <span className="text-xs font-bold text-zinc-600">vs</span>
                </div>

                {/* AWAY SIDE (Fixed Right) */}
                <div className="flex flex-col items-center flex-1">
                    <span className="text-xs uppercase font-bold text-zinc-400 truncate w-full text-center mb-1">
                        {awayTeamName || 'Visitante'}
                    </span>
                    <div
                        className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all duration-300 w-full relative overflow-hidden ${isAwayServing
                            ? "bg-zinc-800 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                            : "bg-zinc-900/50 border border-zinc-800"
                            }`}
                    >
                        <span
                            className={`text-5xl font-black tracking-tighter leading-none ${ourSide === 'away' ? 'text-white' : 'text-zinc-500'
                                }`}
                        >
                            {awayScore}
                        </span>
                        {isAwayServing && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                        )}
                    </div>
                    {/* Away Timeout Indicators + Button */}
                    <div className="flex items-center gap-2 mt-1">
                        {onTimeoutAway && (
                            <button
                                onClick={onTimeoutAway}
                                disabled={disabled || timeoutsAway >= 2}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[8px] font-bold text-zinc-400 uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Timer size={10} />
                            </button>
                        )}
                        <TimeoutIndicator used={timeoutsAway} />
                    </div>
                </div>
            </div>

            <div className="flex justify-center items-center gap-3 mt-2">
                <span className="text-[10px] text-zinc-600 font-mono font-bold">
                    Sets: {setsWonHome} - {setsWonAway}
                </span>
            </div>
        </header>
    )
}
