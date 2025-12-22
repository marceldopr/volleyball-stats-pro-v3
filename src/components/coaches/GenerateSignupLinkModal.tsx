import { useState } from 'react'
import { X, Link as LinkIcon, Copy, Check, Clock, Users } from 'lucide-react'
import { coachSignupTokenService } from '@/services/coachSignupTokenService'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import type { GeneratedSignupLink, SignupTokenInfo } from '@/types/CoachSignupToken'

interface GenerateSignupLinkModalProps {
    onClose: () => void
}

export function GenerateSignupLinkModal({ onClose }: GenerateSignupLinkModalProps) {
    const [loading, setLoading] = useState(false)
    const [generatedLink, setGeneratedLink] = useState<GeneratedSignupLink | null>(null)
    const [copied, setCopied] = useState(false)
    const [expiresInDays, setExpiresInDays] = useState(7)
    const [maxUses, setMaxUses] = useState(1)
    const [activeTokens, setActiveTokens] = useState<SignupTokenInfo[]>([])

    const loadActiveTokens = async () => {
        try {
            const tokens = await coachSignupTokenService.getActiveTokensByClub()
            setActiveTokens(tokens)
        } catch (error) {
            console.error('Error loading tokens:', error)
        }
    }

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const link = await coachSignupTokenService.createSignupToken({
                expiresInDays,
                maxUses
            })
            setGeneratedLink(link)
            toast.success('Enlace generado correctamente')
            await loadActiveTokens()
        } catch (error: any) {
            console.error('Error generating link:', error)
            toast.error(error.message || 'Error al generar enlace')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async () => {
        if (!generatedLink) return
        try {
            await navigator.clipboard.writeText(generatedLink.signupUrl)
            setCopied(true)
            toast.success('Enlace copiado al portapapeles')
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            toast.error('Error al copiar')
        }
    }

    const handleRevoke = async (tokenId: string) => {
        try {
            await coachSignupTokenService.revokeToken(tokenId)
            toast.success('Enlace revocado')
            await loadActiveTokens()
        } catch (error) {
            toast.error('Error al revocar enlace')
        }
    }

    useState(() => {
        loadActiveTokens()
    })

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <LinkIcon className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Generar Enlace de Registro
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Configuration */}
                    {!generatedLink && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Expiración (días)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Usos máximos
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(Number(e.target.value))}
                                    className="input w-full"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Número de veces que se puede usar este enlace
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? 'Generando...' : 'Generar Enlace'}
                            </Button>
                        </div>
                    )}

                    {/* Generated Link Display */}
                    {generatedLink && (
                        <div className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                                    ✅ Enlace generado correctamente
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                                    ⚠️ Este enlace solo se muestra una vez. Cópialo ahora.
                                </p>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={generatedLink.signupUrl}
                                        className="input flex-1 font-mono text-sm"
                                    />
                                    <Button
                                        variant={copied ? 'primary' : 'secondary'}
                                        size="md"
                                        icon={copied ? Check : Copy}
                                        onClick={handleCopy}
                                    >
                                        {copied ? 'Copiado' : 'Copiar'}
                                    </Button>
                                </div>

                                <div className="mt-3 flex items-center gap-4 text-xs text-green-700 dark:text-green-300">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Expira en {expiresInDays} días</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        <span>{maxUses} {maxUses === 1 ? 'uso' : 'usos'}</span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="secondary"
                                size="md"
                                onClick={() => setGeneratedLink(null)}
                                className="w-full"
                            >
                                Generar Otro Enlace
                            </Button>
                        </div>
                    )}

                    {/* Active Tokens List */}
                    {activeTokens.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                Enlaces Activos
                            </h3>
                            <div className="space-y-2">
                                {activeTokens.map(token => (
                                    <div
                                        key={token.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {token.uses}/{token.maxUses} usos
                                                </span>
                                                {token.isExpired && (
                                                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                                                        Expirado
                                                    </span>
                                                )}
                                                {token.isRevoked && (
                                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded">
                                                        Revocado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Expira: {new Date(token.expiresAt).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                        {!token.isRevoked && !token.isExpired && (
                                            <button
                                                onClick={() => handleRevoke(token.id)}
                                                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 hover:underline"
                                            >
                                                Revocar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
