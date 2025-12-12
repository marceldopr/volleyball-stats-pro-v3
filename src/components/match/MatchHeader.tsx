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

// Vertical timeout column component - height matches scoreboard block
function TimeoutColumn({
    used,
    onTimeout,
    disabled
}: {
    used: number
    onTimeout?: () => void
    disabled: boolean
}) {
    // Total height = team name (~16px + 4px margin) + scoreboard (72px) = ~92px
    // We use justify-end to align button bottom with scoreboard bottom
    return (
        <div className="flex flex-col items-center justify-end h-[92px]">
            {/* Two vertical timeout dots - centered above button */}
            <div className="flex flex-col items-center gap-1 mb-2">
                <div
                    className={`w-2.5 h-2.5 rounded-full border-2 border-amber-500/60 ${used >= 1 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]' : 'bg-transparent'
                        }`}
                />
                <div
                    className={`w-2.5 h-2.5 rounded-full border-2 border-amber-500/60 ${used >= 2 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]' : 'bg-transparent'
                        }`}
                />
            </div>
            {/* T.M. Button - bottom aligned with scoreboard */}
            {onTimeout && (
                <button
                    onClick={onTimeout}
                    disabled={disabled || used >= 2}
                    className="flex items-center justify-center w-10 h-9 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-[9px] font-bold text-zinc-400 uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <Timer size={12} className="mr-0.5" />
                </button>
            )}
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
        <header className="flex-none bg-zinc-900/90 border-b border-zinc-800 py-3 px-2 flex flex-col z-20 sticky top-0 backdrop-blur-md shadow-md">
            {/* Set indicator */}
            <div className="flex items-center justify-center mb-2">
                <span className="text-zinc-500 font-mono text-[10px] font-bold tracking-widest uppercase">
                    Set {currentSet}
                </span>
            </div>

            {/* Main scoreboard row */}
            <div className="flex items-center justify-center gap-2">

                {/* HOME: Timeout Column (LEFT) + Scoreboard */}
                <div className="flex items-start gap-2">
                    {/* Timeout column on the left */}
                    <TimeoutColumn
                        used={timeoutsHome}
                        onTimeout={onTimeoutHome}
                        disabled={disabled}
                    />

                    {/* Home scoreboard */}
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1">
                            {homeTeamName || 'Local'}
                        </span>
                        <div
                            className={`flex items-center justify-center w-[72px] h-[72px] rounded-xl transition-all duration-300 relative ${isHomeServing
                                ? "bg-zinc-800 border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                : "bg-zinc-900/50 border border-zinc-800"
                                }`}
                        >
                            <span
                                className={`text-5xl font-black tracking-tighter leading-none ${ourSide === 'home' ? 'text-white' : 'text-zinc-500'}`}
                            >
                                {homeScore}
                            </span>
                            {isHomeServing && (
                                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            )}
                        </div>
                    </div>
                </div>

                {/* CENTER: VS + Sets info */}
                <div className="flex flex-col items-center justify-center px-2">
                    <span className="text-xs font-bold text-zinc-600">vs</span>
                    <span className="text-[9px] text-zinc-700 font-mono mt-0.5">
                        {setsWonHome} - {setsWonAway}
                    </span>
                </div>

                {/* AWAY: Scoreboard + Timeout Column (RIGHT) */}
                <div className="flex items-start gap-2">
                    {/* Away scoreboard */}
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1">
                            {awayTeamName || 'Visitante'}
                        </span>
                        <div
                            className={`flex items-center justify-center w-[72px] h-[72px] rounded-xl transition-all duration-300 relative ${isAwayServing
                                ? "bg-zinc-800 border-2 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                                : "bg-zinc-900/50 border border-zinc-800"
                                }`}
                        >
                            <span
                                className={`text-5xl font-black tracking-tighter leading-none ${ourSide === 'away' ? 'text-white' : 'text-zinc-500'}`}
                            >
                                {awayScore}
                            </span>
                            {isAwayServing && (
                                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                            )}
                        </div>
                    </div>

                    {/* Timeout column on the right */}
                    <TimeoutColumn
                        used={timeoutsAway}
                        onTimeout={onTimeoutAway}
                        disabled={disabled}
                    />
                </div>
            </div>
        </header>
    )
}
