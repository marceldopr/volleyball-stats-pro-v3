
import { Users, Trophy, BarChart3 } from 'lucide-react'
import { useTeamStore } from '@/stores/teamStore'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const { currentTeam } = useTeamStore()

  const mainActions = [
    { name: 'Equipos', icon: Users, href: '/teams', color: 'bg-blue-600', description: 'Gestiona tus equipos' },
    { name: 'Partidos', icon: Trophy, href: '/matches', color: 'bg-primary-600', description: 'Ver y crear partidos' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con Logo y Título */}
      <div className="bg-gray-900 shadow-lg border-b border-gray-800">
        <div className="container-custom py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/20">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Volleyball Stats Pro V3
              </h1>
              <p className="text-sm text-gray-400 font-medium">
                Análisis profesional de rendimiento
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8 space-y-8">
        {/* Botones principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mainActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 overflow-hidden"
            >
              <div className="p-6 flex items-center gap-6">
                <div className={`w-16 h-16 ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {action.description}
                  </p>
                </div>
              </div>
              <div className={`absolute top-0 right-0 w-32 h-32 ${action.color} opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500`}></div>
            </Link>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Último partido */}
          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary-600" />
                Último Partido
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">CV Barcelona</span>
                <span className="badge-position bg-primary-100 text-primary-800">3-1</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                <span>15 Enero 2024</span>
                <Link to="/matches" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  Ver detalles <span className="text-xs">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Último análisis */}
          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent-600" />
                Último Análisis
              </h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">vs CV Barcelona</p>
                <p className="text-xs text-gray-500">Reporte de rendimiento</p>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                <span>Hace 2 días</span>
                <Link to="/analytics" className="text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1">
                  Ver análisis <span className="text-xs">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Último equipo usado */}
          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Último Equipo
              </h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">CV Valencia Fem</p>
                  <p className="text-xs text-gray-500">12 jugadoras</p>
                </div>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-700 shadow-sm">
                  12
                </div>
              </div>
              <div className="flex justify-end px-1">
                <Link to="/teams" className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1">
                  Gestionar <span className="text-xs">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas generales */}
        {currentTeam && (
          <div className="card">
            <h3 className="section-header mb-4">Estadísticas de Temporada</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
                <div className="text-2xl font-bold text-gray-900 mb-1">{currentTeam.players.length}</div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Jugadoras</div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl text-center border border-green-100">
                <div className="text-2xl font-bold text-green-700 mb-1">12</div>
                <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Victorias</div>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
                <div className="text-2xl font-bold text-red-700 mb-1">3</div>
                <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Derrotas</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                <div className="text-2xl font-bold text-blue-700 mb-1">80%</div>
                <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Win Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}