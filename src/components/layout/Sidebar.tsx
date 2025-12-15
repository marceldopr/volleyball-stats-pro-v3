import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  Trophy,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  UserCog,
  FileText,
  ChevronDown,
  ChevronRight,
  Calendar,
  Activity,
  Clock,
  MapPin,
  CalendarClock
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { useRoleScope } from '@/hooks/useRoleScope'
import { clubService } from '@/services/clubService'

// Navigation item types
interface NavItem {
  name: string
  href?: string
  icon: any
  children?: NavItem[]
}

interface NavSection {
  id: string
  title: string
  icon?: any
  collapsible: boolean
  items?: NavItem[]
  href?: string // For standalone links like CALENDARIO
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isClubMenuOpen, setIsClubMenuOpen] = useState(false)
  const [clubName, setClubName] = useState<string>('')
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const { isDT, role } = useRoleScope()

  // Collapsible sections state - default: all collapsed except standalones
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set())
  const [expandedSubmenus, setExpandedSubmenus] = useState<Set<string>>(() => new Set())

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

  // Navigation structure for DT
  const navigation: NavSection[] = useMemo(() => {
    if (!isDT) {
      // Coach navigation (simplified)
      return [
        {
          id: 'inicio',
          title: 'Inicio',
          icon: Home,
          collapsible: false,
          href: '/'
        },
        {
          id: 'calendario',
          title: 'Calendario',
          icon: Calendar,
          collapsible: false,
          href: '/calendario'
        },
        {
          id: 'mi-gestion',
          title: 'MI GESTIÓN',
          collapsible: true,
          items: [
            { name: 'Mis Equipos', href: '/teams', icon: Users },
            { name: 'Partidos', href: '/matches', icon: Trophy },
            { name: 'Informes', href: '/reports/players', icon: BarChart3 }
          ]
        }
      ]
    }

    // DT navigation (full)
    return [
      {
        id: 'inicio',
        title: 'Inicio',
        icon: Home,
        collapsible: false,
        href: '/'
      },
      {
        id: 'calendario',
        title: 'Calendario',
        icon: Calendar,
        collapsible: false,
        href: '/calendario'
      },
      {
        id: 'club',
        title: 'CLUB',
        collapsible: true,
        items: [
          { name: 'Equipos', href: '/teams', icon: Users },
          { name: 'Jugadores', href: '/players', icon: Users },
          { name: 'Entrenadores', href: '/coach-assignments', icon: UserCog },
          { name: 'Partidos', href: '/matches', icon: Trophy }
        ]
      },
      {
        id: 'estadisticas',
        title: 'ESTADÍSTICAS',
        collapsible: true,
        items: [
          { name: 'Equipos', href: '/stats', icon: BarChart3 },
          { name: 'Jugadores', href: '/reports/players', icon: Users }
        ]
      },
      {
        id: 'gestion',
        title: 'GESTIÓN',
        collapsible: true,
        items: [
          {
            name: 'Planificación',
            icon: FileText,
            children: [
              { name: 'Temporada activa', href: '/reports/team-plans', icon: FileText },
              { name: 'Próxima temporada', href: '/next-season', icon: CalendarClock }
            ]
          },
          { name: 'Salud y disponibilidad', href: '/salud-disponibilidad', icon: Activity },
          { name: 'Informes', href: '/club/dashboard', icon: BarChart3 }
        ]
      },
      {
        id: 'configuracion',
        title: 'CONFIGURACIÓN',
        collapsible: true,
        items: [
          { name: 'Ajustes del club', href: '/settings', icon: Settings },
          { name: 'Temporadas', href: '/settings?section=temporada', icon: Calendar },
          { name: 'Espacios', href: '/settings?section=espacios', icon: MapPin },
          { name: 'Horarios de entrenamiento', href: '/settings?section=horarios', icon: Clock }
        ]
      }
    ]
  }, [isDT])

  // Auto-expand section when navigating to a route inside it
  useEffect(() => {
    const path = location.pathname

    navigation.forEach(section => {
      if (section.collapsible && section.items) {
        const hasActiveItem = section.items.some(item => {
          if (item.href && path.startsWith(item.href.split('?')[0])) return true
          if (item.children) {
            return item.children.some(child => child.href && path.startsWith(child.href.split('?')[0]))
          }
          return false
        })

        if (hasActiveItem) {
          setExpandedSections(prev => new Set([...prev, section.id]))

          // Also expand submenu if needed
          section.items.forEach(item => {
            if (item.children) {
              const hasActiveChild = item.children.some(child =>
                child.href && path.startsWith(child.href.split('?')[0])
              )
              if (hasActiveChild) {
                setExpandedSubmenus(prev => new Set([...prev, item.name]))
              }
            }
          })
        }
      }
    })
  }, [location.pathname, navigation])

  const displayName = profile?.full_name || 'Usuario'

  let roleLabel = 'Usuario'
  const roleStr = role as string
  if (roleStr === 'dt' || roleStr === 'director_tecnic') roleLabel = 'Director Técnico'
  if (roleStr === 'coach' || roleStr === 'entrenador') roleLabel = 'Entrenador'
  if (roleStr === 'admin') roleLabel = 'Administrador'

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const toggleSubmenu = (itemName: string) => {
    setExpandedSubmenus(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemName)) {
        newSet.delete(itemName)
      } else {
        newSet.add(itemName)
      }
      return newSet
    })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const isItemActive = (href?: string) => {
    if (!href) return false
    const [path, query] = href.split('?')
    if (location.pathname !== path && !location.pathname.startsWith(path + '/')) return false
    if (query && !location.search.includes(query)) return false
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = isItemActive(item.href)
    const hasChildren = item.children && item.children.length > 0
    const isSubmenuExpanded = hasChildren && expandedSubmenus.has(item.name)

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={clsx(
              'flex items-center gap-3 w-full rounded-lg text-gray-300 hover:bg-gray-700/50 hover:text-white transition-all duration-200',
              depth === 0 ? 'py-2 px-3' : 'py-1.5 px-3 ml-4'
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span className="text-sm flex-1 text-left">{item.name}</span>
            <ChevronRight
              className={clsx(
                'w-4 h-4 transition-transform duration-200',
                isSubmenuExpanded && 'rotate-90'
              )}
            />
          </button>
          <div
            className={clsx(
              'overflow-hidden transition-all duration-200',
              isSubmenuExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="mt-1 space-y-0.5 ml-4 border-l border-gray-700 pl-2">
              {item.children!.map(child => renderNavItem(child, depth + 1))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        to={item.href!}
        onClick={() => setIsOpen(false)}
        className={clsx(
          'flex items-center gap-3 rounded-lg transition-all duration-200',
          depth === 0 ? 'py-2 px-3' : 'py-1.5 px-3',
          depth > 0 && 'ml-4',
          isActive
            ? 'bg-primary-600/20 text-primary-400 font-medium'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
        )}
      >
        <item.icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-primary-400' : 'text-gray-400')} />
        <span className="text-sm">{item.name}</span>
      </Link>
    )
  }

  const renderSection = (section: NavSection) => {
    const isExpanded = expandedSections.has(section.id)

    // Non-collapsible standalone link (INICIO, CALENDARIO)
    if (!section.collapsible && section.href) {
      const isActive = isItemActive(section.href)
      return (
        <Link
          key={section.id}
          to={section.href}
          onClick={() => setIsOpen(false)}
          className={clsx(
            'flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200',
            isActive
              ? 'bg-primary-600/20 text-primary-400 font-medium'
              : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
          )}
        >
          {section.icon && <section.icon className={clsx('w-5 h-5', isActive ? 'text-primary-400' : 'text-gray-400')} />}
          <span className="font-medium">{section.title}</span>
        </Link>
      )
    }

    // Collapsible section
    return (
      <div key={section.id}>
        <button
          onClick={() => toggleSection(section.id)}
          className="flex items-center justify-between w-full py-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors duration-200"
        >
          <span>{section.title}</span>
          <ChevronDown
            className={clsx(
              'w-4 h-4 transition-transform duration-200',
              !isExpanded && '-rotate-90'
            )}
          />
        </button>
        <div
          className={clsx(
            'overflow-hidden transition-all duration-200',
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <ul className="space-y-0.5 mt-1">
            {section.items?.map(item => (
              <li key={item.name}>{renderNavItem(item)}</li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
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
        <nav className="mt-4 px-3 flex-1 overflow-y-auto">
          <div className="space-y-2 pb-4">
            {navigation.map(section => renderSection(section))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
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
                    className={`w-4 h-4 transition-transform duration-200 ${isClubMenuOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>

              {isClubMenuOpen && (
                <div className="mt-2 space-y-1">
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