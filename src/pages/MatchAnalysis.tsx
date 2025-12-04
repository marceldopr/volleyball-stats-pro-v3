import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Calendar, Clock, Loader2 } from 'lucide-react'
import { useMatchStore } from '../stores/matchStore'
import { AccionPartido, Equipo, Match } from '../stores/matchStore'
import { matchService } from '../services/matchService'
import { teamService } from '../services/teamService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { cn } from '@/lib/utils'

export function MatchAnalysis() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { matches } = useMatchStore()

  const [match, setMatch] = useState<Match | undefined>(matches.find(m => m.id === id))
  const [loading, setLoading] = useState(!match || (match?.players?.length === 0))
  const [teamName, setTeamName] = useState<string | null>(null)

  useEffect(() => {
    const loadMatch = async () => {
      if (!id) return

      // Always fetch fresh data to ensure we have the latest stats and details
      setLoading(true)
      try {
        const fetchedMatch = await matchService.getMatchFullDetails(id)
        if (fetchedMatch) {
          setMatch(fetchedMatch)

          // Load team name from Supabase
          if (fetchedMatch.teamId) {
            try {
              const team = await teamService.getTeamById(fetchedMatch.teamId)
              if (team) {
                setTeamName(getTeamDisplayName(team))
              }
            } catch (err) {
              console.error('Error loading team:', err)
            }
          }
        }
      } catch (err) {
        console.error('Error loading match analysis:', err)
      } finally {
        setLoading(false)
      }
    }
    loadMatch()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Partido no encontrado</h2>
          <button
            onClick={() => navigate('/matches')}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a partidos</span>
          </button>
        </div>
      </div>
    )
  }

  const isHomeTeam = match.teamSide === 'local'

  // Team names - use loaded team name instead of store
  const localTeamName = isHomeTeam ? (teamName || 'Mi Equipo') : match.opponent
  const visitorTeamName = isHomeTeam ? match.opponent : (teamName || 'Mi Equipo')

  // Determine sets won if not explicit
  let setsWonLocal = match.setsWonLocal || 0
  let setsWonVisitor = match.setsWonVisitor || 0

  if (setsWonLocal === 0 && setsWonVisitor === 0 && match.sets.length > 0) {
    match.sets.forEach(set => {
      if (set.homeScore > set.awayScore) setsWonLocal++
      if (set.awayScore > set.homeScore) setsWonVisitor++
    })
  }

  // If still 0-0 but we have a result string like "3-1", parse it
  if (setsWonLocal === 0 && setsWonVisitor === 0 && match.result) {
    const parts = match.result.split('-')
    if (parts.length === 2) {
      setsWonLocal = parseInt(parts[0]) || 0
      setsWonVisitor = parseInt(parts[1]) || 0
    }
  }

  // Action type labels for display
  const actionLabels: Record<string, string> = {
    'punto_saque': 'Ace',
    'error_saque': 'Error Saque',
    'punto_ataque': 'Ataque',
    'ataque_bloqueado': 'Bloqueado',
    'error_ataque': 'Error Ataque',
    'punto_bloqueo': 'Bloqueo',
    'error_recepcion': 'Error Recep',
    'error_generico': 'Error',
    'error_rival': 'Error Rival',
    'punto_rival': 'Punto Rival'
  }

  // Calculate action summary
  const calcularResumen = (acciones: AccionPartido[]) => {
    const resumen = {
      local: {} as Record<string, number>,
      visitante: {} as Record<string, number>,
    }

    for (const accion of acciones) {
      const bucket = resumen[accion.equipo as Equipo]
      if (bucket) {
        bucket[accion.tipo] = (bucket[accion.tipo] || 0) + 1
      }
    }

    return resumen
  }

  const resumenAcciones = calcularResumen(match.acciones || [])
  const hasActionData = match.acciones && match.acciones.length > 0

  // Calculate individual player statistics
  const calcularEstadisticasJugadora = (acciones: AccionPartido[], playerId: string) => {
    // If we have stats in the player object (loaded from Supabase), use them
    const player = match.players.find(p => p.playerId === playerId)
    if (player && player.stats && (!acciones || acciones.length === 0)) {
      const s = player.stats
      const puntosAFavor = s.aces + s.kills + s.blocks
      const erroresPropios = s.serveErrors + s.attackErrors + s.receptionErrors + s.blockErrors + s.setErrors + s.digsErrors
      return {
        puntosAFavor,
        erroresPropios,
        balanceNeto: puntosAFavor - erroresPropios
      }
    }

    let puntosAFavor = 0
    let erroresPropios = 0

    for (const accion of acciones) {
      if (accion.jugadoraId === playerId) {
        // Puntos a favor: punto_saque, punto_ataque, punto_bloqueo
        if (accion.tipo === 'punto_saque' || accion.tipo === 'punto_ataque' || accion.tipo === 'punto_bloqueo') {
          puntosAFavor++
        }
        // Errores propios: error_saque, error_ataque, error_recepcion
        else if (accion.tipo === 'error_saque' || accion.tipo === 'error_ataque' || accion.tipo === 'error_recepcion') {
          erroresPropios++
        }
      }
    }

    return {
      puntosAFavor,
      erroresPropios,
      balanceNeto: puntosAFavor - erroresPropios
    }
  }

  // Calculate team reception statistics
  const calcularEstadisticasRecepcion = (acciones: AccionPartido[]) => {
    const recepcionesPorJugadora: Record<string, number[]> = {}
    let totalRecepciones = 0
    let sumaCalificaciones = 0

    // If no actions, try to use aggregated stats if available (limited accuracy for average)
    if (!acciones || acciones.length === 0) {
      const playerAverages = match.players
        .filter(p => p.stats.receptions > 0)
        .map(p => ({
          playerId: p.playerId,
          name: p.name,
          receptions: p.stats.receptions,
          average: 0 // Cannot calculate average without individual ratings
        }))
        .sort((a, b) => b.receptions - a.receptions)

      return {
        teamAverage: null,
        playerAverages
      }
    }

    for (const accion of acciones) {
      // Recepciones registradas (calificaciones 1-4)
      if (accion.recepcion && accion.equipo === match.teamSide) {
        const playerId = accion.recepcion.jugadoraId
        const calificacion = accion.recepcion.calificacion

        if (!recepcionesPorJugadora[playerId]) {
          recepcionesPorJugadora[playerId] = []
        }
        recepcionesPorJugadora[playerId].push(calificacion)

        sumaCalificaciones += calificacion
        totalRecepciones++
      }
      // Errores de recepción (valor 0) deben contarse como recepciones con calificación 0
      else if (
        accion.tipo === 'error_recepcion' &&
        accion.equipo === match.teamSide &&
        accion.jugadoraId
      ) {
        const playerId = accion.jugadoraId
        const calificacion = 0

        if (!recepcionesPorJugadora[playerId]) {
          recepcionesPorJugadora[playerId] = []
        }
        recepcionesPorJugadora[playerId].push(calificacion)

        sumaCalificaciones += calificacion
        totalRecepciones++
      }
    }

    const mediaEquipo = totalRecepciones > 0 ? sumaCalificaciones / totalRecepciones : null

    // Calculate individual player reception averages
    const mediasJugadoras = Object.entries(recepcionesPorJugadora)
      .map(([playerId, calificaciones]) => {
        const player = match.players.find(p => p.playerId === playerId)
        const suma = calificaciones.reduce((acc, cal) => acc + cal, 0)
        const media = suma / calificaciones.length

        return {
          playerId,
          name: player?.name || 'Jugadora desconocida',
          receptions: calificaciones.length,
          average: media
        }
      })
      .filter(jugadora => jugadora.receptions > 0)
      .sort((a, b) => b.average - a.average)

    return {
      teamAverage: mediaEquipo,
      playerAverages: mediasJugadoras
    }
  }

  // Prepare player list for table
  const jugadorasConParticipacion = match.players.map(player => {
    const estadisticas = calcularEstadisticasJugadora(match.acciones || [], player.playerId)

    // Calculate sets played if actions available, otherwise use stats
    let setsJugados = player.stats.sets || 0
    if (match.acciones && match.acciones.length > 0) {
      const sets = new Set<number>()
      match.acciones.forEach(a => {
        if (a.jugadorasEnCanchaIds?.includes(player.playerId)) {
          sets.add(a.set)
        }
      })
      setsJugados = sets.size
    }

    // Calculate points played if actions available
    let puntosJugados = 0
    if (match.acciones && match.acciones.length > 0) {
      match.acciones.forEach(a => {
        if (a.jugadorasEnCanchaIds?.includes(player.playerId)) {
          puntosJugados++
        }
      })
    }

    return {
      playerId: player.playerId,
      name: player.name,
      number: player.number,
      position: player.position,
      puntosJugados, // Only accurate with actions
      setsJugados,
      ...estadisticas
    }
  })
    .filter(p => p.puntosAFavor > 0 || p.erroresPropios > 0 || p.setsJugados > 0 || p.puntosJugados > 0)
    .sort((a, b) => b.puntosAFavor - a.puntosAFavor)

  const estadisticasRecepcion = calcularEstadisticasRecepcion(match.acciones || [])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/matches')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a partidos
          </button>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1.5" />
              {new Date(match.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1.5" />
              {match.time}
            </div>
            {/* Location removed - no longer displayed */}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 py-4">
          {/* Local Team */}
          <div className="text-center flex-1">
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{localTeamName}</div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Local</div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-6">
            <div className="text-5xl md:text-6xl font-bold text-primary-600 tabular-nums">
              {setsWonLocal}
            </div>
            <div className="text-3xl text-gray-300 font-light">-</div>
            <div className="text-5xl md:text-6xl font-bold text-gray-900 tabular-nums">
              {setsWonVisitor}
            </div>
          </div>

          {/* Visitor Team */}
          <div className="text-center flex-1">
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{visitorTeamName}</div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Visitante</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sets & Actions */}
        <div className="space-y-6 lg:col-span-1">
          {/* Sets Score Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900 flex items-center">
                <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                Marcador por Sets
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Set</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">{localTeamName}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">{visitorTeamName}</th>
                  </tr>
                </thead>
                <tbody>
                  {match.sets.map((set) => {
                    // Check if we have actual scores or just placeholders
                    const hasScores = set.homeScore !== undefined && set.awayScore !== undefined && (set.homeScore > 0 || set.awayScore > 0)

                    return (
                      <tr key={set.id} className="border-b border-gray-50 last:border-b-0">
                        <td className="py-3 px-4 font-medium text-gray-500">Set {set.number}</td>
                        <td className="py-3 px-4 text-center font-semibold">
                          {hasScores ? set.homeScore : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">
                          {hasScores ? set.awayScore : '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {match.sets.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500 italic">
                        No hay detalles de sets disponibles
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Resumen de Acciones</h2>
            </div>

            {!hasActionData ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No hay acciones detalladas registradas.
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 gap-4">
                {/* Local */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-2 text-center">{localTeamName}</div>
                  <div className="space-y-1">
                    {Object.entries(resumenAcciones.local).map(([tipo, count]) => (
                      <div key={tipo} className="flex justify-between text-sm">
                        <span className="text-gray-600">{actionLabels[tipo] || tipo}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Visitor */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-2 text-center">{visitorTeamName}</div>
                  <div className="space-y-1">
                    {Object.entries(resumenAcciones.visitante).map(([tipo, count]) => (
                      <div key={tipo} className="flex justify-between text-sm">
                        <span className="text-gray-600">{actionLabels[tipo] || tipo}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Player Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player Participation Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Estadísticas Individuales</h2>
            </div>

            {jugadorasConParticipacion.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay estadísticas de jugadoras disponibles.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Jugadora</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-500">Sets</th>
                      <th className="text-center py-3 px-2 font-medium text-green-600">Pts</th>
                      <th className="text-center py-3 px-2 font-medium text-red-600">Err</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-900">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugadorasConParticipacion.map((jugadora) => (
                      <tr key={jugadora.playerId} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-400">{jugadora.number}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{jugadora.name}</div>
                          <div className="text-xs text-gray-500">{jugadora.position}</div>
                        </td>
                        <td className="py-3 px-2 text-center text-gray-600">{jugadora.setsJugados}</td>
                        <td className="py-3 px-2 text-center font-bold text-green-600 bg-green-50/30">{jugadora.puntosAFavor}</td>
                        <td className="py-3 px-2 text-center font-medium text-red-500 bg-red-50/30">{jugadora.erroresPropios}</td>
                        <td className={cn(
                          "py-3 px-2 text-center font-bold",
                          (jugadora.balanceNeto || 0) > 0 ? "text-green-600" : (jugadora.balanceNeto || 0) < 0 ? "text-red-600" : "text-gray-400"
                        )}>
                          {(jugadora.balanceNeto || 0) > 0 ? '+' : ''}{jugadora.balanceNeto}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reception Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Rendimiento en Recepción</h2>
              {estadisticasRecepcion.teamAverage !== null && (
                <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  Media Equipo: {estadisticasRecepcion.teamAverage.toFixed(2)}
                </span>
              )}
            </div>

            {!hasActionData || estadisticasRecepcion.playerAverages.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No hay datos detallados de recepción.
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {estadisticasRecepcion.playerAverages.map((jugadora) => (
                  <div key={jugadora.playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">{jugadora.name}</div>
                      <div className="text-xs text-gray-500">{jugadora.receptions} recepciones</div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {jugadora.average.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
