import { Undo2, Users, DoorOpen, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'

interface BottomActionsProps {
    // Action handlers
    onSubstitution: () => void
    onLiberoSwap: () => void
    onUndo: () => void
    onExit: () => void
    onToggleTimeline: () => void

    // Timeline state
    isTimelineOpen: boolean
    lastEventLabel: string
    eventCount: number

    // Disabled states
    disableSubstitution: boolean
    disableLibero: boolean
    disableUndo: boolean
}

export function BottomActions({
    onSubstitution,
    onLiberoSwap,
    onUndo,
    onExit,
    onToggleTimeline,
    isTimelineOpen,
    lastEventLabel,
    eventCount,
    disableSubstitution,
    disableLibero,
    disableUndo
}: BottomActionsProps) {
    return (
        <div className="mt-auto bg-zinc-950 border-t border-zinc-900">
            {/* Single Row: Actions + Timeline Toggle */}
            <div className="px-4 py-3 flex items-center justify-between gap-2">
                {/* Left: Cambio + Líbero */}
                <div className="flex gap-4">
                    <button
                        onClick={onSubstitution}
                        disabled={disableSubstitution}
                        className="flex flex-col items-center gap-1 text-zinc-400 active:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Users size={20} />
                        <span className="text-[9px] font-bold">CAMBIO</span>
                    </button>
                    <button
                        onClick={onLiberoSwap}
                        disabled={disableLibero}
                        className="flex flex-col items-center gap-1 text-purple-400 active:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Users size={18} className="fill-current" />
                        <span className="text-[9px] font-bold">LÍBERO</span>
                    </button>
                </div>

                {/* Center: Timeline Toggle */}
                <button
                    onClick={onToggleTimeline}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                    <ClipboardList className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-300 truncate max-w-[120px]">
                        {lastEventLabel}
                    </span>
                    <span className="text-[10px] text-zinc-500">({eventCount})</span>
                    <span className="text-xs text-zinc-500">
                        {isTimelineOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                </button>

                {/* Right: Undo + Exit */}
                <div className="flex gap-4">
                    <button
                        onClick={onUndo}
                        disabled={disableUndo}
                        className="flex flex-col items-center gap-1 text-zinc-500 active:text-white disabled:opacity-30"
                    >
                        <Undo2 size={20} />
                        <span className="text-[9px] font-bold">DESHACER</span>
                    </button>

                    <button
                        onClick={onExit}
                        className="flex flex-col items-center gap-1 text-red-400 active:text-white"
                    >
                        <DoorOpen size={20} />
                        <span className="text-[9px] font-bold">SALIR</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
