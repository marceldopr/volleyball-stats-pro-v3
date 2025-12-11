import { Save, DoorOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ExitMatchModalProps {
    isOpen: boolean
    onClose: () => void
    onSaveAndExit: () => void
    onExitWithoutSaving: () => void
}

export function ExitMatchModal({
    isOpen,
    onClose,
    onSaveAndExit,
    onExitWithoutSaving
}: ExitMatchModalProps) {
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white mb-6 text-center">
                    ¿Salir del partido?
                </h2>

                <div className="space-y-3">
                    {/* Guardar y Salir */}
                    <Button
                        variant="primary"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white justify-center py-4"
                        icon={Save}
                        onClick={onSaveAndExit}
                    >
                        Guardar y Salir
                    </Button>

                    {/* Salir sin Guardar */}
                    <Button
                        variant="secondary"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white justify-center py-4"
                        icon={DoorOpen}
                        onClick={onExitWithoutSaving}
                    >
                        Salir sin Guardar
                    </Button>

                    {/* Cancelar */}
                    <Button
                        variant="ghost"
                        className="w-full justify-center py-4"
                        icon={X}
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                </div>
            </div>
        </div>
    )
}
