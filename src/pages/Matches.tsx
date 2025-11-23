import { useState, useEffect } from 'react'
import { Plus, Calendar, Trophy, Clock, Eye, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useMatchStore } from '../stores/matchStore'
import { MatchWizard } from '../components/MatchWizard'
import { MatchDetail } from '../components/MatchDetail'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function Matches() {
  const { id } = useParams()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<any>(null)
  const { matches: storeMatches, deleteMatch } = useMatchStore()

  // Auto-select match if ID is provided in URL
  useEffect(() => {
    if (id) {
      const match = storeMatches.find(m => m.id === id)
      if (match) {
        setSelectedMatch(match)
      }
    }
  }, [id, storeMatches])

  const handleDeleteClick = (match: any) => {
    setMatchToDelete(match)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (matchToDelete) {
      try {
        deleteMatch(matchToDelete.id)
        // If we're viewing the deleted match, close its detail
        if (selectedMatch?.id === matchToDelete.id) {
          setSelectedMatch(null)
        }
      } catch (error) {
        alert('No se ha podido eliminar el partido. Inténtalo de nuevo.')
      }
    }
    setDeleteConfirmOpen(false)
    setMatchToDelete(null)
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setMatchToDelete(null)
  }

  // Use store matches directly - no demo data

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'live': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Próximo'
      case 'live': return 'En Vivo'
      case 'completed': return 'Finalizado'
      default: return 'Desconocido'
    }
  }

  const shouldEndSet = (setNumber: number, homeScore: number, awayScore: number): boolean => {
    const targetScore = setNumber === 5 ? 15 : 25
    const maxScore = Math.max(homeScore, awayScore)
    const diff = Math.abs(homeScore - awayScore)
    return maxScore >= targetScore && diff >= 2
  }

  const getFinalResult = (m: any): string => {
    const setsValidos = (m.sets || []).filter((set: any) => {
      const totalPuntos = (set.homeScore || 0) + (set.awayScore || 0)
      const esMarcadorValido = totalPuntos > 0 && shouldEndSet(set.number, set.homeScore, set.awayScore)
      return set.status === 'completed' || esMarcadorValido
    })
    const setsGanadosLocal = setsValidos.filter((s: any) => s.homeScore > s.awayScore).length
    const setsGanadosVisitante = setsValidos.filter((s: any) => s.awayScore > s.homeScore).length
    return `${setsGanadosLocal} – ${setsGanadosVisitante}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona tu calendario y resultados</p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Partido</span>
        </button>
      </div>

      {/* Lista de partidos */}
      <div className="space-y-4">
        {storeMatches.map((match) => (
          <div key={match.id} className="card hover:shadow-md transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{match.opponent}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${match.teamSide === 'local'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                    {match.teamSide === 'local' ? 'Local' : 'Visitante'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{new Date(match.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{match.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 flex items-center justify-center">📍</div>
                    <span>{match.location}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(match.status)}`}>
                    {getStatusText(match.status)}
                  </span>
                  {match.status === 'completed' && (
                    <div className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                      {getFinalResult(match)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteClick(match)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Eliminar partido"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedMatch(match)}
                className="btn-secondary text-sm py-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver detalles
              </button>

              {match.status === 'upcoming' && (
                <Link
                  to={`/matches/${match.id}/live`}
                  className="btn-primary text-sm py-2"
                >
                  Comenzar Partido
                </Link>
              )}
              {match.status === 'live' && (
                <Link
                  to={`/matches/${match.id}/live`}
                  className="btn-action-danger text-sm py-2 animate-pulse"
                >
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  Ver en Vivo
                </Link>
              )}
              {match.status === 'completed' && (
                <Link
                  to={`/matches/${match.id}/analysis`}
                  className="btn-outline text-sm py-2"
                >
                  Ver Análisis
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {storeMatches.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Todavía no has creado ningún partido.</h3>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="btn-primary"
          >
            Crear nuevo partido
          </button>
        </div>
      )}

      <MatchWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />

      {selectedMatch && (
        <MatchDetail
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Eliminar partido"
        message="¿Seguro que quieres eliminar este partido? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmButtonClassName="btn-primary bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  )
}