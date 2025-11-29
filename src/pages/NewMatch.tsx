import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Users, Calendar, MapPin, Trophy, Settings } from 'lucide-react'

export function NewMatch() {
  const [step, setStep] = useState(1)
  const [matchData, setMatchData] = useState({
    localTeam: '',
    visitorTeam: '',
    competition: '',
    round: '',
    location: '',
    date: ''
  })

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link to="/matches" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nuevo Partido</h1>
            <p className="text-gray-600 dark:text-gray-300">Crea un nuevo partido paso a paso</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= i ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {i}
              </div>
              {i < 3 && <div className={`w-24 h-1 mx-2 ${
                step > i ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'
              }`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="w-8 h-8 text-red-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paso 1: Equipos</h2>
                  <p className="text-gray-600 dark:text-gray-300">Selecciona los equipos que jugarán</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Equipo Local
                  </label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    value={matchData.localTeam}
                    onChange={(e) => setMatchData({...matchData, localTeam: e.target.value})}
                  >
                    <option value="">Selecciona equipo local</option>
                    <option value="cv-valencia">CV Valencia</option>
                    <option value="cv-barcelona">CV Barcelona</option>
                    <option value="cv-madrid">CV Madrid</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Equipo Visitante
                  </label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    value={matchData.visitorTeam}
                    onChange={(e) => setMatchData({...matchData, visitorTeam: e.target.value})}
                  >
                    <option value="">Selecciona equipo visitante</option>
                    <option value="cv-sevilla">CV Sevilla</option>
                    <option value="cv-malaga">CV Málaga</option>
                    <option value="cv-bilbao">CV Bilbao</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Trophy className="w-4 h-4 inline mr-1" />
                    Competición
                  </label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ej: Liga Nacional"
                    value={matchData.competition}
                    onChange={(e) => setMatchData({...matchData, competition: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jornada
                  </label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ej: Jornada 5"
                    value={matchData.round}
                    onChange={(e) => setMatchData({...matchData, round: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Lugar
                  </label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ej: Pabellón Municipal"
                    value={matchData.location}
                    onChange={(e) => setMatchData({...matchData, location: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha
                </label>
                <input 
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  value={matchData.date}
                  onChange={(e) => setMatchData({...matchData, date: e.target.value})}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <Settings className="w-8 h-8 text-red-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paso 2: Reglas del Partido</h2>
                  <p className="text-gray-600 dark:text-gray-300">Configura las reglas del encuentro</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sets</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Puntos por set (normal)
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="25">25 puntos</option>
                      <option value="21">21 puntos</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Puntos tie-break
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="15">15 puntos</option>
                      <option value="21">21 puntos</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Máximo de sets
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="5">5 sets (al mejor de 5)</option>
                      <option value="3">3 sets (al mejor de 3)</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reglas Especiales</h3>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Líberos permitidos</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Permite el uso de líberos</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-red-600">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Límites de tiempos muertos
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="2">2 por set</option>
                      <option value="1">1 por set</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Límites de cambios
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="6">6 por set</option>
                      <option value="12">12 por partido</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="btn-primary">
                  Guardar como reglas por defecto
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="w-8 h-8 text-red-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paso 3: Alineación Inicial</h2>
                  <p className="text-gray-600 dark:text-gray-300">Configura la alineación inicial de tu equipo</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cancha de Voleibol</h3>
                  <div className="bg-green-100 dark:bg-green-900 p-6 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Posición 4</div>
                        <select className="w-full text-sm">
                          <option value="">Jugadora</option>
                        </select>
                      </div>
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Posición 3</div>
                        <select className="w-full text-sm">
                          <option value="">Jugadora</option>
                        </select>
                      </div>
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Posición 2</div>
                        <select className="w-full text-sm">
                          <option value="">Jugadora</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Posición 5</div>
                        <select className="w-full text-sm">
                          <option value="">Jugadora</option>
                        </select>
                      </div>
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Posición 6</div>
                        <select className="w-full text-sm">
                          <option value="">Jugadora</option>
                        </select>
                      </div>
                      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Posición 1</div>
                        <select className="w-full text-sm">
                          <option value="">Jugadora</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Líbero</div>
                      <select className="w-full text-sm">
                        <option value="">Selecciona líbero</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jugadoras Disponibles</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((num) => (
                      <div key={num} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {num}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Jugadora {num}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Posición: Central</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">1.85m</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={handlePrevious}
              disabled={step === 1}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Siguiente
              </button>
            ) : (
              <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                Iniciar Partido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
