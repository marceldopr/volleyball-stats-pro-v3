import { Undo2, Users } from 'lucide-react'

interface BottomActionsProps {
    onSubstitution: () => void
    onLiberoSwap: () => void
    onToggleTimeline: () => void
    showTimeline: boolean
    onUndo: () => void
    canUndo: boolean
}

export function BottomActions({
    onSubstitution,
    onLiberoSwap,
    onToggleTimeline,
    showTimeline,
    onUndo,
    canUndo
}: BottomActionsProps) {
    return (
        <div className="mt-auto bg-zinc-950 border-t border-zinc-900">
            {/* Single Row: Actions + Timeline Toggle */}
            <div className="px-4 py-3 flex items-center justify-between gap-2">
                {/* Left: Undo */}
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="flex flex-col items-center gap-1 text-zinc-500 active:text-white disabled:opacity-30"
                >
                    <Undo2 size={18} />
                    <span className="text-[9px] uppercase font-bold tracking-wide">Undo</span>
                </button>

                {/* Center: Main Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onSubstitution}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-bold text-xs uppercase tracking-wider hover:bg-zinc-700 active:bg-zinc-600 transition-all shadow-sm"
                    >
                        <Users size={14} className="inline mr-1" />
                        Cambio
                    </button>
                    <button
                        onClick={onLiberoSwap}
                        className="px-4 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-200 font-bold text-xs uppercase tracking-wider hover:bg-amber-900/50 active:bg-amber-900/70 transition-all shadow-sm"
                    >
                        Líbero
                    </button>
                </div>

                {/* Right: Timeline Toggle */}
                <button
                    onClick={onToggleTimeline}
                    className={`flex flex-col items-center gap-1 transition-colors ${showTimeline ? 'text-white' : 'text-zinc-500'
                        }`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M3 3v18h18" />
                        <path d="m19 9-5 5-4-4-3 3" />
                    </svg>
                    <span className="text-[9px] uppercase font-bold tracking-wide">
                        Timeline
                    </span>
                </button>
            </div>
        </div>
    )
}
