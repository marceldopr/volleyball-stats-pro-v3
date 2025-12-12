import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { PlayerCard } from './PlayerCard'
import type { DerivedMatchState, PlayerV2 } from '@/stores/matchStoreV2'

interface StartersModalV2Props {
    isOpen: boolean
    derivedState: DerivedMatchState
    availablePlayers: PlayerV2[]
    initialServerChoice: 'our' | 'opponent' | null
    selectedStarters: { [pos: number]: string }
    selectedLiberoId: string | null
    homeTeamName: string | null
    awayTeamName: string | null
    getPlayerDisplay: (playerId: string | null | undefined) => { number: string; name: string; role: string }
    onInitialServerChange: (choice: 'our' | 'opponent') => void
    onStarterSelect: (pos: number, playerId: string) => void
    onLiberoSelect: (liberoId: string | null) => void
    onConfirm: () => void
    onBack: () => void
}

export function StartersModalV2({
    isOpen,
    derivedState,
    availablePlayers,
    initialServerChoice,
    selectedStarters,
    selectedLiberoId,
    homeTeamName,
    awayTeamName,
    getPlayerDisplay,
    onInitialServerChange,
    onStarterSelect,
    onLiberoSelect,
    onConfirm,
    onBack
}: StartersModalV2Props) {
    // Local state for controlling which position is being edited
    const [activePosition, setActivePosition] = useState<number | null>(null)

    if (!isOpen) return null

    // Determine team names based on ourSide
    const ourTeamName = derivedState.ourSide === 'home' ? (homeTeamName || 'Nosotros') : (awayTeamName || 'Nosotros')
    const opponentTeamName = derivedState.ourSide === 'home' ? (awayTeamName || 'Rival') : (homeTeamName || 'Rival')

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-2xl relative">

                {/* Header with Back Button */}
                <div className="relative mb-4">
                    {/* Back Button */}
                    <button
                        onClick={onBack}
                        className="absolute left-0 top-0 flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-xs font-semibold uppercase">Volver</span>
                    </button>

                    {/* Title (centered) */}
                    <div className="text-center pt-5">
                        <h3 className="text-xl font-bold text-white uppercase tracking-widest">Titulares Set {derivedState.currentSet}</h3>
                    </div>
                </div>

                {(derivedState.currentSet === 1 || derivedState.currentSet === 5) && (
                    <div className="w-full mb-4">
                        <div className="text-xs text-zinc-400 mb-2 text-center uppercase tracking-wider font-bold">
                            ¿Quién saca primero?
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                className={`py-2 rounded-lg border text-xs font-bold uppercase transition-all ${initialServerChoice === 'our'
                                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-400/50"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                    }`}
                                onClick={() => onInitialServerChange('our')}
                            >
                                {ourTeamName}
                            </button>
                            <button
                                type="button"
                                className={`py-2 rounded-lg border text-xs font-bold uppercase transition-all ${initialServerChoice === 'opponent'
                                    ? "bg-rose-600 border-rose-500 text-white shadow-lg ring-1 ring-rose-400/50"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                    }`}
                                onClick={() => onInitialServerChange('opponent')}
                            >
                                {opponentTeamName}
                            </button>
                        </div>

                        {/* Instruction text moved here */}
                        <p className="text-zinc-500 text-xs text-center mt-3">Selecciona 6 jugadoras iniciales</p>
                    </div>
                )}

                {/* PISTA VISUAL 3x2 con Grid Rectangular */}
                <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50 mb-4 relative overflow-visible">
                    {/* Red de Voleibol */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-20 pointer-events-none" />

                    {/* ROW 1: P4 - P3 - P2 */}
                    <div className="flex justify-center gap-1 mb-2 pb-2 border-b border-zinc-800/50">
                        {[4, 3, 2].map(pos => {
                            const selectedId = selectedStarters[pos]
                            const display = selectedId ? getPlayerDisplay(selectedId) : { number: '+', name: `P${pos}`, role: '' }

                            return (
                                <PlayerCard
                                    key={pos}
                                    number={display.number}
                                    name={display.name}
                                    role={display.role}
                                    position={pos as 1 | 2 | 3 | 4 | 5 | 6}
                                    compact={true}
                                    onClick={() => setActivePosition(pos)}
                                    className="cursor-pointer"
                                />
                            )
                        })}
                    </div>

                    {/* ROW 2: P5 - P6 - P1 */}
                    <div className="flex justify-center gap-1 pt-1">
                        {[5, 6, 1].map(pos => {
                            const selectedId = selectedStarters[pos]
                            const display = selectedId ? getPlayerDisplay(selectedId) : { number: '+', name: `P${pos}`, role: '' }

                            return (
                                <PlayerCard
                                    key={pos}
                                    number={display.number}
                                    name={display.name}
                                    role={display.role}
                                    position={pos as 1 | 2 | 3 | 4 | 5 | 6}
                                    compact={true}
                                    onClick={() => setActivePosition(pos)}
                                    className="cursor-pointer"
                                />
                            )
                        })}
                    </div>

                    {/* Libero Section */}
                    <div className="mt-4 flex flex-col items-center">
                        <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2 tracking-widest">LÍBERO</div>
                        {selectedLiberoId ? (() => {
                            const liberoData = getPlayerDisplay(selectedLiberoId)
                            return (
                                <PlayerCard
                                    number={liberoData.number}
                                    name={liberoData.name}
                                    role="L"
                                    compact={true}
                                    onClick={() => setActivePosition(999)}
                                    className="cursor-pointer"
                                />
                            )
                        })() : (
                            <PlayerCard
                                number="+"
                                name="Seleccionar"
                                role="L"
                                compact={true}
                                onClick={() => setActivePosition(999)}
                                className="cursor-pointer"
                            />
                        )}
                    </div>
                </div>

                {/* PLAYER SELECTION POPUP */}
                {activePosition !== null && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60"
                            onClick={() => setActivePosition(null)}
                        />

                        {/* Popup */}
                        <div className="relative w-full max-w-[280px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className={`relative bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-3 text-sm font-bold uppercase tracking-wider text-center ${activePosition === 999 ? 'text-amber-400' : 'text-zinc-300'}`}>
                                <span>{activePosition === 999 ? 'Seleccionar Líbero' : `Seleccionar P${activePosition}`}</span>
                                <button
                                    onClick={() => setActivePosition(null)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    <span className="text-lg font-bold">×</span>
                                </button>
                            </div>

                            {/* Player List */}
                            <div className="max-h-80 overflow-y-auto scrollbar-hide">
                                {(() => {
                                    let availableForPos: PlayerV2[]

                                    if (activePosition === 999) {
                                        // Libero selection
                                        availableForPos = availablePlayers.filter(p => {
                                            const isLibero = p.role === 'L'
                                            const isUsedInField = Object.values(selectedStarters).includes(p.id)
                                            return isLibero && !isUsedInField
                                        })
                                    } else {
                                        // Position selection
                                        availableForPos = availablePlayers.filter(p => {
                                            const usedInOtherPos = Object.entries(selectedStarters).some(([otherPos, otherId]) => {
                                                return parseInt(otherPos) !== activePosition && otherId === p.id
                                            })
                                            const isLibero = p.role === 'L'
                                            const isSelectedLibero = p.id === selectedLiberoId
                                            return !usedInOtherPos && !isLibero && !isSelectedLibero
                                        })
                                    }

                                    if (availableForPos.length === 0) {
                                        return <div className="p-4 text-center text-xs text-zinc-500 italic">Sin jugadoras disponibles</div>
                                    }

                                    // Sort by role
                                    const roleOrder: Record<string, number> = { 'S': 1, 'OPP': 2, 'OH': 3, 'MB': 4, 'L': 5 }
                                    const sortedPlayers = [...availableForPos].sort((a, b) => {
                                        const roleA = (a.role || '').toUpperCase()
                                        const roleB = (b.role || '').toUpperCase()
                                        const orderA = roleOrder[roleA] || 999
                                        const orderB = roleOrder[roleB] || 999
                                        return orderA - orderB
                                    })

                                    return sortedPlayers.map(p => {
                                        const isCurrentlySelected = activePosition === 999
                                            ? p.id === selectedLiberoId
                                            : p.id === selectedStarters[activePosition]

                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    if (activePosition === 999) {
                                                        onLiberoSelect(p.id === selectedLiberoId ? null : p.id)
                                                    } else {
                                                        onStarterSelect(activePosition, p.id)
                                                    }
                                                    setActivePosition(null)
                                                }}
                                                className={`w-full px-4 py-3 hover:bg-zinc-800 flex items-center justify-center gap-3 border-b border-zinc-800/50 last:border-0 transition-colors ${isCurrentlySelected ? (activePosition === 999 ? 'bg-amber-900/20 text-amber-100' : 'bg-emerald-900/20 text-emerald-100') : 'text-zinc-300'}`}
                                            >
                                                <span className={`font-bold text-xl ${isCurrentlySelected ? (activePosition === 999 ? 'text-amber-400' : 'text-emerald-400') : 'text-zinc-300'}`}>
                                                    {p.number}
                                                </span>
                                                <span className="font-medium text-sm flex-1 text-center">{p.name}</span>
                                                {p.role && p.role.toLowerCase() !== 'starter' && (
                                                    <span className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-bold uppercase ${p.role.toUpperCase() === 'S' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' :
                                                        p.role.toUpperCase() === 'OPP' ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' :
                                                            p.role.toUpperCase() === 'OH' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                                                p.role.toUpperCase() === 'MB' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                                                    p.role.toUpperCase() === 'L' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                                                                        'bg-zinc-700/40 text-zinc-300 border-zinc-600/60'
                                                        }`}>
                                                        {p.role}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={onConfirm}
                    disabled={
                        Object.keys(selectedStarters).length !== 6 ||
                        ((derivedState.currentSet === 1 || derivedState.currentSet === 5) && !initialServerChoice) ||
                        (availablePlayers.some(p => p.role === 'L') && !selectedLiberoId)
                    }
                    className={`w-full h-14 font-bold rounded-xl shadow-lg border-t border-white/10 uppercase tracking-widest text-sm transition-all ${Object.keys(selectedStarters).length === 6 &&
                        ((derivedState.currentSet !== 1 && derivedState.currentSet !== 5) || initialServerChoice) &&
                        (!availablePlayers.some(p => p.role === 'L') || selectedLiberoId)
                        ? 'bg-emerald-600 text-white active:bg-emerald-700'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-transparent'
                        }`}
                >
                    {Object.keys(selectedStarters).length !== 6
                        ? 'FALTAN JUGADORAS'
                        : (availablePlayers.some(p => p.role === 'L') && !selectedLiberoId)
                            ? 'FALTA LÍBERO'
                            : ((derivedState.currentSet === 1 || derivedState.currentSet === 5) && !initialServerChoice)
                                ? 'ELIGE SAQUE'
                                : 'CONFIRMAR TITULARES'}
                </button>
            </div>
        </div>
    )
}
