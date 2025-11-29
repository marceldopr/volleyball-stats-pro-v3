import { Trophy, Users, Clock, Award, Heart } from 'lucide-react'

export function About() {
  const features = [
    {
      icon: Trophy,
      title: "Análisis Profesional",
      description: "Estadísticas detalladas y análisis táctico al nivel de software profesional"
    },
    {
      icon: Users,
      title: "Diseño Intuitivo",
      description: "Interfaz pensada para entrenadores, usable con una sola mano en la pista"
    },
    {
      icon: Clock,
      title: "Real Time",
      description: "Scouting en vivo con registro instantáneo de todas las acciones"
    },
    {
      icon: Award,
      title: "IA Táctica",
      description: "Recomendaciones inteligentes basadas en el análisis del partido"
    }
  ]

  const team = [
    {
      name: "Volleyball Stats Pro Team",
      role: "Desarrollo & Diseño",
      description: "Equipo apasionado por el voleibol y la tecnología"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Volleyball Stats Pro V3
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Enhanced Clone - La aplicación definitiva para el análisis de voleibol,
            superando en diseño, funcionalidad y usabilidad a las soluciones existentes.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Version Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Información de la Aplicación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Versión</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li><strong>Versión actual:</strong> 1.0.0</li>
                <li><strong>Fecha de lanzamiento:</strong> Noviembre 2024</li>
                <li><strong>Plataforma:</strong> Web PWA</li>
                <li><strong>Idiomas:</strong> Español, Inglés</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Características Técnicas</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Funciona sin conexión (PWA)</li>
                <li>• Sincronización en tiempo real</li>
                <li>• Exportación múltiple formatos</li>
                <li>• Diseño responsive</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Equipo de Desarrollo</h2>
          <div className="space-y-4">
            {team.map((member, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{member.role}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-3">
            ¿Tienes alguna pregunta?
          </h2>
          <p className="text-red-800 dark:text-red-200 mb-4">
            Estamos aquí para ayudarte. Si tienes dudas, sugerencias o necesitas soporte,
            no dudes en contactarnos.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
              Contactar Soporte
            </button>
            <button className="px-6 py-3 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-800 transition-colors">
              Ver Documentación
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 dark:text-gray-400">
          <p>© 2024 Volleyball Stats Pro V3. Desarrollado con ❤️ para la comunidad del voleibol.</p>
        </div>
      </div>
    </div>
  )
}
