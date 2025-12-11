import { Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'

interface ReadOnlyBannerProps {
    onUndo: () => void
}

export function ReadOnlyBanner({ onUndo }: ReadOnlyBannerProps) {
    const navigate = useNavigate()

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                🏁 Partido Finalizado — Solo Lectura
            </span>
            <div className="flex gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onUndo}
                    className="h-6 text-[10px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-2"
                >
                    <Undo2 size={12} className="mr-1" />
                    Deshacer
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/matches')}
                    className="h-6 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 px-2"
                >
                    Salir
                </Button>
            </div>
        </div>
    )
}
