import { Timer } from 'lucide-react'

interface MatchHeaderProps {
    currentSet: number
    homeTeamName: string | null
    awayTeamName: string | null
    homeScore: number
    awayScore: number
    ourSide: 'home' | 'away'
    servingSide: 'our' | 'opponent'
    setsScores: { setNumber: number; home: number; away: number }[]
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
    ourSide,
    servingSide,
    setsScores,
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


            {/* Main scoreboard row - Grid for perfect symmetry and independent columns */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-0 w-full h-[92px]">

                {/* LEFT COLUMN (YELLOW): Home Team - Independent Layout */}
                <div className="relative w-full h-full">
                    {/* Team Name: Aligned towards center (Right) */}
                    <div className="absolute top-0 left-0 w-full flex justify-end">
                        <span className="text-[11px] uppercase font-bold text-zinc-400 truncate px-2">
                            {homeTeamName || 'Local'}
                        </span>
                    </div>

                    {/* Scoreboard Group: Anchored to the Right (Bottom) - Touching the center column */}
                    <div className="absolute bottom-0 right-0 flex items-end gap-2">
                        {/* Timeout column */}
                        <TimeoutColumn
                            used={timeoutsHome}
                            onTimeout={onTimeoutHome}
                            disabled={disabled}
                        />

                        {/* Home Scoreboard Square */}
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

                {/* CENTER COLUMN (RED): Set Info - Stable Axis */}
                <div className="w-auto px-12 flex flex-col items-center justify-center h-full pb-1">
                    {/* Set indicator - Now inside the center column */}
                    <span className="text-zinc-500 font-mono text-[11px] font-bold tracking-widest uppercase mb-2">
                        Set {currentSet}
                    </span>

                    {/* Completed sets list */}
                    <div className="flex flex-col items-center space-y-0.5">
                        {setsScores.filter(s => s.setNumber < currentSet).map(set => (
                            <div key={set.setNumber} className="flex items-center gap-1 font-mono font-medium text-[11px]">
                                <span className={set.home > set.away ? 'text-emerald-400' : 'text-zinc-500'}>
                                    {set.home}
                                </span>
                                <span className="text-zinc-600">-</span>
                                <span className={set.away > set.home ? 'text-emerald-400' : 'text-zinc-500'}>
                                    {set.away}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT COLUMN (YELLOW): Away Team - Independent Layout */}
                <div className="relative w-full h-full">
                    {/* Team Name: Aligned towards center (Left) */}
                    <div className="absolute top-0 left-0 w-full flex justify-start">
                        <span className="text-[11px] uppercase font-bold text-zinc-400 truncate px-2">
                            {awayTeamName || 'Visitante'}
                        </span>
                    </div>

                    {/* Scoreboard Group: Anchored to the Left (Bottom) - Touching the center column */}
                    <div className="absolute bottom-0 left-0 flex items-end gap-2">
                        {/* Away Scoreboard Square */}
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

                        {/* Timeout column - Right side */}
                        <TimeoutColumn
                            used={timeoutsAway}
                            onTimeout={onTimeoutAway}
                            disabled={disabled}
                        />
                    </div>
                </div>
            </div>
        </header>
    )
}
