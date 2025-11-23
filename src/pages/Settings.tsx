import { Settings as SettingsIcon, Globe, Download } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { useState } from 'react'

export function SettingsPage() {
  const { isDarkMode, toggleDarkMode } = useThemeStore()
  const [language, setLanguage] = useState('es')
  const [autoSave, setAutoSave] = useState(true)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <SettingsIcon className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
      </div>

      {/* Configuración general */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
          <Globe className="w-5 h-5" />
          <span>General</span>
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Idioma</h3>
              <p className="text-sm text-gray-600">Selecciona tu idioma preferido</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input w-32"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Modo Oscuro</h3>
              <p className="text-sm text-gray-600">Activa el modo oscuro para reducir la fatiga visual</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDarkMode ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Guardado Automático</h3>
              <p className="text-sm text-gray-600">Guarda automáticamente los cambios cada 30 segundos</p>
            </div>
            <button
              onClick={() => setAutoSave(!autoSave)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSave ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSave ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Datos y exportación */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Datos y Exportación</span>
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Exportar Datos</h3>
              <p className="text-sm text-gray-600">Descarga todos tus datos en formato JSON</p>
            </div>
            <button className="btn-outline">
              Exportar
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Importar Datos</h3>
              <p className="text-sm text-gray-600">Restaura tus datos desde un archivo JSON</p>
            </div>
            <button className="btn-outline">
              Importar
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <h3 className="font-medium text-red-900">Eliminar Todos los Datos</h3>
              <p className="text-sm text-red-700">Esta acción no se puede deshacer</p>
            </div>
            <button className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Información de la aplicación */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Información de la Aplicación</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Versión</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Última Actualización</span>
            <span className="font-medium">15 Enero 2024</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Desarrollado por</span>
            <span className="font-medium">Volleyball Stats Pro Team</span>
          </div>
        </div>
      </div>
    </div>
  )
}