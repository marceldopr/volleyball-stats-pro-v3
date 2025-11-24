import { useState, useEffect } from 'react'
import { Undo2, Trophy, ArrowRightLeft, Zap, Hand, AlertTriangle, Target, Ban, TrendingDown, X, Users } from 'lucide-react'
import { Match, Equipo } from '../stores/matchStore'
import { useMatchStore } from '../stores/matchStore'
import { StartersManagement } from './StartersManagement'
import { PlayerSelectionPopup } from './PlayerSelectionPopup'
import { ReceptionPopup } from './ReceptionPopup'
import { SubstitutionPopup } from './SubstitutionPopup'
import { LineupGrid } from './LineupGrid'
import { matchStatsService } from '../services/matchStatsService'


interface ActionHistory {
  id: string
  action: string
  pointFor: 'myTeam' | 'opponent'
  equipoAccion: 'local' | 'visitante'
  equipoAnota: 'local' | 'visitante'
  previousScore: { home: number; away: number }
  previousServeState: 'myTeamServing' | 'myTeamReceiving'
  previousRotation?: number
  timestamp: number
}

interface LiveMatchScoutingProps {
  match: Match
  onUpdateMatch: (id: string, updates: Partial<Match>) => void
  onNavigateToMatches: () => void
  onNavigateToWizardStep?: (step: number) => void
  teamName?: string
}

export function LiveMatchScouting({ match, onUpdateMatch, onNavigateToMatches, onNavigateToWizardStep, teamName }: LiveMatchScoutingProps) {
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [estadoSaque, setEstadoSaque] = useState<'myTeamServing' | 'myTeamReceiving' | null>(null)
  const [rotation, setRotation] = useState(1)
  const [actionHistory, setActionHistory] = useState<ActionHistory[]>([])
  const [redoHistory, setRedoHistory] = useState<ActionHistory[]>([])
  const [currentRotationOrder, setCurrentRotationOrder] = useState<string[]>([])
  const [displayRotationOrder, setDisplayRotationOrder] = useState<string[]>([])
  const [showSetCompleteModal, setShowSetCompleteModal] = useState(false)
  const [showMatchCompleteModal, setShowMatchCompleteModal] = useState(false)
  // Auto-open starters modal if no lineup is set for set 1
  const [showStartersModal, setShowStartersModal] = useState(!match.startingLineup && match.currentSet === 1)
  const [pendingSetCompletion, setPendingSetCompletion] = useState<{
    setNumber: number
    homeScore: number
    awayScore: number
    winner: 'local' | 'visitor'
  } | null>(null)
  // NUEVO: Estado para el popup de selecciÃ³n de jugadora
  const [showPlayerSelection, setShowPlayerSelection] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    action: string
    pointFor: 'myTeam' | 'opponent'
    changeServeState?: boolean
    isServeAction?: boolean
  } | null>(null)
  // NUEVO: Estado para el popup de recepciÃ³n
  const [showReceptionPopup, setShowReceptionPopup] = useState(false)
  // NUEVO: Bandera para controlar si ya se ha registrado recepciÃ³n en este rally
  const [hasReceptionThisRally, setHasReceptionThisRally] = useState(false)
  // NUEVO: Estado para tracking del estado de saque anterior
  const [previousServeState, setPreviousServeState] = useState<'myTeamServing' | 'myTeamReceiving' | null>(null)
  // NUEVO: Bandera para saltar el siguiente popup de recepciÃ³n despuÃ©s de deshacer
  const [skipNextReceptionPopup, setSkipNextReceptionPopup] = useState(false)
  // NUEVO: Estado para controlar si debe mostrarse el popup de recepciÃ³n inicial
  const [shouldShowInitialReceptionPopup, setShouldShowInitialReceptionPopup] = useState(false)
  // NUEVO: Estado para controlar si venimos del popup de recepciÃ³n
  const [cameFromReception, setCameFromReception] = useState(false)
  // NUEVO: Estado para panel de debug

  // NUEVO: Estado para el popup de sustituciÃ³n
  const [showSubstitutionPopup, setShowSubstitutionPopup] = useState(false)

  // NUEVO: Efecto Ãºnico y simplificado para controlar el popup de recepciÃ³n
  useEffect(() => {
    // Controlar cuando necesitamos recepciÃ³n
    if (
      !showSetCompleteModal && !pendingSetCompletion &&
      estadoSaque === 'myTeamReceiving' &&
      !hasReceptionThisRally &&
      !shouldShowInitialReceptionPopup
    ) {
      setShouldShowInitialReceptionPopup(true)
    } else if (estadoSaque === 'myTeamServing' && shouldShowInitialReceptionPopup) {
      // Invariante: si mi equipo estÃ¡ sacando, el popup debe estar cerrado y flags reseteadas
      setShouldShowInitialReceptionPopup(false)
      if (showReceptionPopup) setShowReceptionPopup(false)
      if (hasReceptionThisRally) setHasReceptionThisRally(false)
    }

    // Reset hasReceptionThisRally cuando cambia el estado de saque (nuevo rally)
    if (estadoSaque !== previousServeState) {
      setHasReceptionThisRally(false)

      // Si pasamos de sacar a recibir, necesitaremos recepciÃ³n
      if (
        !showSetCompleteModal && !pendingSetCompletion &&
        previousServeState === 'myTeamServing' && estadoSaque === 'myTeamReceiving'
      ) {
        setShouldShowInitialReceptionPopup(true)
      }
      // Si pasamos de recibir a sacar, no necesitamos recepciÃ³n
      else if (previousServeState === 'myTeamReceiving' && estadoSaque === 'myTeamServing') {
        // Invariante: cerramos y reseteamos cuando pasamos a sacar
        setShouldShowInitialReceptionPopup(false)
        if (showReceptionPopup) setShowReceptionPopup(false)
        if (hasReceptionThisRally) setHasReceptionThisRally(false)
      }

      setPreviousServeState(estadoSaque)
    }

    // Mostrar popup de recepciÃ³n cuando sea necesario
    if (
      !showSetCompleteModal && !pendingSetCompletion &&
      shouldShowInitialReceptionPopup &&
      estadoSaque === 'myTeamReceiving' &&
      !showReceptionPopup &&
      !showPlayerSelection &&
      !showStartersModal &&
      !hasReceptionThisRally
    ) {

      setShowReceptionPopup(true)
    }

    // SincronizaciÃ³n: si no debe mostrarse, asegurar que el popup estÃ© cerrado
    if (!shouldShowInitialReceptionPopup && showReceptionPopup) {
      setShowReceptionPopup(false)
    }

    // Reset del flag skip despuÃ©s de un ciclo
    if (skipNextReceptionPopup) {
      const timer = setTimeout(() => {
        setSkipNextReceptionPopup(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [estadoSaque, hasReceptionThisRally, showReceptionPopup, showPlayerSelection, showStartersModal, shouldShowInitialReceptionPopup, skipNextReceptionPopup, previousServeState])

  // NUEVO: Reset hasReceptionThisRally when serve state changes (new rally starts)
  useEffect(() => {
    // Solo resetear hasReceptionThisRally si realmente cambiÃ³ el estado de saque
    if (estadoSaque !== previousServeState) {
      setHasReceptionThisRally(false)
      setPreviousServeState(estadoSaque)
    }
  }, [estadoSaque, previousServeState])

  // NUEVO: FunciÃ³n para manejar el deshacer desde el popup de recepciÃ³n
  const handleReceptionUndo = () => {
    // Ejecutar la lÃ³gica de deshacer
    handleUndo()

    // Cerrar el popup y resetear flags
    setShowReceptionPopup(false)
    setShouldShowInitialReceptionPopup(false)
    setHasReceptionThisRally(false)
  }

  // NUEVO: FunciÃ³n para obtener datos de debug
  const getDebugData = () => {
    // Reglas estrictas: miEquipo es fijo, el otro equipo es siempre el contrario
    const miEquipo = match.teamSide // 'local' o 'visitante', se fija al inicio del partido
    const equipoContrario = miEquipo === 'local' ? 'visitante' : 'local'

    const equipoQueSacaActualmente = estadoSaque === 'myTeamServing'
      ? miEquipo
      : equipoContrario

    const ultimas5Acciones = actionHistory.slice(-5).map(accion => ({
      idAccion: accion.id,
      tipoAccion: accion.action,
      equipoAccion: accion.equipoAccion,
      equipoAnota: accion.equipoAnota,
      jugadoraId: null, // No tenemos jugadoraId en actionHistory actualmente
      set: match.currentSet,
      marcadorTrasAccion: `${accion.previousScore.home}-${accion.previousScore.away}`
    }))

    return {
      setActual: match.currentSet,
      marcador: `${homeScore}-${awayScore}`,
      puntosLocal: homeScore,
      puntosVisitante: awayScore,
      equipoQueSacaActualmente,
      miEquipo: match.teamSide,
      modoMiEquipoSacando: estadoSaque === 'myTeamServing',
      modoMiEquipoRecibiendo: estadoSaque === 'myTeamReceiving',
      debeMostrarPopupRecepcionInicial: shouldShowInitialReceptionPopup,
      popupRecepcionAbierto: showReceptionPopup,
      puedeDeshacer: actionHistory.length > 0,
      historialAccionesLength: actionHistory.length,
      stackDeshacerLength: actionHistory.length, // Usamos actionHistory como stack
      puedeRehacer: redoHistory.length > 0,
      historialRehacerLength: redoHistory.length,
      ultimas5Acciones
    }
  }

  // NUEVO: FunciÃ³n para logging de deshacer
  const logUndoAction = (tipo: 'antes' | 'despues') => {
    const debugData = getDebugData()
    console.log(`=== DEBUG DESHACER - ${tipo.toUpperCase()} ===`)
    console.log('Marcador:', debugData.marcador)
    console.log('Set actual:', debugData.setActual)
    console.log('Ãšltimas 3 acciones:', debugData.ultimas5Acciones.slice(-3))
    console.log('Stack deshacer length:', debugData.stackDeshacerLength)
    console.log('Puede rehacer:', debugData.puedeRehacer)
    console.log('Historial rehacer length:', debugData.historialRehacerLength)
    console.log('Modo mi equipo sacando:', debugData.modoMiEquipoSacando)
    console.log('Modo mi equipo recibiendo:', debugData.modoMiEquipoRecibiendo)
    console.log('Debe mostrar popup recepciÃ³n inicial:', debugData.debeMostrarPopupRecepcionInicial)
    console.log('Popup recepciÃ³n abierto:', debugData.popupRecepcionAbierto)
    console.log('Puede deshacer:', debugData.puedeDeshacer)
    console.log('========================================')
  }

  // NUEVO: FunciÃ³n helper para obtener descripciÃ³n de la Ãºltima acciÃ³n
  const getLastActionDescription = (): string | null => {
    if (!match.timeline || match.timeline.length === 0) return null

    // Buscar el Ãºltimo evento del set actual
    const lastEventIndex = [...match.timeline].reverse().findIndex(
      e => (e.type === 'rally' || e.type === 'substitution') && e.set === match.currentSet
    )

    if (lastEventIndex === -1) return null

    const absoluteIndex = match.timeline.length - 1 - lastEventIndex
    const lastEvent = match.timeline[absoluteIndex]

    // Manejar sustituciones
    if (lastEvent.type === 'substitution' && lastEvent.substitution) {
      const playerOut = match.players.find(p => p.playerId === lastEvent.substitution!.playerOutId)
      const playerIn = match.players.find(p => p.playerId === lastEvent.substitution!.playerInId)

      if (playerOut && playerIn) {
        return `SustituciÃ³n: #${playerOut.number} ${playerOut.name.split(' ')[0]} â†” #${playerIn.number} ${playerIn.name.split(' ')[0]}`
      }
      return 'SustituciÃ³n'
    }

    // Manejar rallies (puntos y errores)
    if (lastEvent.type === 'rally' && lastEvent.rally) {
      const rally = lastEvent.rally
      const player = rally.jugadoraId ? match.players.find(p => p.playerId === rally.jugadoraId) : null
      const playerInfo = player ? `#${player.number} ${player.name.split(' ')[0]}` : ''

      // Mapeo de tipos de acciÃ³n a descripciones legibles
      const actionDescriptions: Record<string, string> = {
        'punto_saque': `Punto SAQUE ${playerInfo}`,
        'error_saque': `Error SAQUE ${playerInfo}`,
        'punto_ataque': `Punto ATA ${playerInfo}`,
        'error_ataque': `Error ATA ${playerInfo}`,
        'ataque_bloqueado': `Ataque bloqueado ${playerInfo}`,
        'punto_bloqueo': `Punto BLQ ${playerInfo}`,
        'error_bloqueo': `Error BLQ ${playerInfo}`,
        'error_recepcion': `Error REC ${playerInfo}`,
        'recepcion': `RecepciÃ³n ${playerInfo}`,
        'error_generico': 'Error propio',
        'error_rival': 'Error rival',
        'punto_rival': 'Punto rival'
      }

      return actionDescriptions[rally.tipo] || rally.tipo
    }

    return null
  }

  const myTeamSide = match.teamSide
  const isHomeTeam = myTeamSide === 'local'

  // Set ending logic
  const shouldEndSet = (setNumber: number, homeScore: number, awayScore: number): boolean => {
    const targetScore = setNumber === 5 ? 15 : 25
    const maxScore = Math.max(homeScore, awayScore)
    const diff = Math.abs(homeScore - awayScore)
    return maxScore >= targetScore && diff >= 2
  }

  const getSetWinner = (homeScore: number, awayScore: number): 'local' | 'visitor' => {
    return homeScore > awayScore ? 'local' : 'visitor'
  }

  const obtenerSacadorInicialSet = (setNumber: number, sacadorInicialSet1: 'local' | 'visitor' | null): 'local' | 'visitor' | null => {
    if (!sacadorInicialSet1) return null
    if (setNumber === 1) return sacadorInicialSet1
    if (setNumber === 2) return sacadorInicialSet1 === 'local' ? 'visitor' : 'local'
    if (setNumber === 3) return sacadorInicialSet1
    if (setNumber === 4) return sacadorInicialSet1 === 'local' ? 'visitor' : 'local'
    return null // Set 5 requires new selection
  }

  // Calculate display rotation with libero substitution rules
  const calculateDisplayRotation = (baseRotation: string[], liberoId: string | null, isServing: boolean): string[] => {
    // If no libero, return base rotation unchanged
    if (!liberoId) {
      return [...baseRotation]
    }

    const displayRotation = [...baseRotation]

    // Back row positions: 5, 6, 1 (in volleyball court layout)
    const backRowPositions = [4, 5, 0] // Array indices for positions 5, 6, 1

    backRowPositions.forEach(arrayIndex => {
      const playerId = baseRotation[arrayIndex]
      const player = match.players.find(p => p.playerId === playerId)

      // Only substitute if player is MB
      if (player?.position === 'MB') {
        const positionNumber = [5, 6, 1][backRowPositions.indexOf(arrayIndex)]

        // Rule a) MB in position 1 (array index 5) and team is serving: no substitution
        if (positionNumber === 1 && isServing) {
          // Keep MB, no substitution
        } else {
          // Rule b) MB in back row (5, 6) or position 1 not serving: substitute with libero
          displayRotation[arrayIndex] = liberoId
        }
      }
    })

    return displayRotation
  }

  // Get team name from prop or fallback
  const myTeamName = teamName || 'Mi Equipo'

  // Local team ALWAYS on left, visitor ALWAYS on right
  const localTeamName = isHomeTeam ? myTeamName : match.opponent
  const visitorTeamName = isHomeTeam ? match.opponent : myTeamName

  const setsCompletados = match.sets.filter(s => s.status === 'completed' || shouldEndSet(s.number, s.homeScore, s.awayScore))
  const derivedSetsWonLocal = setsCompletados.filter(s => s.homeScore > s.awayScore).length
  const derivedSetsWonVisitor = setsCompletados.filter(s => s.awayScore > s.homeScore).length

  // Initialize rotation order from starting lineup
  useEffect(() => {
    if (match.startingLineup) {
      const rotationOrder = [
        match.startingLineup.position1,
        match.startingLineup.position2,
        match.startingLineup.position3,
        match.startingLineup.position4,
        match.startingLineup.position5,
        match.startingLineup.position6
      ].filter((id): id is string => id !== null)
      setCurrentRotationOrder(rotationOrder)
    }
  }, [match.startingLineup])

  // Calculate display rotation whenever base rotation, libero, or serve state changes
  useEffect(() => {
    // Use the single source of truth for libero on court
    const liberoId = match.liberoOnCourtBySet?.[match.currentSet] || match.startingLineup?.libero || null
    const isServing = estadoSaque === 'myTeamServing'
    const displayRotation = calculateDisplayRotation(currentRotationOrder, liberoId, isServing)
    setDisplayRotationOrder(displayRotation)
  }, [currentRotationOrder, match.startingLineup?.libero, match.liberoOnCourtBySet, match.currentSet, estadoSaque, match.players])

  // Initialize current set scores
  useEffect(() => {
    const currentSetData = match.sets.find(set => set.number === match.currentSet)
    if (currentSetData) {
      setHomeScore(currentSetData.homeScore)
      setAwayScore(currentSetData.awayScore)
    }
  }, [match.currentSet, match.sets])

  // NUEVO: Efecto para inicializar el estado de saque basado en startingServerSet1
  useEffect(() => {
    // Solo para el set 1, inicializar el estado de saque basado en startingServerSet1
    if (match.currentSet === 1 && match.sacadorInicialSet1 && !estadoSaque) {
      const miEquipo = match.teamSide // 'local' o 'visitante'
      const startingServer = match.sacadorInicialSet1 // 'local' o 'visitor'
      // Convertir al formato UI: 'visitor' -> 'visitante'
      const startingServerEs = startingServer === 'visitor' ? 'visitante' : 'local'

      // Derivar si mi equipo estÃ¡ sacando o recibiendo desde equipoQueSaca
      const miEquipoSacando = (startingServerEs === miEquipo)
      setEstadoSaque(miEquipoSacando ? 'myTeamServing' : 'myTeamReceiving')

      // Si estamos recibiendo, marcar que debemos mostrar el popup de recepciÃ³n
      if (!miEquipoSacando) {
        setShouldShowInitialReceptionPopup(true)
      }
    }
  }, [match.currentSet, match.sacadorInicialSet1, estadoSaque, match.teamSide])

  // NUEVO: Efecto para inicializar el estado de saque del set 5 basado en startingServerSet5
  useEffect(() => {
    if (match.currentSet === 5 && match.sacadorInicialSet5 && !estadoSaque) {
      const miEquipo = match.teamSide // 'local' o 'visitante'
      const startingServer5 = match.sacadorInicialSet5 // 'local' o 'visitor'
      const startingServerEs5 = startingServer5 === 'visitor' ? 'visitante' : 'local'
      const miEquipoSacando = (startingServerEs5 === miEquipo)
      setEstadoSaque(miEquipoSacando ? 'myTeamServing' : 'myTeamReceiving')
      if (!miEquipoSacando) {
        setShouldShowInitialReceptionPopup(true)
      }
    }
  }, [match.currentSet, match.sacadorInicialSet5, estadoSaque, match.teamSide])

  // NUEVO: Auto-open starters modal if no lineup is configured for Set 1
  useEffect(() => {
    console.log('🔍 StartersModal Check:', {
      currentSet: match.currentSet,
      hasStartingLineup: !!match.startingLineup,
      showStartersModal,
      shouldOpen: match.currentSet === 1 && !match.startingLineup && !showStartersModal
    })

    if (match.currentSet === 1 && !match.startingLineup && !showStartersModal) {
      console.log('✅ Opening StartersManagement modal')
      setShowStartersModal(true)
    }
  }, [match.currentSet, match.startingLineup, showStartersModal])

  // Rotate players - clockwise rotation: 1â†’6â†’5â†’4â†’3â†’2â†’1
  const rotatePlayers = () => {
    setCurrentRotationOrder(prev => {
      const rotated = [...prev]
      // Official volleyball rotation: [z2, z3, z4, z5, z6, z1]
      return [rotated[1], rotated[2], rotated[3], rotated[4], rotated[5], rotated[0]]
    })
    setRotation(prev => prev === 6 ? 1 : prev + 1)
  }

  // Action handlers
  const recordAction = (action: string, pointFor: 'myTeam' | 'opponent', changeServeState?: boolean, playerId?: string) => {
    // REGlas estrictas: miEquipo es fijo, el otro equipo es siempre el contrario
    const miEquipo = match.teamSide // 'local' o 'visitante', se fija al inicio del partido
    const equipoContrario = miEquipo === 'local' ? 'visitante' : 'local'

    // Determinar equipo que realiza la acciÃ³n (equipoAccion) y equipo que anota (equipoAnota)
    const equipoAccion = (() => {
      switch (action) {
        case 'punto_saque':
          // Si es punto de saque, el que saca es mi equipo
          return miEquipo
        case 'error_saque':
          // Si es error de saque, el que falla es mi equipo
          // IMPORTANTE: El botÃ³n "Error de saque" solo aparece cuando mi equipo estÃ¡ sacando (serveState === 'myTeamServing')
          // Por lo tanto, el equipo que comete el error de saque es siempre mi equipo
          return miEquipo
        case 'error_recepcion':
          // Si es error de recepciÃ³n, el que falla es mi equipo
          return miEquipo
        case 'punto_ataque':
          // Si es punto de ataque, el que ataca es mi equipo
          return miEquipo
        case 'error_ataque':
          // Si es error de ataque, el que falla es mi equipo
          return miEquipo
        case 'ataque_bloqueado':
          // Si es ataque bloqueado, el que ataca es mi equipo
          return miEquipo
        case 'error_bloqueo':
          // Si es error de bloqueo, el que falla es mi equipo
          return miEquipo
        case 'error_rival':
          // Si es error del rival, el que falla es el equipo contrario
          return equipoContrario
        case 'punto_rival':
          // Si es punto del rival, el que anota es el equipo contrario
          return equipoContrario
        case 'error_generico':
          // Si es error genÃ©rico, el que falla es mi equipo
          return miEquipo
        default:
          return miEquipo
      }
    })()

    // Determinar equipo que anota el punto (equipoPunto) usando la regla estricta
    const equipoPunto = pointFor === 'myTeam' ? miEquipo : equipoContrario

    const actionRecord: ActionHistory = {
      id: Date.now().toString(),
      action,
      pointFor,
      equipoAccion,
      equipoAnota: equipoPunto, // Usar equipoPunto como equipoAnota
      previousScore: { home: homeScore, away: awayScore },
      previousServeState: estadoSaque!,
      previousRotation: rotation,
      timestamp: Date.now()
    }

    setActionHistory(prev => [...prev, actionRecord])
    // Clear redo history when a new action is performed
    setRedoHistory([])

    // Calculate new scores using equipoPunto directly (regla estricta)
    let newHomeScore = homeScore
    let newAwayScore = awayScore

    if (equipoPunto === 'local') {
      newHomeScore = homeScore + 1
    } else {
      newAwayScore = awayScore + 1
    }

    // Map action names to the correct format for the match store (now using Spanish identifiers directly)
    const actionTypeMap: Record<string, string> = {
      'punto_saque': 'punto_saque',
      'error_saque': 'error_saque',
      'punto_ataque': 'punto_ataque',
      'ataque_bloqueado': 'ataque_bloqueado',
      'error_ataque': 'error_ataque',
      'punto_bloqueo': 'punto_bloqueo',
      'error_recepcion': 'error_recepcion',
      'recepcion': 'recepcion',
      'error_generico': 'error_generico',
      'error_rival': 'error_rival',
      'punto_rival': 'punto_rival'
    }

    // Determine which team gets the point
    let equipo: Equipo
    if (pointFor === 'myTeam') {
      equipo = isHomeTeam ? 'local' : 'visitante'
    } else {
      equipo = isHomeTeam ? 'visitante' : 'local'
    }

    // Record the action in the match store
    // Obtener las jugadoras de mi equipo que estÃ¡n en cancha (6 jugadoras)
    const jugadorasEnCanchaIds = displayRotationOrder.filter(id => id !== null && id !== undefined) as string[]

    onUpdateMatch(match.id, {
      acciones: [...match.acciones, {
        id: Date.now().toString(),
        set: match.currentSet,
        equipo,
        tipo: actionTypeMap[action] || 'accion_desconocida',
        timestamp: new Date().toISOString(),
        jugadorasEnCanchaIds: jugadorasEnCanchaIds.length > 0 ? jugadorasEnCanchaIds : undefined,
        jugadoraId: playerId
      }],
      timeline: [
        ...(match.timeline || []),
        {
          id: `${Date.now()}-rally`,
          type: 'rally',
          set: match.currentSet,
          timestamp: new Date().toISOString(),
          scoreBefore: { home: homeScore, away: awayScore },
          scoreAfter: { home: newHomeScore, away: newAwayScore },
          serveStateBefore: estadoSaque!,
          serveStateAfter: shouldEndSet(match.currentSet, newHomeScore, newAwayScore) ? estadoSaque! : (equipoPunto === match.teamSide ? 'myTeamServing' : 'myTeamReceiving'),
          rotationBefore: rotation,
          rotationAfter: rotation,
          rally: {
            equipo,
            tipo: actionTypeMap[action] || 'accion_desconocida',
            jugadoraId: playerId,
            jugadorasEnCanchaIds
          }
        }
      ]
    })

    // Update local scores
    setHomeScore(newHomeScore)
    setAwayScore(newAwayScore)

    const willEndSet = shouldEndSet(match.currentSet, newHomeScore, newAwayScore)

    // Handle serve state changes SOLO si el set NO ha terminado
    if (!willEndSet && changeServeState) {
      // Determinar equipo que saca basado en equipoPunto
      const equipoQueSaca = equipoPunto

      // Actualizar modo de mi equipo basado en equipoQueSaca y miEquipo
      const modoMiEquipoSacando = (equipoQueSaca === miEquipo)
      const modoMiEquipoRecibiendo = (equipoQueSaca !== miEquipo)

      // Establecer el estado de saque
      setEstadoSaque(modoMiEquipoSacando ? 'myTeamServing' : 'myTeamReceiving')

      // Si mi equipo pasa a sacar, rotar jugadoras
      if (modoMiEquipoSacando && estadoSaque === 'myTeamReceiving') {
        rotatePlayers()
      }

      // Gestionar flags del popup de recepciÃ³n
      console.log('DEBUG: Managing reception popup flags:', {
        action,
        modoMiEquipoRecibiendo,
        shouldShowInitialReceptionPopup: shouldShowInitialReceptionPopup,
        previousServeState: estadoSaque,
        willSetTo: modoMiEquipoRecibiendo ? 'true' : 'false'
      })

      // Si el punto termina por error_saque, no hay recepciÃ³n
      if (action === 'error_saque') {
        setShouldShowInitialReceptionPopup(false)
        setShowReceptionPopup(false)
      }
      // La lÃ³gica de transiciÃ³n de serve state ahora se maneja en el useEffect dedicado
    }

    setHasReceptionThisRally(false)
    setShowReceptionPopup(false)
    setShouldShowInitialReceptionPopup(false)

    const miEquipoRecibiendo = estadoSaque === 'myTeamReceiving'
    if (!willEndSet && miEquipoRecibiendo && action !== 'error_saque') {
      setShouldShowInitialReceptionPopup(true)
      setShowReceptionPopup(true)
    }

    // Update match in store with current set scores
    const currentSetIndex = match.sets.findIndex(set => set.number === match.currentSet)
    const updatedMatch = {
      ...match,
      sets: match.sets.map((set, index) =>
        index === currentSetIndex
          ? {
            ...set,
            homeScore: newHomeScore,
            awayScore: newAwayScore,
            status: 'in_progress' as const
          }
          : set
      )
    }
    onUpdateMatch(match.id, { sets: updatedMatch.sets })

    // Check if set should end
    if (shouldEndSet(match.currentSet, newHomeScore, newAwayScore)) {
      // Reset explÃ­cito de flags de recepciÃ³n al finalizar el set
      setHasReceptionThisRally(false)
      setShowReceptionPopup(false)
      setShouldShowInitialReceptionPopup(false)

      const winner = getSetWinner(newHomeScore, newAwayScore)
      setPendingSetCompletion({
        setNumber: match.currentSet,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        winner
      })
      setShowSetCompleteModal(true)
    }
  }

  // NUEVO: FunciÃ³n para manejar la recepciÃ³n
  const handleReceptionSelection = (playerId: string | null, rating: number | null, isOpponentServiceError: boolean) => {
    // Reglas estrictas: miEquipo es fijo, el otro equipo es siempre el contrario
    const miEquipo = match.teamSide // 'local' o 'visitante', se fija al inicio del partido
    const equipoContrario = miEquipo === 'local' ? 'visitante' : 'local'

    // Marcar que ya se ha registrado recepciÃ³n en este rally
    setHasReceptionThisRally(true)

    // Cerrar el popup de recepciÃ³n y resetear flags
    setShowReceptionPopup(false)
    setShouldShowInitialReceptionPopup(false)

    if (isOpponentServiceError) {
      // Saque fallado rival - punto para mi equipo
      const jugadorasEnCanchaIds = displayRotationOrder.filter(id => id !== null && id !== undefined) as string[]

      // Registrar el saque fallado rival
      onUpdateMatch(match.id, {
        acciones: [...match.acciones, {
          id: Date.now().toString(),
          set: match.currentSet,
          equipo: equipoContrario, // El rival comete el error de saque
          tipo: 'error_saque',
          timestamp: new Date().toISOString(),
          jugadorasEnCanchaIds: jugadorasEnCanchaIds.length > 0 ? jugadorasEnCanchaIds : undefined,
          saqueFalladoRival: true
        }]
      })

      recordAction('error_saque', 'myTeam', estadoSaque === 'myTeamReceiving')
      return
    }

    if (!playerId || rating === null) return

    // Obtener las jugadoras de mi equipo que estÃ¡n en cancha
    const jugadorasEnCanchaIds = displayRotationOrder.filter(id => id !== null && id !== undefined) as string[]

    if (rating === 0) {
      // Error de recepciÃ³n - punto para el rival
      recordAction('error_recepcion', 'opponent', false, playerId)
    } else {
      // RecepciÃ³n exitosa (1-4) - solo registrar la recepciÃ³n sin cambiar puntuaciÃ³n
      onUpdateMatch(match.id, {
        acciones: [...match.acciones, {
          id: Date.now().toString(),
          set: match.currentSet,
          equipo: miEquipo, // Mi equipo realiza la recepciÃ³n
          tipo: 'recepcion',
          timestamp: new Date().toISOString(),
          jugadorasEnCanchaIds: jugadorasEnCanchaIds.length > 0 ? jugadorasEnCanchaIds : undefined,
          jugadoraId: playerId,
          recepcion: {
            jugadoraId: playerId,
            calificacion: rating,
            esError: false
          }
        }],
        timeline: [
          ...(match.timeline || []),
          {
            id: `${Date.now()}-reception`,
            type: 'rally',
            set: match.currentSet,
            timestamp: new Date().toISOString(),
            scoreBefore: { home: homeScore, away: awayScore },
            scoreAfter: { home: homeScore, away: awayScore }, // No cambia el marcador
            serveStateBefore: estadoSaque!,
            serveStateAfter: estadoSaque!, // No cambia el estado de saque
            rotationBefore: rotation,
            rotationAfter: rotation,
            rally: {
              equipo: miEquipo,
              tipo: 'recepcion',
              jugadoraId: playerId,
              jugadorasEnCanchaIds,
              recepcion: {
                jugadoraId: playerId,
                calificacion: rating,
                esError: false
              }
            }
          }
        ]
      })
    }
  }

  // NUEVO: FunciÃ³n para manejar la selecciÃ³n de jugadora
  const handlePlayerSelection = (playerId: string) => {
    if (!pendingAction) return

    // Now execute the original action logic with the selected player
    recordAction(
      pendingAction.action,
      pendingAction.pointFor,
      pendingAction.changeServeState,
      playerId
    )

    setPendingAction(null)
  }

  // NUEVO: FunciÃ³n para cancelar la selecciÃ³n de jugadora
  const handleCancelPlayerSelection = () => {
    setShowPlayerSelection(false)
    setPendingAction(null)
  }

  // Serve action handlers - now with player selection
  const handleServePoint = () => {
    setPendingAction({
      action: 'punto_saque',
      pointFor: 'myTeam',
      changeServeState: false,
      isServeAction: true
    })
    setShowPlayerSelection(true)
  }

  const handleServeError = () => {
    setPendingAction({
      action: 'error_saque',
      pointFor: 'opponent',
      changeServeState: true,
      isServeAction: true
    })
    setShowPlayerSelection(true)
  }

  // Attack action handlers - now with player selection
  const handleAttackPoint = () => {
    setPendingAction({
      action: 'punto_ataque',
      pointFor: 'myTeam',
      changeServeState: estadoSaque === 'myTeamReceiving'
    })
    setShowPlayerSelection(true)
  }

  const handleAttackBlocked = () => {
    setPendingAction({
      action: 'ataque_bloqueado',
      pointFor: 'opponent',
      changeServeState: estadoSaque === 'myTeamServing'
    })
    setShowPlayerSelection(true)
  }

  const handleAttackError = () => {
    setPendingAction({
      action: 'error_ataque',
      pointFor: 'opponent',
      changeServeState: estadoSaque === 'myTeamServing'
    })
    setShowPlayerSelection(true)
  }

  // Block action handlers - now with player selection
  const handleBlockPoint = () => {
    setPendingAction({
      action: 'punto_bloqueo',
      pointFor: 'myTeam',
      changeServeState: estadoSaque === 'myTeamReceiving'
    })
    setShowPlayerSelection(true)
  }

  const handleGenericError = () => {
    recordAction('error_generico', 'opponent', estadoSaque === 'myTeamServing')
  }

  const handleOpponentError = () => {
    recordAction('error_rival', 'myTeam', estadoSaque === 'myTeamReceiving')
  }

  const handleOpponentPoint = () => {
    recordAction('punto_rival', 'opponent', estadoSaque === 'myTeamServing')
  }

  // Set completion handlers
  const handleSetComplete = () => {
    if (!pendingSetCompletion) return

    // Complete the set in the store
    onUpdateMatch(match.id, {
      sets: match.sets.map(set =>
        set.number === pendingSetCompletion.setNumber
          ? { ...set, homeScore: pendingSetCompletion.homeScore, awayScore: pendingSetCompletion.awayScore, status: 'completed' as const }
          : set
      ),
      setsWonLocal: pendingSetCompletion.winner === 'local' ? match.setsWonLocal + 1 : match.setsWonLocal,
      setsWonVisitor: pendingSetCompletion.winner === 'visitor' ? match.setsWonVisitor + 1 : match.setsWonVisitor,
      timeline: [
        ...(match.timeline || []),
        {
          id: `${Date.now()}-set${pendingSetCompletion.setNumber}-end`,
          type: 'set_end',
          set: pendingSetCompletion.setNumber,
          timestamp: new Date().toISOString(),
          scoreAfter: { home: pendingSetCompletion.homeScore, away: pendingSetCompletion.awayScore }
        }
      ]
    })

    const predictedSets = match.sets.map(set =>
      set.number === pendingSetCompletion.setNumber
        ? { ...set, homeScore: pendingSetCompletion.homeScore, awayScore: pendingSetCompletion.awayScore, status: 'completed' as const }
        : set
    )
    const setsCompletados = predictedSets.filter(s => s.status === 'completed' || shouldEndSet(s.number, s.homeScore, s.awayScore))
    const setsGanadosLocal = setsCompletados.filter(s => s.homeScore > s.awayScore).length
    const setsGanadosVisitante = setsCompletados.filter(s => s.awayScore > s.homeScore).length

    if (setsGanadosLocal === 3 || setsGanadosVisitante === 3) {
      // Match is complete
      setShowSetCompleteModal(false)
      setShowMatchCompleteModal(true)
    } else if (match.currentSet < 5) {
      // Start next set
      const nextSetNumber = match.currentSet + 1
      const newSet = {
        id: `${match.id}-set${nextSetNumber}`,
        number: nextSetNumber,
        homeScore: 0,
        awayScore: 0,
        status: 'not_started' as const
      }

      // EVITAR DUPLICADOS: solo aÃ±adir el set si no existe ya
      const nextSetExists = match.sets.some(set => set.number === nextSetNumber)
      const updatedSets = nextSetExists ? match.sets : [...match.sets, newSet]
      const uniqueSets = updatedSets.filter((s, i, a) => a.findIndex(t => t.number === s.number) === i)
      onUpdateMatch(match.id, {
        currentSet: nextSetNumber,
        sets: uniqueSets,
        timeline: [
          ...(match.timeline || []),
          {
            id: `${Date.now()}-set${nextSetNumber}-start`,
            type: 'set_start',
            set: nextSetNumber,
            timestamp: new Date().toISOString(),
            scoreBefore: { home: 0, away: 0 },
            scoreAfter: { home: 0, away: 0 }
          },
          {
            id: `${Date.now()}-set${nextSetNumber}-starters_open`,
            type: 'starters_open',
            set: nextSetNumber,
            timestamp: new Date().toISOString()
          }
        ]
      })

      // Reset scores and rotation for new set
      setHomeScore(0)
      setAwayScore(0)
      setRotation(1)

      // For sets 2-5: Show starters modal (serve selection is integrated for Set 1 and Set 5)
      // Sets 2-4: Serve alternates automatically based on Set 1 initial server

      // Show starters selection for sets 2-5
      if (nextSetNumber >= 2) {
        setShowStartersModal(true)
      }

      setShowSetCompleteModal(false)
      setPendingSetCompletion(null)
    }
  }

  const handleSetCompleteUndo = () => {
    // When undoing a set completion, we need to restore the previous set's completion modal
    // instead of going through the general undo logic
    setShowSetCompleteModal(false)
    setPendingSetCompletion(null)

    // For sets 2-5, we want to restore the previous set's completion confirmation
    if (match.currentSet >= 2) {
      const previousSetNumber = match.currentSet - 1
      const previousSet = match.sets.find(set => set.number === previousSetNumber)

      if (previousSet && previousSet.status === 'completed') {
        // Restore the previous set completion modal
        setPendingSetCompletion({
          setNumber: previousSetNumber,
          homeScore: previousSet.homeScore,
          awayScore: previousSet.awayScore,
          winner: previousSet.homeScore > previousSet.awayScore ? 'local' : 'visitor'
        })
        setShowSetCompleteModal(true)
        return
      }
    }

    // Fallback to normal undo behavior for set 1 or if previous set data is not available
    handleUndo()
  }

  const handleStartersSave = (_starterIds: string[], startingLineup: any) => {
    onUpdateMatch(match.id, { startingLineup })

    // Guardar el lÃ­bero titular para este set
    const { updateLiberoOnCourt } = useMatchStore.getState()
    updateLiberoOnCourt(match.id, match.currentSet, startingLineup.libero)

    setShowStartersModal(false)

    // LÃ³gica para determinar quiÃ©n saca y si mostrar popup de recepciÃ³n
    const currentSetNumber = match.currentSet
    const esSetConSorteoDeSaque = currentSetNumber === 1 || currentSetNumber === 5

    if (esSetConSorteoDeSaque) {
      // Set 1: mantener lÃ³gica existente (wizard)
      if (currentSetNumber === 1) {
        const s = obtenerSacadorInicialSet(currentSetNumber, match.sacadorInicialSet1)
        const startingServerEs = s === 'visitor' ? 'visitante' : s === 'local' ? 'local' : null
        if (startingServerEs) {
          const miEquipo = match.teamSide
          const miEquipoSacando = (startingServerEs === miEquipo)
          setEstadoSaque(miEquipoSacando ? 'myTeamServing' : 'myTeamReceiving')
          if (!miEquipoSacando) {
            setShouldShowInitialReceptionPopup(true)
          }
        }
      }
      // Set 5: usar selecciÃ³n integrada en StartersManagement
      else if (currentSetNumber === 5) {
        if (match.sacadorInicialSet5) {
          const startingServerEs = match.sacadorInicialSet5 === 'visitor' ? 'visitante' : 'local'
          const miEquipo = match.teamSide
          const miEquipoSacando = (startingServerEs === miEquipo)
          setEstadoSaque(miEquipoSacando ? 'myTeamServing' : 'myTeamReceiving')
          if (!miEquipoSacando) {
            setShouldShowInitialReceptionPopup(true)
          }
        }
      }
    } else {
      // Sets 2, 3, 4: saque automÃ¡tico basado en la rotaciÃ³n A/B
      const startingServer = obtenerSacadorInicialSet(currentSetNumber, match.sacadorInicialSet1)
      if (startingServer) {
        // Reglas estrictas: miEquipo es fijo, el otro equipo es siempre el contrario
        const miEquipo = match.teamSide // 'local' o 'visitante', se fija al inicio del partido
        setEstadoSaque(startingServer === miEquipo ? 'myTeamServing' : 'myTeamReceiving')

        // Marcar que debemos mostrar el popup de recepciÃ³n despuÃ©s si estamos recibiendo
        if (startingServer !== miEquipo) {
          setShouldShowInitialReceptionPopup(true)
        }
      }
    }
    onUpdateMatch(match.id, {
      timeline: [
        ...(match.timeline || []),
        {
          id: `${Date.now()}-set${match.currentSet}-starters_confirmed`,
          type: 'starters_confirmed',
          set: match.currentSet,
          timestamp: new Date().toISOString()
        }
      ]
    })
  }



  // UNDO functionality
  const handleUndo = () => {
    // NUEVO: Logging antes de deshacer
    logUndoAction('antes')

    // 1. Find the last event in the current set (ANY type that affects state)
    const lastEventIndex = (match.timeline || []).length > 0
      ? [...(match.timeline || [])].reverse().findIndex(e =>
        e.set === match.currentSet &&
        ['rally', 'substitution', 'libero_override_activated'].includes(e.type)
      )
      : -1

    if (lastEventIndex !== -1) {
      const absoluteIndex = (match.timeline || []).length - 1 - lastEventIndex
      const lastEvent = (match.timeline || [])[absoluteIndex]

      console.log('DEBUG: Undoing event type:', lastEvent.type)

      // Common updates (removing event from timeline)
      const newTimeline = (match.timeline || []).filter((_, i) => i !== absoluteIndex)

      // Prepare base update object
      let updateData: Partial<Match> = {
        timeline: newTimeline,
        updatedAt: new Date().toISOString()
      }

      // --- HANDLE RALLY UNDO ---
      if (lastEvent.type === 'rally') {
        const prevScore = lastEvent.scoreBefore || { home: homeScore, away: awayScore }

        // Restore local state
        setHomeScore(prevScore.home)
        setAwayScore(prevScore.away)
        setEstadoSaque(lastEvent.serveStateBefore || estadoSaque)
        if (lastEvent.rotationBefore) {
          setRotation(lastEvent.rotationBefore)
        }

        // Update match store
        const currentSetIndex = match.sets.findIndex(set => set.number === match.currentSet)
        updateData.sets = match.sets.map((set, index) =>
          index === currentSetIndex
            ? {
              ...set,
              homeScore: prevScore.home,
              awayScore: prevScore.away,
              status: shouldEndSet(match.currentSet, prevScore.home, prevScore.away) ? 'completed' : 'in_progress'
            }
            : set
        )

        // Remove corresponding action from match.acciones if it exists
        // We assume the last action in match.acciones for this set corresponds to this rally
        // But to be safe, we can try to match timestamps or just remove the last one for this set
        updateData.acciones = (() => {
          const idx = [...match.acciones].reverse().findIndex(a => a.set === match.currentSet)
          if (idx === -1) return match.acciones
          const abs = match.acciones.length - 1 - idx
          return match.acciones.filter((_, i) => i !== abs)
        })()
      }

      // --- HANDLE SUBSTITUTION UNDO ---
      else if (lastEvent.type === 'substitution' && lastEvent.substitution) {
        const sub = lastEvent.substitution

        // 1. Revert Rotation (Players on Court)
        if (sub.playersOnCourtBefore) {
          setCurrentRotationOrder(sub.playersOnCourtBefore)
        }

        // 2. Revert Substitution Pairs (decrement uses)
        if (sub.substitutionType === 'campo') {
          const currentSet = match.currentSet
          const pairs = match.substitutionPairs?.[currentSet] || {}
          const pairOut = pairs[sub.playerOutId]
          const pairIn = pairs[sub.playerInId]

          // We need to decrement 'usos' for both players in the pair
          const newPairs = { ...pairs }

          if (pairOut) {
            newPairs[sub.playerOutId] = { ...pairOut, usos: Math.max(0, pairOut.usos - 1) }
          }
          if (pairIn) {
            newPairs[sub.playerInId] = { ...pairIn, usos: Math.max(0, pairIn.usos - 1) }
          }

          updateData.substitutionPairs = {
            ...match.substitutionPairs,
            [currentSet]: newPairs
          }
        }

        // 3. Revert Libero on Court (if it was a libero change)
        if (sub.substitutionType === 'libero') {
          // If we are undoing a libero IN, we need to set the libero on court back to... 
          // actually, if it was a libero substitution, usually it's Libero <-> MB.
          // If Libero came IN (playerInId is Libero), then undoing means Libero goes OUT.
          // So we should check who was the libero on court before.
          // But `liberoOnCourtBySet` tracks the ACTIVE libero. 
          // If we undo, we should probably revert to the previous state.
          // However, `playersOnCourtBefore` handles the visual rotation.
          // `liberoOnCourtBySet` is used for the "L" badge and logic.

          // Simplification: If we undo a libero swap, we can check `playersOnCourtBefore`
          // to see if a libero was there.
          // Or better, just revert `liberoOnCourtBySet` to what it was? 
          // We don't store `liberoOnCourtBefore` in the event explicitly, but we can infer.

          // If playerIn was Libero, then before this, the Libero was NOT on court (or another libero was).
          // If playerOut was Libero, then before this, the Libero WAS on court.

          const playerIn = match.players.find(p => p.playerId === sub.playerInId)
          const playerOut = match.players.find(p => p.playerId === sub.playerOutId)

          let liberoIdToRestore: string | null = null

          // If we are undoing "Libero IN", then Libero is no longer on court.
          if (playerIn?.position === 'L') {
            // Check if the player OUT was also a libero (libero switch)
            if (playerOut?.position === 'L') {
              liberoIdToRestore = playerOut.playerId
            } else {
              // Libero replaced a normal player, so now Libero is out.
              // Was there another libero? Unlikely in standard rules (only 1 active).
              liberoIdToRestore = null
            }
          }
          // If we are undoing "Libero OUT" (Player IN replaced Libero), then Libero should be back.
          else if (playerOut?.position === 'L') {
            liberoIdToRestore = playerOut.playerId
          }

          updateData.liberoOnCourtBySet = {
            ...match.liberoOnCourtBySet,
            [match.currentSet]: liberoIdToRestore
          }
        }
      }

      // --- HANDLE LIBERO OVERRIDE UNDO ---
      else if (lastEvent.type === 'libero_override_activated') {
        // Revert the override flags
        updateData.liberoOverrideActive = false
        updateData.liberoOverridePlayerId = undefined

        // We also need to revert the `liberoOnCourtBySet` because designating an improvised libero
        // sets them as the libero on court.
        // We should revert to the official libero if one exists, or null.
        const officialLibero = match.startingLineup?.libero || null
        updateData.liberoOnCourtBySet = {
          ...match.liberoOnCourtBySet,
          [match.currentSet]: officialLibero
        }
      }

      // Apply updates
      onUpdateMatch(match.id, updateData)

      // Check match completion status (if we undid the winning point)
      if (showMatchCompleteModal) {
        // Re-evaluate if match is still complete (it shouldn't be if we undid)
        // But simpler to just close it if we undo
        setShowMatchCompleteModal(false)
      }

      // NUEVO: Logging después de deshacer
      setTimeout(() => logUndoAction('despues'), 0)
      return
    }

    // Case B: Special navigation behavior when no actions in current set (0-0)
    if (match.currentSet === 1) {
      // Set 1: Go back to step 3 of wizard (player selection)
      if (onNavigateToWizardStep) {
        onNavigateToWizardStep(3)
      }
      return
    } else if (match.currentSet === 5) {
      // Set 5: Return to starters selection
      setShowStartersModal(true)
      return
    } else {
      // Sets 2, 3, 4: Go back to starters selection
      // We might want to add logic here to reopen the starters modal if the timeline is empty
      // But for now, standard behavior is fine.
    }
  }

  // NUEVO: FunciÃ³n para manejar la confirmaciÃ³n de sustituciÃ³n
  const handleSubstitution = (playerOutId: string, playerInId: string, note?: string) => {
    // 0. Validaciones bÃ¡sicas
    const playerOut = match.players.find(p => p.playerId === playerOutId)
    const playerIn = match.players.find(p => p.playerId === playerInId)

    if (!playerOut || !playerIn) return

    const isLiberoOut = playerOut.position === 'L'
    const isLiberoIn = playerIn.position === 'L'

    // 1. Validar si el override de lÃ­bero estÃ¡ activo
    if (match.liberoOverrideActive && (isLiberoOut || isLiberoIn)) {
      alert("Los lÃ­beros oficiales estÃ¡n deshabilitados para este partido.")
      return
    }

    // 2. Validar reglas de lÃ­bero
    if (isLiberoOut || isLiberoIn) {
      // Si uno es lÃ­bero, ambos deben ser lÃ­bero
      if (isLiberoOut !== isLiberoIn) {
        alert("Los lÃ­beros solo pueden sustituirse entre ellos, no con jugadoras de campo.")
        return
      }
      // Si ambos son lÃ­beros, permitir sin restricciones (no hay lÃ­mite de cambios)
      // Continuar con la sustituciÃ³n sin validar parejas
    } else {
      // 2. Validar reglas de parejas A-B para jugadoras de campo
      const currentSet = match.currentSet
      const substitutionPairs = match.substitutionPairs?.[currentSet] || {}

      const pairOut = substitutionPairs[playerOutId]
      const pairIn = substitutionPairs[playerInId]

      // Caso A: Ninguna tiene pareja -> Crear nueva pareja
      if (!pairOut && !pairIn) {
        // Permitido. Se crearÃ¡ la pareja al guardar con usos = 1.
      }
      // Caso B: Alguna tiene pareja -> Validar que sean pareja entre sÃ­
      else {
        const isPairingCorrect = pairOut?.partnerId === playerInId && pairIn?.partnerId === playerOutId

        if (!isPairingCorrect) {
          alert("Cambio ilegal: esta jugadora solo puede cambiar con su pareja de sustituciÃ³n en este set.")
          return
        }

        // Verificar que no hayan superado el lÃ­mite de usos
        const usosActuales = pairOut?.usos || 0
        const maxUsos = pairOut?.maxUsos || 2

        if (usosActuales >= maxUsos) {
          alert("Cambio ilegal: esta pareja ya ha completado su ciclo de sustituciones en este set.")
          return
        }
        // Si es correcto y no han superado el lÃ­mite, permitido.
      }
    }

    // 3. Actualizar la rotaciÃ³n actual (currentRotationOrder)
    // 3. Actualizar la rotaciÃ³n actual (currentRotationOrder)
    const playerOutIndex = currentRotationOrder.indexOf(playerOutId)

    // Si no estÃ¡ en la rotaciÃ³n y NO es un cambio de lÃ­bero, es un error
    if (playerOutIndex === -1 && !(isLiberoOut && isLiberoIn)) return

    const newRotationOrder = [...currentRotationOrder]

    // Solo actualizamos la rotaciÃ³n si el jugador saliente estÃ¡ en ella (cambio normal)
    if (playerOutIndex !== -1) {
      newRotationOrder[playerOutIndex] = playerInId
      setCurrentRotationOrder(newRotationOrder)
    }

    // 4. Registrar evento en timeline y actualizar parejas
    const miEquipo = match.teamSide

    const playersOnCourtBefore = currentRotationOrder.filter((id): id is string => !!id)
    const playersOnCourtAfter = newRotationOrder.filter((id): id is string => !!id)

    // Determinar tipo de sustituciÃ³n
    const substitutionType: 'campo' | 'libero' = (isLiberoOut && isLiberoIn) ? 'libero' : 'campo'

    // Preparar actualizaciÃ³n de parejas (solo para jugadoras de campo)
    let newSubstitutionPairs: { [playerId: string]: { partnerId: string; usos: number; maxUsos: number } } = {}
    if (substitutionType === 'campo') {
      const currentSet = match.currentSet
      const substitutionPairs = match.substitutionPairs?.[currentSet] || {}
      const pairOut = substitutionPairs[playerOutId]
      const pairIn = substitutionPairs[playerInId]

      newSubstitutionPairs = { ...substitutionPairs }

      if (!pairOut && !pairIn) {
        // Primera sustituciÃ³n: crear pareja con usos = 1
        newSubstitutionPairs[playerOutId] = { partnerId: playerInId, usos: 1, maxUsos: 2 }
        newSubstitutionPairs[playerInId] = { partnerId: playerOutId, usos: 1, maxUsos: 2 }
      } else {
        // Incrementar usos
        const nuevosUsos = (pairOut?.usos || 0) + 1
        newSubstitutionPairs[playerOutId] = { ...pairOut!, usos: nuevosUsos, partnerId: pairOut!.partnerId, maxUsos: pairOut!.maxUsos }
        newSubstitutionPairs[playerInId] = { ...pairIn!, usos: nuevosUsos, partnerId: pairIn!.partnerId, maxUsos: pairIn!.maxUsos }
      }
    }

    const updateData: any = {
      timeline: [
        ...(match.timeline || []),
        {
          id: `${Date.now()}-substitution`,
          type: 'substitution',
          set: match.currentSet,
          timestamp: new Date().toISOString(),
          scoreBefore: { home: homeScore, away: awayScore },
          scoreAfter: { home: homeScore, away: awayScore },
          serveStateBefore: estadoSaque!,
          serveStateAfter: estadoSaque!,
          substitution: {
            team: miEquipo,
            playerOutId,
            playerInId,
            note,
            playersOnCourtBefore,
            playersOnCourtAfter,
            substitutionType
          }
        }
      ]
    }

    // Solo actualizar parejas si es sustituciÃ³n de campo
    if (substitutionType === 'campo') {
      updateData.substitutionPairs = {
        ...match.substitutionPairs,
        [match.currentSet]: newSubstitutionPairs
      }
    }

    // NUEVO: Si es cambio de lÃ­bero, actualizar el estado de lÃ­bero en pista
    if (substitutionType === 'libero') {
      const { updateLiberoOnCourt } = useMatchStore.getState()
      updateLiberoOnCourt(match.id, match.currentSet, playerInId)
    }

    onUpdateMatch(match.id, updateData)

    setShowSubstitutionPopup(false)

    // NUEVO: Si venimos de recepciÃ³n, volver al popup de recepciÃ³n
    if (cameFromReception) {
      setShowReceptionPopup(true)
      setCameFromReception(false)
    }
  }

  // NUEVO: Handler para abrir sustituciones desde recepción
  const handleRequestSubstitution = () => {
    setShowReceptionPopup(false)
    setShowSubstitutionPopup(true)
    setCameFromReception(true)
  }



  // NUEVO: Handler para designar líbero improvisado
  const handleLiberoDesignation = (playerId: string) => {
    const player = match.players.find(p => p.playerId === playerId)
    if (!player) return

    // 1. Activar el override en el store
    onUpdateMatch(match.id, {
      liberoOverrideActive: true,
      liberoOverridePlayerId: playerId,
      timeline: [
        ...(match.timeline || []),
        {
          id: `${Date.now()}-libero-override`,
          type: 'libero_override_activated',
          set: match.currentSet,
          timestamp: new Date().toISOString(),
          liberoOverride: {
            playerId
          }
        }
      ]
    })

    // 2. Actualizar el líbero en pista
    const { updateLiberoOnCourt } = useMatchStore.getState()
    updateLiberoOnCourt(match.id, match.currentSet, playerId)

    setShowSubstitutionPopup(false)
  }

  // NUEVO: Función para guardar estadísticas en Supabase al finalizar el partido
  const handleSaveMatchStats = async () => {
    if (!match.dbMatchId) {
      console.warn('[Stats] No dbMatchId for current match, skipping Supabase stats persist.')
      return
    }

    try {
      console.log('[Stats] Starting stats persistence for match:', match.dbMatchId)

      // Iterate over all sets that have been played (or started)
      const setsToProcess = match.sets.map(s => s.number)

      const statsPayloads = []

      for (const setNumber of setsToProcess) {
        for (const player of match.players) {
          // Filter actions for this player in this set
          const playerActions = match.acciones.filter(a =>
            a.set === setNumber &&
            (a.jugadoraId === player.playerId || a.recepcion?.jugadoraId === player.playerId)
          )

          // Calculate stats
          const serves = playerActions.filter(a => ['punto_saque', 'error_saque'].includes(a.tipo)).length
          const aces = playerActions.filter(a => a.tipo === 'punto_saque').length
          const serveErrors = playerActions.filter(a => a.tipo === 'error_saque').length

          const receptions = playerActions.filter(a => ['recepcion', 'error_recepcion'].includes(a.tipo)).length
          const receptionErrors = playerActions.filter(a => a.tipo === 'error_recepcion' || (a.tipo === 'recepcion' && a.recepcion?.esError)).length

          const attacks = playerActions.filter(a => ['punto_ataque', 'error_ataque', 'ataque_bloqueado'].includes(a.tipo)).length
          const kills = playerActions.filter(a => a.tipo === 'punto_ataque').length
          const attackErrors = playerActions.filter(a => ['error_ataque', 'ataque_bloqueado'].includes(a.tipo)).length

          const blocks = playerActions.filter(a => a.tipo === 'punto_bloqueo').length
          const blockErrors = playerActions.filter(a => a.tipo === 'error_bloqueo').length

          // Only add if there's at least one stat or if they were on court (optional, but good for completeness)
          // For now, we save if they have any recorded action in this set, or if we want to save 0s for everyone.
          // Requirement: "1 fila = 1 jugadora en 1 partido en 1 set". Implies saving for everyone?
          // Let's save for everyone to be safe, even with 0s.

          statsPayloads.push({
            match_id: match.dbMatchId,
            player_id: player.playerId,
            team_id: match.teamId || '', // Should be available
            season_id: match.season_id || '', // Should be available
            set_number: setNumber,
            serves,
            aces,
            serve_errors: serveErrors,
            receptions,
            reception_errors: receptionErrors,
            attacks,
            kills,
            attack_errors: attackErrors,
            blocks,
            block_errors: blockErrors,
            digs: 0, // Not tracked yet
            digs_errors: 0,
            sets: 0, // Not tracked yet
            set_errors: 0,
            notes: undefined
          })
        }
      }

      // Execute upserts in parallel or sequential? Sequential is safer for rate limits, but parallel is faster.
      // Supabase client handles batching? No, upsert accepts an array!
      // matchStatsService.upsertStatsForMatchPlayerSet takes a single object.
      // I should update the service to accept an array OR loop here.
      // The service defined in Phase 8A takes a single object params.
      // So I will loop and call it.

      // Check if we have team_id and season_id
      if (!match.teamId || !match.season_id) {
        console.warn('[Stats] Missing team_id or season_id, cannot save stats.')
        return
      }

      await Promise.all(statsPayloads.map(payload =>
        matchStatsService.upsertStatsForMatchPlayerSet({
          ...payload,
          team_id: match.teamId!,
          season_id: match.season_id!
        })
      ))

      console.log('[Stats] Successfully persisted stats to Supabase')

    } catch (err) {
      console.error('[Stats] Error al guardar estadísticas en Supabase', err)
      // No bloquear la UI ni romper el flujo del usuario
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Only show main UI if starters are configured OR starters modal is not open */}
      {(match.startingLineup || !showStartersModal) && (
        <>
          {/* Header & Scoreboard Section */}
          <div className="bg-gray-800 pb-6 pt-2 rounded-b-3xl shadow-lg mb-6">
            {/* Top Bar: Teams & Set */}
            <div className="flex items-center w-full px-4 mb-4">
              <span className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wider truncate text-left overflow-hidden whitespace-nowrap">
                {localTeamName}
              </span>

              <div className="mx-2 px-4 py-1 rounded-full bg-white text-[11px] font-semibold text-gray-900 uppercase tracking-widest shadow-sm">
                SET {match.currentSet}
              </div>

              <span className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wider truncate text-right overflow-hidden whitespace-nowrap">
                {visitorTeamName}
              </span>
            </div>

            {/* Main Scoreboard */}
            <div className="flex justify-center items-center gap-8">
              {/* Home Score */}
              <div className="relative">
                <span className="text-6xl font-bold tracking-tighter font-mono">
                  {homeScore}
                </span>
                {estadoSaque === 'myTeamServing' && isHomeTeam && (
                  <div className="absolute -right-4 top-2 w-3 h-3 bg-green-500 rounded-full shadow-glow-green animate-pulse" />
                )}
                {estadoSaque === 'myTeamReceiving' && !isHomeTeam && (
                  <div className="absolute -right-4 top-2 w-3 h-3 bg-green-500 rounded-full shadow-glow-green animate-pulse" />
                )}
              </div>

              <span className="text-gray-600 text-4xl font-light">-</span>

              {/* Away Score */}
              <div className="relative">
                <span className="text-6xl font-bold tracking-tighter font-mono">
                  {awayScore}
                </span>
                {estadoSaque === 'myTeamServing' && !isHomeTeam && (
                  <div className="absolute -right-4 top-2 w-3 h-3 bg-green-500 rounded-full shadow-glow-green animate-pulse" />
                )}
                {estadoSaque === 'myTeamReceiving' && isHomeTeam && (
                  <div className="absolute -right-4 top-2 w-3 h-3 bg-green-500 rounded-full shadow-glow-green animate-pulse" />
                )}
              </div>
            </div>
          </div>

          <div className="px-4 max-w-md mx-auto space-y-6">
            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column - Positive Actions (Green) */}
              <div className="space-y-3">
                {estadoSaque === 'myTeamServing' && (
                  <button
                    onClick={handleServePoint}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Target className="w-5 h-5" /> Punto saque
                  </button>
                )}
                <button
                  onClick={handleAttackPoint}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" /> Punto ataque
                </button>
                <button
                  onClick={handleBlockPoint}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Hand className="w-5 h-5" /> Punto bloqueo
                </button>
                <button
                  onClick={handleOpponentError}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" /> Error rival
                </button>
              </div>

              {/* Right Column - Negative/Opponent Actions (Red) */}
              <div className="space-y-3">
                {estadoSaque === 'myTeamServing' && (
                  <button
                    onClick={handleServeError}
                    className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" /> Error saque
                  </button>
                )}
                <button
                  onClick={handleAttackBlocked}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Ban className="w-5 h-5" /> Ataque bloqueado
                </button>
                <button
                  onClick={handleAttackError}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <TrendingDown className="w-5 h-5" /> Error ataque
                </button>
                <button
                  onClick={handleGenericError}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" /> Error genérico
                </button>
                <button
                  onClick={handleOpponentPoint}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-full font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" /> Punto rival
                </button>
              </div>
            </div>

            {/* Half-Court Rotation Display */}
            <LineupGrid
              players={displayRotationOrder.map((playerId, idx) => {
                const player = match.players.find(p => p.playerId === playerId)
                return {
                  id: playerId || '',
                  number: player?.number || 0,
                  name: player?.name || '',
                  position: player?.position || '',
                  isLibero: player?.position === 'L',
                  courtPosition: idx + 1
                }
              })}
              showCourtLines={true}
              size="small"
            />

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowSubstitutionPopup(true)}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-5 h-5" />
                Sustitución
              </button>

              <button
                onClick={handleUndo}
                disabled={actionHistory.length === 0}
                className={`py-3 px-4 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${actionHistory.length > 0
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
              >
                <Undo2 className="w-5 h-5" />
                <div className="flex flex-col items-start leading-tight">
                  <span>Deshacer</span>
                  <span className="text-[10px] font-normal opacity-75 truncate max-w-[100px]">
                    {getLastActionDescription() || 'Sin acciones'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <StartersManagement
        isOpen={showStartersModal}
        onClose={() => setShowStartersModal(false)}
        match={match}
        onSave={handleStartersSave}
        currentSet={match.currentSet}
        onNavigateBack={() => {
          // Volver exactamente al modal de fin del set previo
          if (match.currentSet === 1) {
            // Set 1: volver al paso 3 del wizard (selecciÃ³n jugadoras)
            if (onNavigateToWizardStep) {
              onNavigateToWizardStep(3)
            }
          } else if (match.currentSet >= 2) {
            const previousSetNumber = match.currentSet - 1
            // Cancelar preparaciÃ³n del nuevo set y volver al Live del set anterior tal como quedÃ³
            // 1) Eliminar cualquier set N+1 ya creado (0â€“0) de la estructura
            const filteredSets = (match.sets || []).filter(s => s.number <= previousSetNumber)
            const uniqueFilteredSets = filteredSets.filter((s, i, a) => a.findIndex(t => t.number === s.number) === i)

            onUpdateMatch(match.id, {
              currentSet: previousSetNumber,
              sets: uniqueFilteredSets
            })
            onUpdateMatch(match.id, {
              timeline: (() => {
                const tl = [...(match.timeline || [])]
                while (tl.length > 0) {
                  const last = tl[tl.length - 1] as any
                  if (last.set === previousSetNumber + 1 && (last.type === 'starters_open' || last.type === 'starters_confirmed' || last.type === 'serve_selection_chosen' || last.type === 'set_start')) {
                    tl.pop()
                    continue
                  }
                  break
                }
                tl.push({ id: `${Date.now()}-navigate_back_cancel_next_set`, type: 'navigate_back_cancel_next_set', set: previousSetNumber + 1, timestamp: new Date().toISOString() })
                return tl
              })()
            })
            setShowSetCompleteModal(false)
            setPendingSetCompletion(null)
            // Cerrar selecciÃ³n de titulares
            setShowStartersModal(false)
          }
        }}
        onServeSelection={(weServeFirst) => {
          // Handle serve selection for Set 5
          const miEquipo = match.teamSide
          const equipoContrario = miEquipo === 'local' ? 'visitante' : 'local'
          const startingServer = weServeFirst ? miEquipo : equipoContrario
          const startingServerForStore = startingServer === 'visitante' ? 'visitor' : startingServer

          onUpdateMatch(match.id, { sacadorInicialSet5: startingServerForStore })
        }}
        sacadorInicialSet5={match.sacadorInicialSet5}
      />

      <PlayerSelectionPopup
        isOpen={showPlayerSelection}
        onClose={handleCancelPlayerSelection}
        onSelectPlayer={handlePlayerSelection}
        match={match}
        actionType={pendingAction?.action || ''}
        displayRotationOrder={displayRotationOrder}
        currentRotationOrder={currentRotationOrder}
        estadoSaque={estadoSaque || 'myTeamServing'}
        isServeAction={pendingAction?.isServeAction}
      />

      <ReceptionPopup
        isOpen={showReceptionPopup}
        onClose={() => setShowReceptionPopup(false)}
        onSelectReception={handleReceptionSelection}
        match={match}
        displayRotationOrder={displayRotationOrder}
        currentRotationOrder={currentRotationOrder}
        onUndo={handleReceptionUndo}
        onRequestSubstitution={handleRequestSubstitution}

      />

      <SubstitutionPopup
        isOpen={showSubstitutionPopup}
        onClose={() => setShowSubstitutionPopup(false)}
        onConfirm={handleSubstitution}
        onDesignateLibero={handleLiberoDesignation}
        match={match}
        currentRotationOrder={currentRotationOrder}
      />

      {/* Set Complete Modal */}
      {showSetCompleteModal && pendingSetCompletion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-700 overflow-hidden">
            <div className="bg-gray-900 p-6 text-center border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Fin de Set {pendingSetCompletion?.setNumber}</h3>
            </div>
            <div className="p-8 text-center">
              <div className="text-5xl font-bold text-white mb-2 font-mono">
                {pendingSetCompletion?.homeScore} - {pendingSetCompletion?.awayScore}
              </div>
              <p className="text-gray-400">Marcador final</p>
            </div>
            <div className="flex p-4 gap-3 bg-gray-900/50">
              <button
                onClick={handleSetCompleteUndo}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
              >
                Deshacer
              </button>
              <button
                onClick={handleSetComplete}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Complete Modal */}
      {showMatchCompleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 overflow-hidden">
            <div className="p-8 text-center">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">Partido Finalizado</h3>
              <div className="text-lg text-gray-300 font-medium">
                {(derivedSetsWonLocal === 3 ? localTeamName : visitorTeamName)} gana el partido
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="bg-gray-900/50 rounded-xl p-4 space-y-2">
                {match.sets.map((set) => (
                  <div key={set.id} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                    <span className="text-gray-400 font-medium">Set {set.number}</span>
                    <span className="text-white font-bold font-mono">
                      {localTeamName} {set.homeScore}  {set.awayScore} {visitorTeamName}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-between items-center p-4 bg-emerald-900/30 border border-emerald-800 rounded-xl">
                <span className="text-emerald-100 font-bold">Total Sets</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {localTeamName} {derivedSetsWonLocal}  {derivedSetsWonVisitor} {visitorTeamName}
                </span>
              </div>
            </div>

            <div className="flex p-4 gap-3 bg-gray-900 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowMatchCompleteModal(false)
                  handleUndo()
                }}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
              >
                Deshacer
              </button>
              <button
                onClick={async () => {
                  setShowMatchCompleteModal(false)
                  // Persist stats to Supabase
                  await handleSaveMatchStats()
                  onUpdateMatch(match.id, { status: 'completed' })
                  onNavigateToMatches()
                }}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
              >
                Guardar Partido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-green-400 p-2 text-[10px] font-mono border-t border-green-900 max-h-40 overflow-y-auto opacity-80 hover:opacity-100 transition-opacity z-50">
        <details>
          <summary className="cursor-pointer font-bold hover:text-green-300 select-none">
            🐞 DEBUG PANEL (Click to expand) - Timeline Events: {(match.timeline || []).length}
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <p>Set: {getDebugData().setActual}</p>
              <p>Score: {getDebugData().marcador}</p>
              <p>Serve: {estadoSaque}</p>
              <p>Rotation: {rotation}</p>
              <p>Libero Override: {match.liberoOverrideActive ? 'YES' : 'NO'}</p>
            </div>
            <div>
              <p className="font-bold mb-1">Last 3 Events:</p>
              <ul className="list-disc pl-4 space-y-1">
                {[...(match.timeline || [])].reverse().slice(0, 3).map((e, i) => (
                  <li key={i}>
                    [{e.type}] {e.type === 'rally' ? `${e.scoreAfter?.home}-${e.scoreAfter?.away}` : ''}
                    {e.type === 'substitution' ? `Sub: ${e.substitution?.playerOutId?.slice(0, 8)} -> ${e.substitution?.playerInId?.slice(0, 8)}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
