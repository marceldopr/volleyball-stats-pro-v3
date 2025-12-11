import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
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
                                Nosotros
                            </button>
                            <button
                                type="button"
                                className={`py-2 rounded-lg border text-xs font-bold uppercase transition-all ${initialServerChoice === 'opponent'
                                    ? "bg-rose-600 border-rose-500 text-white shadow-lg ring-1 ring-rose-400/50"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                    }`}
                                onClick={() => onInitialServerChange('opponent')}
                            >
                                {derivedState.ourSide === 'home' ? (awayTeamName || 'Rival') : (homeTeamName || 'Rival')}
                            </button>
                        </div>

                        {/* Instruction text moved here */}
                        <p className="text-zinc-500 text-xs text-center mt-3">Selecciona 6 jugadoras iniciales</p>
                    </div>
                )}

                {/* PISTA VISUAL 3x2 con Selector Inline */}
                <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50 mb-6 relative overflow-visible">
                    {/* Red de Voleibol */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-20 pointer-events-none" />

                    {/* LÍNEA DELANTERA: P4 - P3 - P2 */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {[4, 3, 2].map(pos => {
                            const selectedId = selectedStarters[pos];
                            const display = getPlayerDisplay(selectedId);
                            const isActive = activePosition === pos

                            // Filter logic: Only show players NOT selected elsewhere (or the one currently selected in this pos)
                            // AND EXCLUDE LIBEROS
                            const availableForPos = availablePlayers.filter(p => {
                                const usedInOtherPos = Object.entries(selectedStarters).some(([otherPos, otherId]) => {
                                    return parseInt(otherPos) !== pos && otherId === p.id;
                                });
                                const isLibero = p.role === 'L';
                                const isSelectedLibero = p.id === selectedLiberoId;

                                return !usedInOtherPos && !isLibero && !isSelectedLibero;
                            });

                            return (
                                <div
                                    key={pos}
                                    className="relative group "
                                >
                                    <div
                                        onClick={() => setActivePosition(isActive ? null : pos)}
                                        className={`cursor-pointer aspect-square rounded-full border-2 flex flex-col items-center justify-center transition-all ${isActive
                                            ? 'bg-emerald-900/40 border-emerald-400 ring-2 ring-emerald-500/30 text-emerald-100 scale-105'
                                            : selectedId
                                                ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-100'
                                                : 'bg-zinc-800 border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-800/80'
                                            }`}
                                    >


                                        {selectedId ? (
                                            <>
                                                <span className="text-2xl font-bold">{display.number}</span>
                                                <span className="text-xs truncate max-w-[95%] px-1 opacity-90 leading-tight text-center">{display.name}</span>

                                                {/* Role Badge with color by position */}
                                                {display.role && display.role.toLowerCase() !== 'starter' && (
                                                    <span className={`absolute -bottom-1 right-1 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold uppercase shadow-sm z-10 ${display.role.toUpperCase() === 'S' ? 'bg-blue-900/50 border-blue-500/70 text-blue-100' :
                                                        display.role.toUpperCase() === 'OPP' ? 'bg-red-900/50 border-red-500/70 text-red-100' :
                                                            display.role.toUpperCase() === 'MB' ? 'bg-purple-900/50 border-purple-500/70 text-purple-100' :
                                                                display.role.toUpperCase() === 'OH' ? 'bg-amber-900/50 border-amber-500/70 text-amber-100' :
                                                                    'bg-zinc-800 border-zinc-600 text-zinc-300'
                                                        }`}>
                                                        {display.role}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center opacity-70">
                                                <span className="text-[10px] font-bold text-zinc-500 mb-0.5">P{pos}</span>
                                                <span className="text-xl font-bold text-zinc-600 leading-none">+</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* CENTERED POPUP for Player Selection */}
                                    {isActive && (
                                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                            {/* Backdrop */}
                                            <div
                                                className="absolute inset-0 bg-black/60"
                                                onClick={() => setActivePosition(null)}
                                            />

                                            {/* Popup - Narrower with fully rounded corners */}
                                            <div className="relative w-full max-w-[280px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                                                {/* Header with close button */}
                                                <div className="relative bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-3 text-sm font-bold text-zinc-300 uppercase tracking-wider text-center">
                                                    <span>Seleccionar P{pos}</span>
                                                    <button
                                                        onClick={() => setActivePosition(null)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                                    >
                                                        <span className="text-lg font-bold">×</span>
                                                    </button>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto scrollbar-hide">
                                                    {availableForPos.length === 0 ? (
                                                        <div className="p-4 text-center text-xs text-zinc-500 italic">Sin jugadoras disponibles</div>
                                                    ) : (
                                                        (() => {
                                                            // Sort players by role: S, OPP, OH, MB
                                                            const roleOrder: Record<string, number> = { 'S': 1, 'OPP': 2, 'OH': 3, 'MB': 4 };
                                                            const sortedPlayers = [...availableForPos].sort((a, b) => {
                                                                const roleA = (a.role || '').toUpperCase();
                                                                const roleB = (b.role || '').toUpperCase();
                                                                const orderA = roleOrder[roleA] || 999;
                                                                const orderB = roleOrder[roleB] || 999;
                                                                return orderA - orderB;
                                                            });

                                                            return sortedPlayers.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => {
                                                                        onStarterSelect(pos, p.id);
                                                                        setActivePosition(null);
                                                                    }}
                                                                    className={`w-full px-4 py-3 hover:bg-zinc-800 flex items-center justify-center gap-3 border-b border-zinc-800/50 last:border-0 transition-colors ${selectedId === p.id ? 'bg-emerald-900/20 text-emerald-100' : 'text-zinc-300'
                                                                        }`}
                                                                >
                                                                    <span className={`font-bold text-xl ${selectedId === p.id ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                                        {p.number}
                                                                    </span>
                                                                    <span className="font-medium text-sm flex-1 text-center">{p.name}</span>
                                                                    {p.role && p.role.toLowerCase() !== 'starter' && (
                                                                        <span className={`flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-[9px] font-bold uppercase ${p.role.toUpperCase() === 'S' ? 'bg-blue-900/40 border-blue-500/60 text-blue-200' :
                                                                            p.role.toUpperCase() === 'OPP' ? 'bg-red-900/40 border-red-500/60 text-red-200' :
                                                                                p.role.toUpperCase() === 'MB' ? 'bg-purple-900/40 border-purple-500/60 text-purple-200' :
                                                                                    p.role.toUpperCase() === 'OH' ? 'bg-amber-900/40 border-amber-500/60 text-amber-200' :
                                                                                        'bg-zinc-800 border-zinc-600 text-zinc-300'
                                                                            }`}>
                                                                            {p.role}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            ));
                                                        })()
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* LÍNEA ZAGUERA: P5 - P6 - P1 */}
                    <div className="grid grid-cols-3 gap-3">
                        {[5, 6, 1].map(pos => {
                            const selectedId = selectedStarters[pos];
                            const display = getPlayerDisplay(selectedId);
                            const isActive = activePosition === pos;

                            // Filter logic: Only show players NOT selected elsewhere (or the one currently selected in this pos)
                            // AND EXCLUDE LIBEROS
                            const availableForPos = availablePlayers.filter(p => {
                                const usedInOtherPos = Object.entries(selectedStarters).some(([otherPos, otherId]) => {
                                    return parseInt(otherPos) !== pos && otherId === p.id;
                                });
                                const isLibero = p.role === 'L';
                                const isSelectedLibero = p.id === selectedLiberoId;

                                return !usedInOtherPos && !isLibero && !isSelectedLibero;
                            });

                            return (
                                <div
                                    key={pos}
                                    className="relative group"
                                >
                                    <div
                                        onClick={() => setActivePosition(isActive ? null : pos)}
                                        className={`cursor-pointer aspect-square rounded-full border-2 flex flex-col items-center justify-center transition-all ${isActive
                                            ? 'bg-emerald-900/40 border-emerald-400 ring-2 ring-emerald-500/30 text-emerald-100 scale-105'
                                            : selectedId
                                                ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-100'
                                                : 'bg-zinc-800 border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-800/80'
                                            }`}
                                    >


                                        {selectedId ? (
                                            <>
                                                <span className="text-2xl font-bold">{display.number}</span>
                                                <span className="text-xs truncate max-w-[95%] px-1 opacity-90 leading-tight text-center">{display.name}</span>

                                                {/* Role Badge with color by position */}
                                                {display.role && display.role.toLowerCase() !== 'starter' && (
                                                    <span className={`absolute -bottom-1 right-1 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold uppercase shadow-sm z-10 ${display.role.toUpperCase() === 'S' ? 'bg-blue-900/50 border-blue-500/70 text-blue-100' :
                                                        display.role.toUpperCase() === 'OPP' ? 'bg-red-900/50 border-red-500/70 text-red-100' :
                                                            display.role.toUpperCase() === 'MB' ? 'bg-purple-900/50 border-purple-500/70 text-purple-100' :
                                                                display.role.toUpperCase() === 'OH' ? 'bg-amber-900/50 border-amber-500/70 text-amber-100' :
                                                                    'bg-zinc-800 border-zinc-600 text-zinc-300'
                                                        }`}>
                                                        {display.role}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center opacity-70">
                                                <span className="text-[10px] font-bold text-zinc-500 mb-0.5">P{pos}</span>
                                                <span className="text-xl font-bold text-zinc-600 leading-none">+</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* CENTERED POPUP for Player Selection */}
                                    {isActive && (
                                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                            {/* Backdrop */}
                                            <div
                                                className="absolute inset-0 bg-black/60"
                                                onClick={() => setActivePosition(null)}
                                            />

                                            {/* Popup - Narrower with fully rounded corners */}
                                            <div className="relative w-full max-w-[280px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                                                {/* Header with close button */}
                                                <div className="relative bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-3 text-sm font-bold text-zinc-300 uppercase tracking-wider text-center">
                                                    <span>Seleccionar P{pos}</span>
                                                    <button
                                                        onClick={() => setActivePosition(null)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                                    >
                                                        <span className="text-lg font-bold">×</span>
                                                    </button>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto scrollbar-hide">
                                                    {availableForPos.length === 0 ? (
                                                        <div className="p-4 text-center text-xs text-zinc-500 italic">Sin jugadoras disponibles</div>
                                                    ) : (
                                                        (() => {
                                                            // Sort players by role: S, OPP, MB, OH
                                                            const roleOrder: Record<string, number> = { 'S': 1, 'OPP': 2, 'MB': 3, 'OH': 4 };
                                                            const sortedPlayers = [...availableForPos].sort((a, b) => {
                                                                const roleA = (a.role || '').toUpperCase();
                                                                const roleB = (b.role || '').toUpperCase();
                                                                const orderA = roleOrder[roleA] || 999;
                                                                const orderB = roleOrder[roleB] || 999;
                                                                return orderA - orderB;
                                                            });

                                                            return sortedPlayers.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => {
                                                                        onStarterSelect(pos, p.id);
                                                                        setActivePosition(null);
                                                                    }}
                                                                    className={`w-full px-4 py-3 hover:bg-zinc-800 flex items-center justify-center gap-3 border-b border-zinc-800/50 last:border-0 transition-colors ${selectedId === p.id ? 'bg-emerald-900/20 text-emerald-100' : 'text-zinc-300'
                                                                        }`}
                                                                >
                                                                    <span className={`font-bold text-xl ${selectedId === p.id ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                                        {p.number}
                                                                    </span>
                                                                    <span className="font-medium text-sm flex-1 text-center">{p.name}</span>
                                                                    {p.role && p.role.toLowerCase() !== 'starter' && (
                                                                        <span className={`flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-[9px] font-bold uppercase ${p.role.toUpperCase() === 'S' ? 'bg-blue-900/40 border-blue-500/60 text-blue-200' :
                                                                            p.role.toUpperCase() === 'OPP' ? 'bg-red-900/40 border-red-500/60 text-red-200' :
                                                                                p.role.toUpperCase() === 'MB' ? 'bg-purple-900/40 border-purple-500/60 text-purple-200' :
                                                                                    p.role.toUpperCase() === 'OH' ? 'bg-amber-900/40 border-amber-500/60 text-amber-200' :
                                                                                        'bg-zinc-800 border-zinc-600 text-zinc-300'
                                                                            }`}>
                                                                            {p.role}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            ));
                                                        })()
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-4 flex flex-col items-center justify-center">
                        <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2 tracking-widest">LÍBERO</div>
                        <div className="relative group">
                            <div
                                onClick={() => setActivePosition(activePosition === 999 ? null : 999)}
                                className={`cursor-pointer w-16 h-16 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all ${activePosition === 999
                                    ? 'bg-amber-900/40 border-amber-500/50 ring-2 ring-amber-500/30 text-amber-100 scale-105'
                                    : selectedLiberoId
                                        ? 'bg-amber-900/20 border-amber-500/50 text-amber-100 border-solid'
                                        : 'bg-zinc-800 border-zinc-600 text-zinc-500 hover:border-zinc-500 hover:bg-zinc-800/80'
                                    }`}
                            >
                                {selectedLiberoId ? (() => {
                                    const disp = getPlayerDisplay(selectedLiberoId);
                                    return (
                                        <>
                                            <span className="text-xl font-bold">{disp.number}</span>
                                            <span className="text-[9px] truncate max-w-[90%] px-1 opacity-90 leading-tight text-center">{disp.name}</span>
                                            <span className="absolute -bottom-1 right-0 rounded-full bg-zinc-900 px-1.5 py-[1px] text-[8px] font-bold text-amber-500 border border-zinc-700 shadow-sm z-10">L</span>
                                        </>
                                    );
                                })() : (
                                    <span className="text-xl font-bold text-zinc-600">+</span>
                                )}
                            </div>

                            {/* LIBERO SELECTOR POPUP - Centered with consistent design */}
                            {activePosition === 999 && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                    {/* Backdrop */}
                                    <div
                                        className="absolute inset-0 bg-black/60"
                                        onClick={() => setActivePosition(null)}
                                    />

                                    {/* Popup */}
                                    <div className="relative w-full max-w-[280px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                                        {/* Header with close button */}
                                        <div className="relative bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-3 text-sm font-bold text-amber-400 uppercase tracking-wider text-center">
                                            <span>Seleccionar Líbero</span>
                                            <button
                                                onClick={() => setActivePosition(null)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                            >
                                                <span className="text-lg font-bold">×</span>
                                            </button>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto scrollbar-hide">
                                            {(() => {
                                                const availableForLibero = availablePlayers.filter(p => {
                                                    const isLibero = p.role === 'L';
                                                    const isUsedInField = Object.values(selectedStarters).includes(p.id);
                                                    return isLibero && !isUsedInField;
                                                });

                                                if (availableForLibero.length === 0) {
                                                    return <div className="p-4 text-center text-xs text-zinc-500 italic">Sin líberos disponibles</div>
                                                }

                                                return availableForLibero.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => {
                                                            onLiberoSelect(p.id === selectedLiberoId ? null : p.id);
                                                            setActivePosition(null);
                                                        }}
                                                        className={`w-full px-4 py-3 hover:bg-zinc-800 flex items-center justify-center gap-3 border-b border-zinc-800/50 last:border-0 transition-colors ${selectedLiberoId === p.id ? 'bg-amber-900/20 text-amber-100' : 'text-zinc-300'}`}
                                                    >
                                                        <span className={`font-bold text-xl ${selectedLiberoId === p.id ? 'text-amber-400' : 'text-zinc-300'}`}>{p.number}</span>
                                                        <span className="font-medium text-sm flex-1 text-center">{p.name}</span>
                                                        <span className="flex-shrink-0 w-9 h-9 rounded-full border-2 bg-amber-900/40 border-amber-500/60 text-amber-200 flex items-center justify-center text-[9px] font-bold uppercase">L</span>
                                                    </button>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
        </div >
    )
}
