import { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Shield } from 'lucide-react';
import { Match, MatchPlayer } from '../stores/matchStore';
import { LineupGrid } from './LineupGrid';
import { PlayerCard } from './PlayerCard';

interface SubstitutionPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (playerOutId: string, playerInId: string, note?: string) => void;
    onDesignateLibero?: (playerId: string) => void;
    match: Match;
    currentRotationOrder: string[];
}

export function SubstitutionPopup({
    isOpen,
    onClose,
    onConfirm,
    onDesignateLibero,
    match,
    currentRotationOrder,
}: SubstitutionPopupProps) {
    const [selectedPlayerOut, setSelectedPlayerOut] = useState('');
    const [selectedPlayerIn, setSelectedPlayerIn] = useState('');
    const [note, setNote] = useState('');
    const [viewMode, setViewMode] = useState<'field' | 'libero'>('field');
    const [improvisedLiberoCandidate, setImprovisedLiberoCandidate] = useState('');

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setSelectedPlayerOut('');
            setSelectedPlayerIn('');
            setNote('');
            setViewMode('field');
            setImprovisedLiberoCandidate('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentSet = match.currentSet;
    const substitutionPairs = match.substitutionPairs?.[currentSet] || {};

    // Players currently on court (may contain null for empty positions)
    const playersOnCourt = currentRotationOrder.map(id =>
        id ? match.players.find(p => p.playerId === id) ?? null : null
    );
    const playersOnCourtIds = currentRotationOrder.filter((id): id is string => !!id);

    // Libero handling
    const storedLiberoId = match.liberoOnCourtBySet?.[currentSet];
    let liberoOnCourt: MatchPlayer | null = null;
    if (storedLiberoId) {
        const stored = match.players.find(p => p.playerId === storedLiberoId);
        if (stored) liberoOnCourt = stored;
    }
    if (!liberoOnCourt && match.startingLineup?.libero) {
        const starter = match.players.find(p => p.playerId === match.startingLineup?.libero);
        if (starter) liberoOnCourt = starter;
    }

    // Filter bench players
    const playersOnBench = match.players.filter(p =>
        !playersOnCourtIds.includes(p.playerId) &&
        p.playerId !== liberoOnCourt?.playerId
    );

    // All field players (for improvised libero selection) - excluding current liberos
    const fieldPlayers = match.players.filter(p => p.position !== 'L');

    // --- LOGIC FOR FIELD PLAYERS (PAIRS) ---

    const isPlayerOutEligible = (player: MatchPlayer) => {
        // If Libero Override is active, official liberos are blocked
        if (player.position === 'L' && match.liberoOverrideActive) return false;

        // Liberos handled separately
        if (player.position === 'L') return false;

        const pair = substitutionPairs[player.playerId];

        // If pair exists and cycle is closed (2 uses), not eligible
        if (pair && pair.usos >= pair.maxUsos) return false;

        // If pair exists and uses < max, eligible (will be filtered for partner in In selection)
        return true;
    };

    const isPlayerInEligible = (player: MatchPlayer, outId: string) => {
        if (!outId) return true; // If no player out selected, show all potential (visual only)

        const outPlayer = match.players.find(p => p.playerId === outId);
        if (!outPlayer) return true;

        // Basic position check (optional, but good practice, though rules allow position changes)
        // Strict rule: Libero can only sub Libero (handled in Libero mode)
        if (player.position === 'L') return false;

        const pairOut = substitutionPairs[outId];
        const pairIn = substitutionPairs[player.playerId];

        // Case 1: Player Out has a pair
        if (pairOut) {
            // MUST sub with partner
            return pairOut.partnerId === player.playerId;
        }

        // Case 2: Player In has a pair
        if (pairIn) {
            // MUST sub with partner (which should be Player Out)
            return pairIn.partnerId === outId;
        }

        // Case 3: Neither has a pair -> New pair creation
        // Both must be free of pairs
        return true;
    };

    // --- LOGIC FOR LIBEROS ---

    const liberos = match.players.filter(p => p.position === 'L');
    // If override is active, official liberos are NOT available
    const availableLiberos = match.liberoOverrideActive
        ? []
        : liberos.filter(l => l.playerId !== liberoOnCourt?.playerId);

    const handleConfirm = () => {
        if (selectedPlayerOut && selectedPlayerIn) {
            onConfirm(selectedPlayerOut, selectedPlayerIn, note);
        }
    };

    const handleDesignateLibero = () => {
        if (improvisedLiberoCandidate && onDesignateLibero) {
            if (window.confirm("¿Estás seguro de designar a esta jugadora de campo como Líbero Improvisado? Esto bloqueará a los líberos oficiales por el resto del PARTIDO.")) {
                onDesignateLibero(improvisedLiberoCandidate);
                setImprovisedLiberoCandidate('');
            }
        }
    }

    // Render bench player card
    const renderBenchCard = (player: MatchPlayer) => {
        const eligible = isPlayerInEligible(player, selectedPlayerOut);
        return (
            <PlayerCard
                key={player.playerId}
                player={{
                    id: player.playerId,
                    number: player.number,
                    name: player.name,
                    position: player.position,
                }}
                size="medium"
                isDisabled={!eligible}
                isSelected={selectedPlayerIn === player.playerId}
                onClick={eligible ? () => setSelectedPlayerIn(player.playerId) : undefined}
            />
        );
    };

    // Render court player card
    const handleCourtClick = (playerId: string) => {
        const player = match.players.find(p => p.playerId === playerId);
        if (player) {
            if (player.position === 'L') {
                // Switch to Libero mode if clicked on Libero
                setViewMode('libero');
                return;
            }

            if (isPlayerOutEligible(player)) {
                setSelectedPlayerOut(playerId);
                setSelectedPlayerIn('');
                setViewMode('field');
            }
        }
    };

    // Prepare data for LineupGrid
    const lineupPlayers = currentRotationOrder.map((pid, idx) => {
        const p = match.players.find(pl => pl.playerId === pid);
        return {
            id: pid || '',
            number: p?.number || 0,
            name: p?.name || '',
            position: p?.position || '',
            isLibero: p?.position === 'L',
            courtPosition: idx + 1,
        };
    });

    // Get active pairs for display
    const activePairs = Object.entries(substitutionPairs).reduce((acc, [playerId, data]) => {
        // Avoid duplicates (A-B and B-A), only take one
        if (!acc.find(p => p.p1 === data.partnerId && p.p2 === playerId)) {
            acc.push({ p1: playerId, p2: data.partnerId, uses: data.usos, max: data.maxUsos });
        }
        return acc;
    }, [] as { p1: string, p2: string, uses: number, max: number }[]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <div>
                        <h3 className="text-lg font-semibold">Sustitución - Set {currentSet}</h3>
                        <p className="text-xs text-gray-500">Selecciona una jugadora de campo para sustituir</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* LEFT COLUMN: Court & Active Pairs */}
                    <div className="w-full md:w-1/2 p-4 border-r border-gray-200 overflow-y-auto">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">En Pista</h4>
                        <div className="border border-gray-200 rounded p-2 mb-4 bg-gray-50">
                            <LineupGrid
                                players={lineupPlayers}
                                onPlayerClick={handleCourtClick}
                                highlightedPlayerId={selectedPlayerOut}
                                disabledPlayerIds={playersOnCourt
                                    .filter(p => p && !isPlayerOutEligible(p))
                                    .map(p => p!.playerId)}
                            />
                        </div>

                        {/* Active Pairs List */}
                        <div className="mt-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <ArrowRightLeft className="w-4 h-4 mr-1" />
                                Parejas Activas
                            </h4>
                            {activePairs.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No hay sustituciones en este set.</p>
                            ) : (
                                <div className="space-y-2">
                                    {activePairs.map((pair, idx) => {
                                        const p1 = match.players.find(p => p.playerId === pair.p1);
                                        const p2 = match.players.find(p => p.playerId === pair.p2);
                                        const isClosed = pair.uses >= pair.max;
                                        return (
                                            <div key={idx} className={`flex items-center justify-between p-2 rounded border ${isClosed ? 'bg-gray-100 border-gray-200 opacity-75' : 'bg-blue-50 border-blue-200'}`}>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-bold">#{p1?.number}</span>
                                                    <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                                                    <span className="font-bold">#{p2?.number}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isClosed ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                                                        {isClosed ? 'Cerrado' : `${pair.uses}/${pair.max}`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Bench & Actions */}
                    <div className="w-full md:w-1/2 p-4 overflow-y-auto flex flex-col">
                        {/* Mode Switcher (Tabs) */}
                        <div className="flex border-b border-gray-200 mb-4">
                            <button
                                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'field' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => { setViewMode('field'); setSelectedPlayerOut(''); setSelectedPlayerIn(''); }}
                            >
                                Jugadoras de Campo
                            </button>
                            <button
                                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'libero' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => { setViewMode('libero'); setSelectedPlayerOut(''); setSelectedPlayerIn(''); }}
                            >
                                Líberos
                            </button>
                        </div>

                        {viewMode === 'field' ? (
                            <>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Banquillo (Elegibles)</h4>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {playersOnBench.filter(p => p.position !== 'L').map(renderBenchCard)}
                                </div>
                                {playersOnBench.filter(p => p.position !== 'L').length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">No hay jugadoras disponibles en el banquillo.</p>
                                )}
                            </>
                        ) : (
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                                    <Shield className="w-4 h-4 mr-1" />
                                    Gestión de Líberos
                                </h4>
                                <p className="text-xs text-yellow-700 mb-4">
                                    Los líberos tienen cambios ilimitados y no cuentan para las sustituciones normales.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-600 mb-2">Líbero en pista:</p>
                                        {liberoOnCourt ? (
                                            <div className="flex justify-center">
                                                <PlayerCard
                                                    player={{ id: liberoOnCourt.playerId, number: liberoOnCourt.number, name: liberoOnCourt.name, position: 'L' }}
                                                    size="medium"
                                                    isDisabled={true} // Can't select as "In", only "Out" contextually
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center italic">No hay líbero en pista</p>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-gray-600 mb-2">Líberos disponibles:</p>
                                        {match.liberoOverrideActive ? (
                                            <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
                                                <p className="text-xs text-red-600 font-medium">
                                                    Líberos oficiales deshabilitados por uso de Líbero Improvisado.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex gap-3 justify-center">
                                                {availableLiberos.map(l => (
                                                    <PlayerCard
                                                        key={l.playerId}
                                                        player={{ id: l.playerId, number: l.number, name: l.name, position: 'L' }}
                                                        size="medium"
                                                        isSelected={selectedPlayerIn === l.playerId}
                                                        onClick={() => {
                                                            if (liberoOnCourt) {
                                                                setSelectedPlayerOut(liberoOnCourt.playerId);
                                                                setSelectedPlayerIn(l.playerId);
                                                            }
                                                        }}
                                                    />
                                                ))}
                                                {availableLiberos.length === 0 && (
                                                    <p className="text-sm text-gray-400 italic">No hay líberos en el banquillo</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Improvised Libero Section */}
                                    {!match.liberoOverrideActive && onDesignateLibero && (
                                        <div className="mt-4 pt-4 border-t border-yellow-200">
                                            <h5 className="text-xs font-bold text-yellow-800 mb-2">Usar jugadora de campo como líbero</h5>
                                            <div className="flex gap-2">
                                                <select
                                                    className="flex-1 text-xs border border-yellow-300 rounded px-2 py-1 bg-white"
                                                    value={improvisedLiberoCandidate}
                                                    onChange={(e) => setImprovisedLiberoCandidate(e.target.value)}
                                                >
                                                    <option value="">Seleccionar jugadora...</option>
                                                    {fieldPlayers.map(p => (
                                                        <option key={p.playerId} value={p.playerId}>
                                                            #{p.number} {p.name} ({p.position})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleDesignateLibero}
                                                    disabled={!improvisedLiberoCandidate}
                                                    className="px-3 py-1 bg-yellow-600 text-white text-xs rounded font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Usar como líbero
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-yellow-700 mt-1">
                                                ⚠️ Si usas una jugadora de campo como líbero, los líberos oficiales quedarán deshabilitados para el resto del partido.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Note Input */}
                        <div className="mt-auto pt-4">
                            <label className="block text-sm font-medium text-gray-600 mb-1" htmlFor="note">
                                Nota (opcional)
                            </label>
                            <input
                                id="note"
                                type="text"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Ej. Cambio táctico"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 mt-4">
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedPlayerOut || !selectedPlayerIn}
                                    className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50 font-medium shadow-sm"
                                >
                                    Confirmar Cambio
                                </button>
                                <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
