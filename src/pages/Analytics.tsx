import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Target, Award } from 'lucide-react'

const performanceData = [
  { name: 'Ataque', value: 75, color: '#D7263D' },
  { name: 'Recepción', value: 82, color: '#10B981' },
  { name: 'Saque', value: 68, color: '#F59E0B' },
  { name: 'Bloqueo', value: 71, color: '#3B82F6' },
]

const playerStats = [
  { name: 'María García', attack: 85, receive: 90, serve: 75, block: 70 },
  { name: 'Ana Rodríguez', attack: 78, receive: 82, serve: 88, block: 75 },
  { name: 'Laura Martínez', attack: 92, receive: 75, serve: 70, block: 85 },
  { name: 'Sofía López', attack: 70, receive: 88, serve: 82, block: 68 },
]

const rotationData = [
  { rotation: 'R1', points: 25, efficiency: 78 },
  { rotation: 'R2', points: 22, efficiency: 72 },
  { rotation: 'R3', points: 28, efficiency: 85 },
  { rotation: 'R4', points: 30, efficiency: 88 },
  { rotation: 'R5', points: 24, efficiency: 75 },
  { rotation: 'R6', points: 26, efficiency: 80 },
]

export function Analytics() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Análisis y Estadísticas</h1>
        <div className="flex space-x-2">
          <select className="input">
            <option>Últimos 5 partidos</option>
            <option>Temporada completa</option>
            <option>Último mes</option>
          </select>
        </div>
      </div>

      {/* Tarjetas de estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Porcentaje de Victorias</p>
              <p className="text-3xl font-bold text-green-600">75%</p>
              <p className="text-sm text-gray-500">15/20 partidos</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Puntos por Set</p>
              <p className="text-3xl font-bold text-blue-600">23.5</p>
              <p className="text-sm text-gray-500">Promedio</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eficiencia en Ataque</p>
              <p className="text-3xl font-bold text-red-600">42%</p>
              <p className="text-sm text-gray-500">+5% vs última semana</p>
            </div>
            <Award className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Jugadoras Activas</p>
              <p className="text-3xl font-bold text-purple-600">12</p>
              <p className="text-sm text-gray-500">2 lesionadas</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimiento por habilidad */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Rendimiento por Habilidad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#D7263D" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Estadísticas por jugadora */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Estadísticas por Jugadora</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={playerStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="attack" fill="#D7263D" name="Ataque" />
              <Bar dataKey="receive" fill="#10B981" name="Recepción" />
              <Bar dataKey="serve" fill="#F59E0B" name="Saque" />
              <Bar dataKey="block" fill="#3B82F6" name="Bloqueo" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Análisis por rotaciones */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Análisis por Rotaciones</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rotationData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rotation" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="points" fill="#D7263D" name="Puntos" />
            <Bar dataKey="efficiency" fill="#10B981" name="Eficiencia %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de estadísticas detalladas */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Estadísticas Detalladas por Jugadora</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">Jugadora</th>
                <th className="text-center py-3 px-4 font-semibold">Ataque</th>
                <th className="text-center py-3 px-4 font-semibold">Recepción</th>
                <th className="text-center py-3 px-4 font-semibold">Saque</th>
                <th className="text-center py-3 px-4 font-semibold">Bloqueo</th>
                <th className="text-center py-3 px-4 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((player, index) => {
                const total = player.attack + player.receive + player.serve + player.block
                return (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{player.name}</td>
                    <td className="text-center py-3 px-4">{player.attack}%</td>
                    <td className="text-center py-3 px-4">{player.receive}%</td>
                    <td className="text-center py-3 px-4">{player.serve}%</td>
                    <td className="text-center py-3 px-4">{player.block}%</td>
                    <td className="text-center py-3 px-4 font-semibold">{total}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights de IA */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-4 text-blue-900">Insights de Inteligencia Artificial</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-blue-900">La rotación 4 muestra el mejor rendimiento ofensivo con 88% de eficiencia.</p>
              <p className="text-sm text-blue-700 mt-1">Recomendación: Intenta mantener esta rotación durante momentos clave del partido.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-blue-900">María García tiene un rendimiento excepcional en recepción (90%).</p>
              <p className="text-sm text-blue-700 mt-1">Considera aumentar su participación en recepciones difíciles.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-blue-900">El saque muestra oportunidad de mejora con solo 68% de efectividad.</p>
              <p className="text-sm text-blue-700 mt-1">Sugiere enfocar práctica en técnica de saque y precisión.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
