import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
    onBack: () => void
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
    onBack
}: MatchHeaderProps) {
    const isHomeServing = servingSide === (ourSide === 'home' ? 'our' : 'opponent')
    const isAwayServing = servingSide === (ourSide === 'away' ? 'our' : 'opponent')

    return (
        <header className="flex-none bg-zinc-900/90 border-b border-zinc-800 py-3 px-4 flex flex-col z-20 sticky top-0 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-between mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-8 w-8 text-zinc-400 hover:text-white p-0"
                >
                    <ArrowLeft size={20} />
                </Button>
                <span className="text-zinc-500 font-mono text-[10px] font-bold tracking-widest uppercase">
                    Set {currentSet}
                </span>
                <div className="w-8" />
            </div>

            <div className="flex items-center justify-between gap-4 px-2">
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
                </div>
            </div>

            <div className="flex justify-center mt-2">
                <span className="text-[10px] text-zinc-600 font-mono font-bold">
                    Sets: {setsWonHome} - {setsWonAway}
                </span>
            </div>
        </header>
    )
}
