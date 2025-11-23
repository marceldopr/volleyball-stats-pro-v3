import { Download, FileText, FileSpreadsheet, Database } from 'lucide-react'

export function Exports() {
  const exportOptions = [
    {
      title: "Análisis Completo (PDF)",
      description: "Exporta un informe profesional en PDF con estadísticas detalladas, gráficos y análisis táctico",
      icon: FileText,
      color: "bg-red-600",
      format: "PDF",
      size: "2-5 MB"
    },
    {
      title: "Estadísticas por Acciones (CSV)",
      description: "Datos crudos de todas las acciones del partido en formato CSV para análisis en Excel",
      icon: FileSpreadsheet,
      color: "bg-green-600",
      format: "CSV",
      size: "50-200 KB"
    },
    {
      title: "Estadísticas por Jugadora (CSV)",
      description: "Estadísticas individuales de cada jugadora en formato CSV",
      icon: FileSpreadsheet,
      color: "bg-blue-600",
      format: "CSV",
      size: "30-100 KB"
    },
    {
      title: "Datos Completos (JSON)",
      description: "Exportación completa de todos los datos del partido en formato JSON",
      icon: Database,
      color: "bg-purple-600",
      format: "JSON",
      size: "100-500 KB"
    },
    {
      title: "Datos del Equipo (JSON)",
      description: "Información del equipo y jugadoras en formato JSON",
      icon: Database,
      color: "bg-yellow-600",
      format: "JSON",
      size: "20-50 KB"
    },
    {
      title: "Formato DataVolley (DVW)",
      description: "Exportación compatible con DataVolley para análisis avanzado",
      icon: FileText,
      color: "bg-indigo-600",
      format: "DVW",
      size: "100-300 KB"
    }
  ]

  const handleExport = (format: string) => {
    console.log(`Exportando en formato: ${format}`)
    // Aquí iría la lógica de exportación real
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exportaciones</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Exporta tus datos en diferentes formatos para análisis externos y compartir con tu equipo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exportOptions.map((option, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-12 h-12 ${option.color} rounded-lg flex items-center justify-center`}>
                  <option.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {option.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {option.format}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {option.size}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                {option.description}
              </p>
              
              <button
                onClick={() => handleExport(option.format)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          ))}
        </div>

        {/* Sección de exportación masiva */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Exportación Masiva
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Exporta todos tus datos de una vez en múltiples formatos
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
              <Download className="w-4 h-4" />
              <span>Exportar Todo (ZIP)</span>
            </button>
            
            <button className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
              <Download className="w-4 h-4" />
              <span>Temporada Completa</span>
            </button>
            
            <button className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium">
              <Download className="w-4 h-4" />
              <span>Resumen Ejecutivo</span>
            </button>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Consejos de Exportación
          </h3>
          <ul className="space-y-2 text-blue-800 dark:text-blue-200">
            <li>• Los archivos PDF incluyen gráficos y análisis visuales</li>
            <li>• Los formatos CSV son ideales para análisis en Excel o Google Sheets</li>
            <li>• JSON mantiene toda la estructura de datos para importación</li>
            <li>• DVW es compatible con software profesional de análisis</li>
            <li>• Los archivos se generan localmente para máxima privacidad</li>
          </ul>
        </div>
      </div>
    </div>
  )
}