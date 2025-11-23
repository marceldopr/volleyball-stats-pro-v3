import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Search, X } from 'lucide-react'
import { useTeamStore, Team, Player } from '@/stores/teamStore'
import { TeamForm } from '@/components/teams/TeamForm'
import { PlayerForm } from '@/components/teams/PlayerForm'
import { PlayerEditForm } from '@/components/teams/PlayerEditForm'
import { POSITION_NAMES } from '@/constants'


export function Teams() {
  const { teams, setCurrentTeam, deleteTeam, deletePlayer, initializeTestTeam } = useTeamStore()
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  const [showPlayerEditForm, setShowPlayerEditForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (!selectedTeam) return
    const updated = teams.find(t => t.id === selectedTeam.id)
    if (updated) setSelectedTeam(updated)
  }, [teams, selectedTeam])

  // Initialize test team if no teams exist
  useEffect(() => {
    if (teams.length === 0) {
      initializeTestTeam()
    }
  }, [])

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    setShowTeamForm(true)
  }

  const handleDeleteTeam = (team: Team) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el equipo "${team.name}"?`)) {
      deleteTeam(team.id)
      // toast.success('Equipo eliminado correctamente')
    }
  }

  const handleManagePlayers = (team: Team) => {
    setSelectedTeam(team)
    setCurrentTeam(team)
  }

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player)
    setShowPlayerEditForm(true)
  }

  const handleDeletePlayer = (player: any) => {
    if (confirm(`¿Estás seguro de que quieres eliminar a "${player.name}"?`)) {
      deletePlayer(selectedTeam!.id, player.id)
      // toast.success('Jugadora eliminada correctamente')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h1>
          <p className="text-sm text-gray-500 mt-1">Administra tus plantillas y jugadoras</p>
        </div>
        <button
          onClick={() => setShowTeamForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Equipo</span>
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar equipos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Lista de equipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div key={team.id} className="card hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{team.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge bg-gray-100 text-gray-700 border border-gray-200">
                    {team.category === 'female' ? 'Femenino' : team.category === 'male' ? 'Masculino' : 'Mixto'}
                  </span>
                  <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                    {team.ageGroup}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEditTeam(team)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTeam(team)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{team.players.length} jugadoras</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(team.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="space-y-2 mb-4 min-h-[100px]">
              {team.players.slice(0, 3).map((player) => (
                <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white flex-shrink-0">
                    {player.number}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-900 truncate">{player.name}</span>
                    <span title={POSITION_NAMES[player.role]} className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit ${player.role === 'L' ? 'badge-libero' : 'badge-position'}`}>
                      {player.role}
                    </span>
                  </div>
                </div>
              ))}
              {team.players.length > 3 && (
                <p className="text-xs text-center text-gray-400 font-medium py-1">
                  +{team.players.length - 3} jugadoras más
                </p>
              )}
              {team.players.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-4 text-gray-400">
                  <Users className="w-8 h-8 mb-2 opacity-20" />
                  <span className="text-xs">Sin jugadoras</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleManagePlayers(team)}
              className="w-full btn-secondary text-sm py-2"
            >
              Gestionar Plantilla
            </button>
          </div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay equipos</h3>
          <p className="text-gray-600 mb-4">Crea tu primer equipo para comenzar</p>
          <button
            onClick={() => setShowTeamForm(true)}
            className="btn-primary"
          >
            Crear Equipo
          </button>
        </div>
      )}

      {/* Modal de formulario de equipo */}
      {showTeamForm && (
        <TeamForm
          team={editingTeam}
          onClose={() => {
            setShowTeamForm(false)
            setEditingTeam(null)
          }}
        />
      )}

      {/* Modal de gestión de jugadoras */}
      {selectedTeam && (
        <div className="modal-overlay">
          <div className="modal-container max-w-2xl max-h-[90vh] flex flex-col">
            <div className="modal-header flex justify-between items-center">
              <h2 className="modal-title">Jugadoras de {selectedTeam.name}</h2>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-header mb-0">Plantilla Actual</h3>
                <button
                  onClick={() => setShowPlayerForm(true)}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir Jugadora
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedTeam.players.map((player) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all group">
                    <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 border-2 border-white">
                      <span className="text-xl font-bold text-white">{player.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate text-base">{player.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span title={POSITION_NAMES[player.role]} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${player.role === 'L' ? 'badge-libero' : 'badge-position'}`}>
                          {player.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditPlayer(player)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {selectedTeam.players.length === 0 && (
                  <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay jugadoras en este equipo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de formulario de jugadora */}
      {showPlayerForm && selectedTeam && (
        <PlayerForm
          teamId={selectedTeam.id}
          onClose={() => setShowPlayerForm(false)}
        />
      )}

      {/* Modal de edición de jugadora */}
      {showPlayerEditForm && editingPlayer && selectedTeam && (
        <PlayerEditForm
          player={editingPlayer}
          teamId={selectedTeam.id}
          onClose={() => {
            setShowPlayerEditForm(false)
            setEditingPlayer(null)
          }}
          onSave={() => {
            // La lista se actualizará automáticamente gracias a Zustand
          }}
        />
      )}
    </div>
  )
}