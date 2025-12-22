import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react'
import { coachSignupTokenService } from '@/services/coachSignupTokenService'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import type { TokenValidationResult } from '@/types/CoachSignupToken'

export function CoachSignupPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [validating, setValidating] = useState(true)
    const [tokenInfo, setTokenInfo] = useState<TokenValidationResult | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setValidating(false)
            return
        }

        validateToken()
    }, [token])

    const validateToken = async () => {
        if (!token) return

        setValidating(true)
        try {
            const result = await coachSignupTokenService.validateToken(token)
            setTokenInfo(result)
        } catch (error) {
            console.error('Error validating token:', error)
            setTokenInfo({ isValid: false, error: 'TOKEN_INVALID' })
        } finally {
            setValidating(false)
        }
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'El nombre es obligatorio'
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Los apellidos son obligatorios'
        }
        if (!formData.email.trim()) {
            newErrors.email = 'El email es obligatorio'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido'
        }
        if (!formData.password) {
            newErrors.password = 'La contraseña es obligatoria'
        } else if (formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm() || !token) return

        setSubmitting(true)
        try {
            // 1. Create User in Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.firstName.trim(),
                        last_name: formData.lastName.trim()
                    }
                }
            })

            if (authError) {
                if (authError.message.includes('already registered')) {
                    setErrors({ email: 'Este email ya está registrado' })
                    setSubmitting(false)
                    return
                }
                throw authError
            }

            if (!authData.user) {
                throw new Error('No se pudo crear el usuario')
            }

            // 2. Consume Token and Create Profile/Coach
            const result = await coachSignupTokenService.consumeToken(token, authData.user.id, {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim()
            })

            if (result.success) {
                setSuccess(true)
                setTimeout(() => {
                    navigate('/login', {
                        state: {
                            message: 'Registro completado. Tu cuenta está pendiente de aprobación por el DT.'
                        }
                    })
                }, 3000)
            } else {
                // Handle token errors - User is created but profile creation failed
                //Ideally we should delete the user here, but we can't from client.
                console.error('Token consumption failed:', result.error)

                if (result.error === 'TOKEN_EXPIRED') {
                    setTokenInfo({ isValid: false, error: 'TOKEN_EXPIRED' })
                } else if (result.error === 'TOKEN_MAX_USES') {
                    setTokenInfo({ isValid: false, error: 'TOKEN_MAX_USES' })
                } else if (result.error === 'PROFILE_EXISTS') {
                    // This implies auth.signUp succeeded but profile creation failed (duplicate ID?)
                    // Should be rare
                    setErrors({ submit: 'Error interno de perfil. Contacta con soporte.' })
                } else {
                    setErrors({ submit: 'Error al vincular tu cuenta con el club. Contacta con el DT.' })
                }
            }
        } catch (error) {
            console.error('Signup error:', error)
            setErrors({ submit: 'Error de conexión. Inténtalo de nuevo.' })
        } finally {
            setSubmitting(false)
        }
    }

    // Error messages
    const getErrorMessage = (error?: string) => {
        switch (error) {
            case 'TOKEN_INVALID':
                return 'El enlace de invitación no es válido'
            case 'TOKEN_EXPIRED':
                return 'El enlace de invitación ha expirado'
            case 'TOKEN_REVOKED':
                return 'El enlace de invitación ha sido revocado'
            case 'TOKEN_MAX_USES':
                return 'El enlace de invitación ya ha sido utilizado'
            default:
                return 'Enlace inválido'
        }
    }

    // Loading state
    if (validating) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Validando enlace...</p>
                </div>
            </div>
        )
    }

    // No token
    if (!token) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 max-w-md w-full text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Enlace no válido</h1>
                    <p className="text-gray-400 mb-6">
                        No se ha proporcionado un enlace de invitación válido.
                    </p>
                    <Button variant="primary" size="md" onClick={() => navigate('/login')}>
                        Ir al login
                    </Button>
                </div>
            </div>
        )
    }

    // Invalid token
    if (!tokenInfo?.isValid) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {getErrorMessage(tokenInfo?.error)}
                    </h1>
                    <p className="text-gray-400 mb-6">
                        Por favor, contacta con tu Director Técnico para obtener un nuevo enlace de invitación.
                    </p>
                    <Button variant="primary" size="md" onClick={() => navigate('/login')}>
                        Ir al login
                    </Button>
                </div>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 max-w-md w-full text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">¡Registro completado!</h1>
                    <p className="text-gray-400 mb-2">
                        Tu cuenta ha sido creada correctamente.
                    </p>
                    <p className="text-sm text-yellow-400 mb-6">
                        Está pendiente de aprobación por el Director Técnico. Recibirás acceso una vez aprobada.
                    </p>
                    <p className="text-sm text-gray-500">
                        Redirigiendo al login...
                    </p>
                </div>
            </div>
        )
    }

    // Registration form
    return (
        <div className="min-h-screen bg-gray-900 py-12 px-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">Registro de Entrenador</h1>
                    <p className="text-gray-400 text-sm">
                        Has sido invitado a unirte a <span className="font-semibold text-primary-400">{tokenInfo.clubName}</span>
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
                    {/* First Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="input w-full"
                            placeholder="Juan"
                        />
                        {errors.firstName && (
                            <p className="text-xs text-red-400 mt-1">{errors.firstName}</p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Apellidos *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="input w-full"
                            placeholder="García López"
                        />
                        {errors.lastName && (
                            <p className="text-xs text-red-400 mt-1">{errors.lastName}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input w-full"
                            placeholder="juan.garcia@email.com"
                        />
                        {errors.email && (
                            <p className="text-xs text-red-400 mt-1">{errors.email}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Este será tu usuario para iniciar sesión</p>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="input w-full"
                            placeholder="+34 600 123 456"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Contraseña *
                        </label>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="input w-full"
                            placeholder="Mínimo 6 caracteres"
                        />
                        {errors.password && (
                            <p className="text-xs text-red-400 mt-1">{errors.password}</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirmar Contraseña *
                        </label>
                        <input
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="input w-full"
                            placeholder="Repite la contraseña"
                        />
                        {errors.confirmPassword && (
                            <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>
                        )}
                    </div>

                    {/* Submit Error */}
                    {errors.submit && (
                        <div className="bg-red-900/20 border border-red-700 rounded p-3 text-sm text-red-400">
                            {errors.submit}
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={submitting}
                        className="w-full"
                    >
                        {submitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                        Al registrarte, tu cuenta quedará pendiente de aprobación por el Director Técnico
                    </p>
                </form>
            </div>
        </div>
    )
}
