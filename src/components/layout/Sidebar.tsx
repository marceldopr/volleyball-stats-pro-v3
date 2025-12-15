import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  Trophy,
  BarChart3,
  Settings,
  Info,
  Menu,
  X,
  LogOut,
  UserCog,
  FileText,
  ChevronDown,
  ChevronRight,
  Calendar,
  Activity
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { useRoleScope } from '@/hooks/useRoleScope'
import { clubService } from '@/services/clubService'

// Navigation item types
interface NavItem {
  name: string
  href?: string
  icon: any
  placeholder?: boolean
  children?: NavItem[]
}

interface NavSection {
  title?: string
  items: NavItem[]
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isClubMenuOpen, setIsClubMenuOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Configuración']))
  const [clubName, setClubName] = useState<string>('')
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const { isDT, isCoach, role } = useRoleScope()

  // Fetch club name
  useEffect(() => {
    async function fetchClub() {
      if (profile?.club_id) {
        try {
          const club = await clubService.getClub(profile.club_id)
          if (club) {
            setClubName(club.name)
          }
        } catch (error) {
          console.error('Error fetching club:', error)
        }
      }
    }
    fetchClub()
  }, [profile?.club_id])

  // Navigation structure based on role
  const navigation: NavSection[] = []

  if (isDT) {
    navigation.push(
      {
        items: [
          { name: 'Inicio', href: '/', icon: Home }
        ]
      },
      {
        items: [
          { name: 'Calendario', href: '/calendario', icon: Calendar }
        ]
      },
      {
        title: 'CLUB',
        items: [
          { name: 'Equipos', href: '/teams', icon: Users },
          { name: 'Jugadores', href: '/players', icon: Users },
          { name: 'Entrenadores', href: '/coach-assignments', icon: UserCog },
          { name: 'Partidos', href: '/matches', icon: Trophy },
          { name: 'Estadísticas', href: '/stats', icon: BarChart3 }
        ]
      },
      {
        title: 'GESTIÓN',
        items: [
          { name: 'Dashboard Club', href: '/club/dashboard', icon: BarChart3 },
          { name: 'Salud & Disponibilidad', href: '/salud-disponibilidad', icon: Activity },
          { name: 'Próxima Temporada', href: '/next-season', icon: Calendar },
          { name: 'Planificación', href: '/reports/team-plans', icon: FileText },
          { name: 'Informes', href: '/reports/players', icon: BarChart3 }
        ]
      }
    )
  } else if (isCoach) {
    navigation.push(
      {
        items: [
          { name: 'Inicio', href: '/', icon: Home }
        ]
      },
      {
        title: 'MI GESTIÓN',
        items: [
          { name: 'Mis Equipos', href: '/teams', icon: Users },
          { name: 'Partidos', href: '/matches', icon: Trophy },
          { name: 'Informes', href: '/reports/players', icon: BarChart3 }
        ]
      },
      {
        items: [
          { name: 'Sobre la app', href: '/about', icon: Info }
        ]
      }
    )
  }

  const displayName = profile?.full_name || 'Usuario'

  let roleLabel = 'Usuario'
  const roleStr = role as string
  if (roleStr === 'dt' || roleStr === 'director_tecnic') roleLabel = 'Director Técnico'
  if (roleStr === 'coach' || roleStr === 'entrenador') roleLabel = 'Entrenador'
  if (roleStr === 'admin') roleLabel = 'Administrador'

  const navigationSections = navigation

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(title)) {
      newExpanded.delete(title)
    } else {
      newExpanded.add(title)
    }
    setExpandedSections(newExpanded)
  }

  const handleItemClick = (item: NavItem) => {
    if (item.placeholder) {
      // Show placeholder message
      return
    }
    setIsOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const renderNavItem = (item: NavItem, isChild = false) => {
    const isActive = item.href && location.pathname === item.href

    if (item.placeholder) {
      return (
        <div
          className={clsx(
            "flex items-center gap-3 rounded-lg text-gray-500 cursor-not-allowed opacity-60",
            isChild ? "py-2 pl-12 pr-4" : "py-2.5 px-4"
          )}
          title="Próximamente"
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{item.name}</span>
          <span className="ml-auto text-xs bg-gray-800 px-2 py-0.5 rounded">Pronto</span>
        </div>
      )
    }

    if (item.children) {
      const isExpanded = expandedSections.has(item.name)
      return (
        <div>
          <button
            onClick={() => toggleSection(item.name)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors w-full text-left"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{item.name}</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children.map((child) => (
                <div key={child.name}>{renderNavItem(child, true)}</div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        to={item.href!}
        className={clsx(
          'flex items-center gap-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors',
          isChild ? 'py-2 pl-12 pr-4' : 'py-2.5 px-4',
          isActive && 'bg-gray-700/50 font-semibold text-primary-400 border-l-4 border-primary-500'
        )}
        onClick={() => handleItemClick(item)}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">{item.name}</span>
      </Link>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-14 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 rounded-lg bg-gray-900 shadow-lg text-white hover:bg-gray-800 transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col h-screen',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex flex-col items-center justify-center h-20 px-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary-500" />
            <h1 className="text-white font-bold text-lg">Volleyball Stats</h1>
          </div>
          <p className="text-gray-400 text-xs mt-1">Pro Analytics</p>
        </div>



        {/* Navigation */}
        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          <div className="space-y-6 pb-6">
            {navigationSections.map((section, idx) => (
              <div key={idx}>
                {section.title && (
                  <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 mt-1">
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.name}>
                      {renderNavItem(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
          {/* Club Menu Dropdown */}
          {profile && (
            <div>
              <button
                type="button"
                onClick={() => setIsClubMenuOpen(open => !open)}
                className="w-full flex items-center justify-between gap-3 text-left hover:bg-gray-800/50 rounded-lg p-2 transition-colors"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-semibold text-white truncate" title={clubName}>
                    {clubName || 'Cargando...'}
                  </span>
                  <span className="text-xs text-white truncate" title={displayName}>
                    {displayName}
                  </span>
                  <span className="text-xs font-medium text-primary-500">
                    {roleLabel}
                  </span>
                </div>

                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-600 text-gray-200 flex-shrink-0">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isClubMenuOpen ? 'rotate-180' : ''
                      }`}
                  />
                </span>
              </button>

              {isClubMenuOpen && (
                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/settings')
                      setIsClubMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configuración</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}